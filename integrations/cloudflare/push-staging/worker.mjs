// Staging adapter. No routes, hooks, cron, public bucket or production activation.
import { DurableObject } from 'cloudflare:workers';
import { EditorialPushCoordinator } from '../../../scripts/lib/editorial-push-coordinator.mjs';
import { AuthenticatedCoordinatorRPC } from '../../../scripts/lib/editorial-push-rpc.mjs';
import { fail } from '../../../scripts/lib/editorial-push-snapshot.mjs';
import { GitHubSnapshotStore } from '../../../scripts/lib/editorial-github-store.mjs';
import { installationToken } from './github-app.mjs';

const MAX_REQUEST = 1200000;
const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const keys = env => ({ editor: env.EDITOR_KEY, builder: env.BUILDER_KEY, monitor: env.MONITOR_KEY });
export default {
  async fetch(request, env) {
    if (env.ENVIRONMENT !== 'staging') return reply({ error: 'staging_only' }, 503);
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/rpc') return reply({ error: 'route' }, 404);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply({ error: 'content_type' }, 415);
    // Read with an actual byte bound, including chunked requests without Content-Length.
    const reader = request.body?.getReader(); if (!reader) return reply({ error: 'body' }, 400);
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_REQUEST) { await reader.cancel(); return reply({ error: 'request_size' }, 413); }
        chunks.push(value);
      }
      const body = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
      const command = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
      return reply(await env.COORDINATOR.getByName('salero-staging-editorial').invoke(command));
    } catch {
      // Never echo exceptions, input bodies, endpoint URLs or credentials.
      return reply({ error: 'request_failed' }, 503);
    }
  }
};

export class EditorialCoordinator extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS coordinator (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL)');
    this.github = new GitHubSnapshotStore({ owner: env.GITHUB_OWNER, repository: env.GITHUB_REPOSITORY,
      key: env.SNAPSHOT_KEY, token: installationToken(env) });
    this.inflight = new Map(); // Optimization only; all recovery information is persisted in SQLite.
  }
  transaction(operation) {
    return this.ctx.storage.transactionSync(() => {
      const rows = this.sql.exec('SELECT state FROM coordinator WHERE id = 1').toArray();
      const model = new EditorialPushCoordinator({ key: this.env.SNAPSHOT_KEY, codeSha: this.env.CODE_SHA,
        publishEnvironment: this.env.PAGES_ENVIRONMENT || 'production', branch: this.env.CODE_BRANCH || 'main', store: null, state: rows.length ? JSON.parse(rows[0].state) : null });
      let result;
      try { result = { ok: true, value: operation(model) }; }
      catch (error) {
        const code = /^[a-z_]{1,60}$/.test(error.message || '') ? error.message : 'operation_failed';
        result = { ok: false, error: code };
      }
      // Authenticated nonces survive failed operations and restarts too.
      this.sql.exec('INSERT INTO coordinator (id,state) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state', JSON.stringify(model.checkpoint()));
      return result;
    });
  }
  async invoke(command) {
    const secrets = [...Object.values(keys(this.env)), this.env.SNAPSHOT_KEY];
    if (this.env.ENVIRONMENT !== 'staging' || secrets.some(key => typeof key !== 'string' || key.length < 32)
      || new Set(secrets).size !== 4 || !/^[a-f0-9]{40}$/.test(this.env.CODE_SHA || '')) return { ok: false, error: 'configuration' };
    const result = this.transaction(model => {
      // Authorize/consume nonce in SQLite before any asynchronous object operation.
      const facade = Object.create(model);
      facade.offer = packet => model.validateOffer(packet);
      return new AuthenticatedCoordinatorRPC(facade, keys(this.env), () => Math.floor(Date.now() / 1000)).invoke(command);
    });
    if (!result.ok) return result;
    if (command.operation === 'notify') {
      const notification = result.value;
      if (notification.dispatched) return result;
      try {
        await this.github.dispatch(notification);
        return this.transaction(model => { const current = model.notify(notification.jobId, notification.generation); current.dispatched = true; return current; });
      } catch { return { ok: false, error: 'github_unavailable' }; }
    }
    if (command.operation === 'check') {
      try {
        const a = result.value;
        const locator = this.transaction(model => model.state.githubObjects?.[a.generation]);
        if (!locator.ok || !locator.value) fail('snapshot_unavailable');
        const packet = await this.github.read(locator.value);
        if (packet.snapshotId !== a.snapshotId || packet.generation !== a.generation || packet.revision !== a.revision) fail('snapshot_unavailable');
        return this.transaction(model => ({ ...model.check(a.jobId), packet }));
      } catch { return { ok: false, error: 'snapshot_unavailable' }; }
    }
    if (command.operation !== 'offer') return result;
    const { identity, duplicate } = result.value;
    if (duplicate) return { ok: true, value: { accepted: true, duplicate: true } };
    const packet = command.args[0];
    if (this.inflight.has(packet.batchId)) {
      const pending = this.inflight.get(packet.batchId);
      if (pending.snapshotId !== packet.snapshotId) return { ok: false, error: 'github_intent_conflict' };
      return pending.promise;
    }
    const attempt = this.storeOffer(packet, identity);
    this.inflight.set(packet.batchId, { snapshotId: packet.snapshotId, promise: attempt });
    try { return await attempt; } finally { this.inflight.delete(packet.batchId); }
  }
  async storeOffer(packet, identity) {
    const initial = this.transaction(model => {
      model.checkOffer(identity);
      const intents = model.state.githubIntents ||= {};
      const prior = intents[packet.batchId];
      if (prior && prior.snapshotId !== packet.snapshotId) fail('github_intent_conflict');
      return intents[packet.batchId] ||= { snapshotId: packet.snapshotId, generation: packet.generation, batchId: packet.batchId, createdAt: new Date().toISOString() };
    });
    if (!initial.ok) return initial;
    const fence = async () => { const r = this.transaction(model => model.checkOffer(identity)); if (!r.ok) fail(r.error); };
    const checkpoint = async journal => {
      const r = this.transaction(model => { model.checkOffer(identity); model.state.githubIntents[packet.batchId] = journal; });
      if (!r.ok) fail(r.error);
    };
    try {
      const locator = await this.github.put(packet, initial.value, checkpoint, fence);
      // This is a separate SQLite transaction, NOT a distributed GitHub/DO transaction.
      return this.transaction(model => {
        model.checkOffer(identity);
        (model.state.githubObjects ||= {})[packet.generation] = locator;
        const accepted = model.commitOffer(identity); model.state.githubIntents[packet.batchId].confirmed = true; return accepted;
      });
    } catch (error) {
      const code = /^[a-z_]{1,60}$/.test(error.message || '') ? error.message : 'storage_unconfirmed';
      this.transaction(model => { const intent = model.state.githubIntents?.[packet.batchId]; if (intent) { intent.lastError = code; intent.attempts = (intent.attempts || 0) + 1; } });
      return { ok: false, error: code };
    }
  }
}
