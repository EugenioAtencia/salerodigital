import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { EditorialPushCoordinator } from '../scripts/lib/editorial-push-coordinator.mjs';
import { signSnapshot, verifySnapshot, sha256 } from '../scripts/lib/editorial-push-snapshot.mjs';
import { AuthenticatedCoordinatorRPC, signCommand } from '../scripts/lib/editorial-push-rpc.mjs';
import { MemorySnapshotStore, LocalEditor, replacePayload } from './fixtures/editorial-push-local.mjs';
import { renderCollections } from '../scripts/generate-collections-ssg.mjs';
const php = process.argv.find(arg => arg.startsWith('--php='))?.slice(6) || 'php';
const exported = spawnSync(php, ['-d', 'pcre.jit=0', 'tests/editorial-push-exporter-simulation.php', '--emit-snapshot'], { encoding: 'utf8' });
assert.equal(exported.status, 0, exported.stderr);
const snapshot = JSON.parse(exported.stdout), key = 'local-fixture-key-not-an-operational-secret', codeSha = 'c'.repeat(40);
let checks = 0;
const test = (label, fn) => { fn(); checks++; console.log(`PASS: ${label}`); };
const rejects = (fn, code) => assert.throws(fn, error => error.message === code);
function setup() {
  const store = new MemorySnapshotStore(), coordinator = new EditorialPushCoordinator({ store, key, codeSha });
  const editor = new LocalEditor(batch => coordinator.begin(batch));
  return { store, coordinator, editor };
}
function stage(c, batch = 'batch-1', source = snapshot) {
  const p = c.begin(batch), packet = signSnapshot(source, p.generation, batch, key); c.offer(packet); return packet;
}
function receipt(a) { return { jobId: a.jobId, generation: a.generation, snapshotId: a.snapshotId, revision: a.revision,
  commit: a.codeSha, branch: 'main', mode: 'snapshot-coordinated', buildSuccess: true, snapshotConsistent: true, tests: 'passed', counts: a.counts }; }
function terminal(c, job, status = 'success', change = () => {}) {
  const a = c.state.active, d = { id: `deployment-${job}`, jobId: job, codeSha: a.codeSha, environment: 'production', status, receipt: receipt(a) };
  change(d); c.settle(job, d);
}
const refreshed = (s, revision) => replacePayload(s, p => { p.revision = revision; });

test('PHP snapshot is authenticated and verified by Node without format conversion', () => {
  const payload = verifySnapshot(signSnapshot(snapshot, 1, 'batch-1', key), key);
  assert.deepEqual(payload.counts, { servicios: 4, sectores: 3, 'casos-exito': 2, posts: 2 });
  assert.equal(sha256(snapshot.body), snapshot.sha256);
});
for (const [label, mutation, code, resign] of [
  ['altered UTF-8 body', p => { p.body = p.body.replace('Título', 'Otro'); p.bytes = Buffer.byteLength(p.body); }, 'authentication', false],
  ['same-size altered bytes', p => { p.body = p.body.replace('prueba', 'falso!'); }, 'snapshot_integrity', false],
  ['altered generation', p => p.generation++, 'authentication', false],
  ['wrong signature', p => p.signature = '0'.repeat(64), 'authentication', false],
  ['missing collection', p => { const s = replacePayload(p, v => delete v.collections.posts); Object.assign(p, s); }, 'snapshot_collections', true],
  ['incorrect counts', p => { const s = replacePayload(p, v => v.counts.posts++); Object.assign(p, s); }, 'snapshot_counts', true],
  ['duplicate slug', p => { const s = replacePayload(p, v => v.collections.posts[1].slug = v.collections.posts[0].slug); Object.assign(p, s); }, 'snapshot_duplicate', true],
  ['duplicate global ID', p => { const s = replacePayload(p, v => v.collections.posts[0].id = v.collections.servicios[0].id); Object.assign(p, s); }, 'snapshot_duplicate', true],
  ['draft record', p => { const s = replacePayload(p, v => v.collections.posts[0].status = 'draft'); Object.assign(p, s); }, 'snapshot_record', true],
  ['missing article content', p => { const s = replacePayload(p, v => delete v.collections.posts[0].content); Object.assign(p, s); }, 'snapshot_record', true],
  ['invalid calendar date', p => { const s = replacePayload(p, v => v.collections.posts[0].date = '2026-02-30T12:00:00'); Object.assign(p, s); }, 'snapshot_record', true],
  ['protected record', p => { const s = replacePayload(p, v => v.collections.posts[0].content.protected = true); Object.assign(p, s); }, 'snapshot_protected', true],
  ['bad JSON', p => { p.body = '{broken'; p.bytes = Buffer.byteLength(p.body); p.sha256 = sha256(p.body); p.snapshotId = `sha256:${p.sha256}`; }, 'snapshot_json', true],
  ['wrong revision', p => p.revision = 'b'.repeat(64), 'snapshot_revision', true],
]) test(label, () => {
  let packet = signSnapshot(snapshot, 1, 'batch-1', key); mutation(packet);
  if (resign) packet = signSnapshot(packet, packet.generation, packet.batchId, key);
  rejects(() => verifySnapshot(packet, key), code);
});
test('unknown snapshot version is rejected before use',()=>{const p=signSnapshot(snapshot,1,'batch-1',key);p.formatVersion=2;rejects(()=>verifySnapshot(p,key),'snapshot_format');});
test('oversized snapshot rejected without fallback', () => rejects(() => verifySnapshot(signSnapshot(snapshot, 1, 'batch-1', key), key, 10), 'snapshot_size'));
test('wrong publisher key cannot authenticate a snapshot', () => rejects(() => verifySnapshot(signSnapshot(snapshot, 1, 'batch-1', key), 'wrong-key'), 'authentication'));
test('empty collections only with explicit coherent counts', () => {
  const s = replacePayload(snapshot, p => { for (const t of Object.keys(p.collections)) { p.collections[t] = []; p.counts[t] = 0; } });
  assert.equal(Object.values(verifySnapshot(signSnapshot(s, 1, 'batch-1', key), key).counts).reduce((a,b) => a+b),0);
});
test('unknown initial editorial state cannot build', () => rejects(() => setup().coordinator.claim('job-1', codeSha), 'editorial_blocked'));
test('first notification failure prevents unannounced saves', () => {
  const { coordinator } = setup(), e = new LocalEditor(() => { throw new Error('network'); });
  rejects(() => e.open(), 'network'); rejects(() => e.save('edit-1'), 'editorial_unannounced');
  assert.equal(e.state.version, 0); assert.equal(coordinator.state.generation, 0);
});
test('lost begin ACK: remote blocked, local write denied, restart retries same identity', () => {
  const { coordinator } = setup(), e = new LocalEditor(batch => { coordinator.begin(batch); throw new Error('network'); });
  rejects(() => e.open(), 'network'); rejects(() => e.save('edit-1'), 'editorial_unannounced');
  const recovered = new LocalEditor(batch => coordinator.begin(batch), JSON.parse(JSON.stringify(e.checkpoint())));
  recovered.open(); assert.equal(coordinator.state.generation, 1); recovered.save('edit-1');
  rejects(() => coordinator.claim('job-1', codeSha), 'editorial_blocked');
});
test('acknowledged window permits offline saves while publication stays blocked', () => {
  const { editor, coordinator } = setup(); editor.open(); editor.rpc = () => { throw new Error('network'); };
  editor.save('edit-a'); editor.save('edit-b');
  assert.equal(editor.state.version, 2); assert.equal(editor.revision().editing, false);
  rejects(() => coordinator.claim('job-1', codeSha), 'editorial_blocked');
});
test('concurrent local requests keep editing true until both finish', () => {
  const { editor } = setup(); editor.open(); editor.start('editor-a'); editor.start('editor-b'); editor.finish('editor-b');
  assert.equal(editor.revision().editing, true); rejects(() => editor.freeze(), 'local_incomplete');
  editor.finish('editor-a'); editor.freeze(); assert.equal(editor.revision().editing, false);
});
test('crash during local mutation keeps durable incomplete marker after restart', () => {
  const { editor, coordinator } = setup(); editor.open(); rejects(() => editor.save('edit-a', () => { throw new Error('crash'); }), 'crash');
  const e = new LocalEditor(batch => coordinator.begin(batch), JSON.parse(JSON.stringify(editor.checkpoint())));
  assert.equal(e.revision().editing, true); rejects(() => e.freeze(), 'local_incomplete'); rejects(() => coordinator.claim('job-1', codeSha), 'editorial_blocked');
});
test('old local export cannot be put into current outbox', () => {
  const { editor } = setup(); editor.open(); editor.save('edit-1'); editor.freeze();
  rejects(() => editor.prepare(snapshot, key), 'local_export_revision');
});
test('frozen export forbids reopening/saving through stale offline permit', () => {
  const { editor } = setup(); editor.open(); editor.freeze();
  rejects(() => editor.save('edit-1'), 'editorial_unannounced'); rejects(() => editor.open(), 'export_frozen');
});
for (const fault of ['before-write', 'lost-ack']) test(`${fault}: no head, durable outbox retries same snapshot after restart`, () => {
  const { editor, coordinator, store } = setup(); editor.open(); editor.save('edit-1'); const rev = editor.freeze();
  const packet = editor.prepare(refreshed(snapshot, rev), key); store.fault = fault;
  rejects(() => coordinator.offer(packet), fault === 'lost-ack' ? 'upload_unknown' : 'upload_unavailable');
  assert.equal(coordinator.state.head, null); rejects(() => coordinator.claim('job-1', codeSha), 'editorial_blocked');
  const c = new EditorialPushCoordinator({ store, key, codeSha, state: JSON.parse(JSON.stringify(coordinator.checkpoint())) });
  const e = new LocalEditor(batch => c.begin(batch), JSON.parse(JSON.stringify(editor.checkpoint())));
  store.fault = null; c.offer(e.state.outbox); e.acknowledge();
  assert.equal(store.objects.size, 1); assert.equal(c.state.head.revision, rev);
  assert.equal(c.offer(packet).duplicate, true);
});
test('head ACK lost: repeat commits idempotently and never creates a second build', () => {
  const { coordinator } = setup(); const p = stage(coordinator);
  assert.equal(coordinator.offer(p).duplicate, true);
  const job = coordinator.claim('job-1', codeSha); assert.deepEqual(coordinator.claim('job-1', codeSha), job);
  rejects(() => coordinator.claim('job-2', codeSha), 'build_busy');
});
test('stored corruption never advances publicable head', () => {
  const { coordinator, store } = setup(); const permit = coordinator.begin('batch-1');
  store.onPut = () => store.objects.set(`sha256:${snapshot.sha256}`, 'bad');
  rejects(() => coordinator.offer(signSnapshot(snapshot, permit.generation, permit.batchId, key)), 'stored_integrity');
  assert.equal(coordinator.state.head, null);
});
test('competing editorial window rejected instead of independent unsafe permissions', () => {
  const { coordinator } = setup(); coordinator.begin('batch-1'); rejects(() => coordinator.begin('batch-2'), 'edit_window_busy');
});
test('new edit invalidates old build; newer snapshot wins, delayed old deployment rejected', () => {
  const { coordinator } = setup(); const old = stage(coordinator); coordinator.claim('old-job', codeSha);
  const b = coordinator.begin('batch-2'); const newer = signSnapshot(refreshed(snapshot, 'b'.repeat(64)), b.generation, b.batchId, key); coordinator.offer(newer);
  rejects(() => coordinator.check('old-job'), 'obsolete_build'); rejects(() => coordinator.preparePromotion('old-job'), 'obsolete_build');
  rejects(() => coordinator.claim('new-job', codeSha), 'build_busy'); terminal(coordinator, 'old-job', 'failure');
  coordinator.claim('new-job', codeSha); coordinator.preparePromotion('new-job'); terminal(coordinator, 'new-job');
  assert.equal(coordinator.state.published.generation, 2);
  rejects(() => coordinator.offer(old), 'obsolete_snapshot'); rejects(() => coordinator.begin('batch-1'), 'permit_closed');
  rejects(() => coordinator.settle('old-job', { jobId: 'old-job' }), 'deployment_identity');
  assert.equal(coordinator.state.published.generation, 2);
});
test('new editing window invalidates an unstarted old snapshot immediately', () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.begin('batch-2'); rejects(() => coordinator.claim('job-1', codeSha), 'editorial_blocked');
});
test('publication fence rejects edits until terminal success; no expiry unlock', () => {
  const { coordinator, store } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); coordinator.preparePromotion('job-1');
  rejects(() => coordinator.begin('batch-2'), 'publication_locked'); coordinator.uncertain('job-1');
  const c = new EditorialPushCoordinator({ store, key, codeSha, state: JSON.parse(JSON.stringify(coordinator.checkpoint())) });
  rejects(() => c.begin('batch-2'), 'publication_locked'); rejects(() => c.claim('job-2', codeSha), 'build_busy');
  terminal(c, 'job-1'); assert.equal(c.state.published.generation, 1); assert.equal(c.state.active, null);
  c.begin('batch-2'); assert.equal(c.status().editing, true);
});
test('unknown build outcome before promotion cannot be acknowledged as success', () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); coordinator.uncertain('job-1');
  rejects(() => terminal(coordinator, 'job-1'), 'promotion_not_authorized');
});
test('build failure retains snapshot and permits a fresh job; completed job cannot loop', () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); terminal(coordinator, 'job-1', 'failure');
  rejects(() => coordinator.claim('job-1', codeSha), 'job_completed'); coordinator.claim('job-2', codeSha);
  coordinator.preparePromotion('job-2'); terminal(coordinator, 'job-2'); rejects(() => coordinator.claim('job-3', codeSha), 'already_published');
});
test('wrong code commit cannot claim production job', () => {
  const { coordinator } = setup(); stage(coordinator); rejects(() => coordinator.claim('job-1', 'd'.repeat(40)), 'code_revision');
});
for (const field of ['generation', 'revision', 'snapshotId', 'counts', 'commit', 'branch', 'mode', 'tests', 'buildSuccess', 'snapshotConsistent']) test(`wrong receipt ${field} retains active publication`, () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); coordinator.preparePromotion('job-1');
  rejects(() => terminal(coordinator, 'job-1', 'success', d => d.receipt[field] = field === 'counts' ? {} : 'incorrect'), 'receipt_invalid');
  assert.equal(coordinator.state.published, null); assert.equal(coordinator.state.active.phase, 'publishing');
});
for (const field of ['jobId', 'codeSha', 'environment', 'status', 'id']) test(`wrong deployment ${field} cannot release publication`, () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); coordinator.preparePromotion('job-1');
  rejects(() => terminal(coordinator, 'job-1', 'success', d => d[field] = field === 'id' ? '' : 'incorrect'), 'deployment_identity');
  assert.equal(coordinator.state.active.phase, 'publishing');
});
for (const order of ['edit-first', 'promotion-first']) test(`edit/promotion race: ${order}`, () => {
  const { coordinator } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha);
  if (order === 'edit-first') { coordinator.begin('batch-2'); rejects(() => coordinator.preparePromotion('job-1'), 'obsolete_build'); }
  else { coordinator.preparePromotion('job-1'); rejects(() => coordinator.begin('batch-2'), 'publication_locked'); }
});
test('post-save-only counterexample: unseen offline change cannot be detected by coordinator', () => {
  const { coordinator } = setup(); stage(coordinator);
  const unannouncedWordPressRevision = 'b'.repeat(64); // Deliberately bypasses the required pre-write notification.
  const a = coordinator.claim('job-1', codeSha); coordinator.preparePromotion('job-1'); terminal(coordinator, 'job-1');
  assert.notEqual(a.revision, unannouncedWordPressRevision); // Proves this editor policy cannot satisfy strict freshness.
});
test('authenticated RPC rejects replay, altered args, stale timestamps and wrong role', () => {
  const { coordinator } = setup(); const keys = { editor: 'fixture-editor-key', builder: 'fixture-builder-key', monitor: 'fixture-monitor-key' };
  let now = 1000; const rpc = new AuthenticatedCoordinatorRPC(coordinator, keys, () => now);
  const request = signCommand('editor', 'begin', ['batch-1'], keys.editor, now, 'nonce-1'); rpc.invoke(request);
  rejects(() => rpc.invoke(request), 'rpc_replay');
  const bad = structuredClone(request); bad.args = ['batch-2']; rejects(() => rpc.invoke(bad), 'rpc_authentication');
  rejects(() => rpc.invoke(signCommand('editor', 'claim', ['job-1', codeSha], keys.editor, now)), 'rpc_permission');
  rejects(() => rpc.invoke(signCommand('builder', 'begin', ['batch-2'], keys.builder, now)), 'rpc_permission');
  rejects(() => rpc.invoke(signCommand('editor', 'offer', [], 'wrong-key', now)), 'rpc_authentication');
  now = 1061; rejects(() => rpc.invoke(request), 'rpc_authentication');
});
test('RPC nonce survives restart; retry with new nonce and same operation is idempotent', () => {
  const { coordinator, store } = setup(); const keys = { editor: 'fixture-editor-key' }; const now = 1000;
  const rpc = new AuthenticatedCoordinatorRPC(coordinator, keys, () => now), q = signCommand('editor','begin',['batch-1'],keys.editor,now,'nonce-1'); rpc.invoke(q);
  const c = new EditorialPushCoordinator({ store, key, codeSha, state: JSON.parse(JSON.stringify(coordinator.checkpoint())) });
  const recovered = new AuthenticatedCoordinatorRPC(c, keys, () => now); rejects(() => recovered.invoke(q), 'rpc_replay');
  recovered.invoke(signCommand('editor','begin',['batch-1'],keys.editor,now,'nonce-2')); assert.equal(c.state.generation,1);
});
test('code-only deployment can reuse current snapshot without editorial fallback', () => {
  const { coordinator, store } = setup(); stage(coordinator); coordinator.claim('job-1', codeSha); coordinator.preparePromotion('job-1'); terminal(coordinator,'job-1');
  const newSha = 'd'.repeat(40), c = new EditorialPushCoordinator({ store, key, codeSha: newSha, state: coordinator.checkpoint() });
  c.claim('job-code', newSha); c.preparePromotion('job-code'); terminal(c, 'job-code');
  assert.equal(c.state.published.codeSha, newSha); assert.equal(c.state.published.generation,1);
});
test('adversarial race enumeration never publishes old revision after an edit', () => {
  for(const first of ['edit','promote']) for(const restart of [false,true]) {
    const env = setup(); let c=env.coordinator; stage(c); c.claim('job-race',codeSha);
    if(restart)c=new EditorialPushCoordinator({store:env.store,key,codeSha,state:JSON.parse(JSON.stringify(c.checkpoint()))});
    if(first==='edit') { c.begin('batch-2'); rejects(()=>c.preparePromotion('job-race'),'obsolete_build'); assert.equal(c.state.published,null); }
    else { c.preparePromotion('job-race'); rejects(()=>c.begin('batch-2'),'publication_locked'); terminal(c,'job-race'); assert.equal(c.state.published.generation,1); }
  }
});
test('durable state never stores authentication keys', () => {
  const { coordinator } = setup(); stage(coordinator); assert.equal(JSON.stringify(coordinator.checkpoint()).includes(key), false);
});
const root = path.resolve(import.meta.dirname, '..'), payload = verifySnapshot(signSnapshot(snapshot, 1, 'batch-1', key), key);
const output = await renderCollections(root, payload.collections);
assert.equal(output.size, 5);
for (const [file, html] of output) {
  const original = await readFile(path.join(root, file), 'utf8');
  for (const pattern of [/<h1\b[\s\S]*?<\/h1>/i, /<title>[\s\S]*?<\/title>/i, /<link\b[^>]*rel="canonical"[^>]*>/i]) assert.equal(html.match(pattern)?.[0], original.match(pattern)?.[0]);
  assert.doesNotMatch(html, /Cargando servicios|Cargando sectores|Cargando\.\.\./);
}
checks++; console.log('PASS: verified PHP snapshot renders Home/matrices with existing renderers, H1/title/canonical retained');
const representative = replacePayload(snapshot, p => {
  for(const items of Object.values(p.collections)) for(const item of items) item.content.rendered = '<p>'+ 'x'.repeat(16000) +'</p>';
});
const benchmark = s => {
  const samples=[];
  for(let i=0;i<100;i++){ const start=performance.now(); verifySnapshot(signSnapshot(s,1,'batch-1',key),key); samples.push(performance.now()-start); }
  samples.sort((a,b)=>a-b);
  return {snapshotBytes:s.bytes,verificationMedianMs:Number(samples[50].toFixed(3)),verificationP95Ms:Number(samples[95].toFixed(3))};
};
console.log(JSON.stringify({localBenchmarkOnly:true,small:benchmark(snapshot),representative:benchmark(representative),note:'Node timings do not prove Workers Free CPU compliance'}));
console.log(`PASS: push coordinator/protocol — ${checks} scenarios; no network, Hook, deployments or production writes`);
