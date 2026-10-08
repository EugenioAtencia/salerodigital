// Staging adapter. No routes, hooks, cron, public bucket or production activation.
import { DurableObject } from 'cloudflare:workers';
import { EditorialPushCoordinator } from '../../../scripts/lib/editorial-push-coordinator.mjs';
import { AuthenticatedCoordinatorRPC } from '../../../scripts/lib/editorial-push-rpc.mjs';
import { sha256, fail, signSnapshot } from '../../../scripts/lib/editorial-push-snapshot.mjs';

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
  }
  transaction(operation) {
    return this.ctx.storage.transactionSync(() => {
      const rows = this.sql.exec('SELECT state FROM coordinator WHERE id = 1').toArray();
      const model = new EditorialPushCoordinator({ key: this.env.SNAPSHOT_KEY, codeSha: this.env.CODE_SHA,
        store: null, state: rows.length ? JSON.parse(rows[0].state) : null });
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
    if (command.operation === 'check') {
      try {
        const a = result.value;
        const object = await this.env.SNAPSHOTS.get(`snapshots/${a.sha256}.json`);
        if (!object || object.size > 1048576) fail('stored_integrity');
        const body = await object.text(); if (sha256(body) !== a.sha256) fail('stored_integrity');
        const packet = signSnapshot({ body, bytes: object.size, formatVersion: 1, revision: a.revision,
          counts: a.counts, sha256: a.sha256, snapshotId: a.snapshotId }, a.generation, a.batchId, this.env.SNAPSHOT_KEY);
        return this.transaction(model => ({ ...model.check(a.jobId), packet }));
      } catch { return { ok: false, error: 'snapshot_unavailable' }; }
    }
    if (command.operation !== 'offer') return result;
    const { identity, duplicate } = result.value;
    if (duplicate) return { ok: true, value: { accepted: true, duplicate: true } };
    const packet = command.args[0], objectKey = `snapshots/${packet.sha256}.json`;
    try {
      // Content-addressed writes are create-only; retries read the existing object.
      await this.env.SNAPSHOTS.put(objectKey, packet.body, { onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' } });
      const stored = await this.env.SNAPSHOTS.get(objectKey);
      if (!stored || stored.size !== packet.bytes || sha256(await stored.text()) !== packet.sha256) fail('stored_integrity');
      // Atomic manifest lives in SQLite. It becomes visible only after R2 verification.
      return this.transaction(model => model.commitOffer(identity));
    } catch { return { ok: false, error: 'storage_unconfirmed' }; }
  }
}
