import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { spawnSync } from 'node:child_process';
import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signCommand } from '../../../scripts/lib/editorial-push-rpc.mjs';
import { signSnapshot, verifySnapshot, sha256 } from '../../../scripts/lib/editorial-push-snapshot.mjs';
import { renderVerifiedSnapshot } from '../../../scripts/lib/editorial-snapshot-ssg.mjs';
import { stagingCommand } from '../../../scripts/lib/editorial-push-http.mjs';
import { LocalGitHubAPI } from '../../../tests/fixtures/editorial-github-api.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const php = process.env.SALERO_TEST_PHP || 'php';
const exported = spawnSync(php, ['-d', 'pcre.jit=0', 'tests/editorial-push-exporter-simulation.php', '--emit-snapshot'], { cwd: root, encoding: 'utf8' });
assert.equal(exported.status, 0, 'PHP fixture export');
const snapshot = JSON.parse(exported.stdout), codeSha = '8283cebe5db420ecb0e4671cc99b21badee2288b';
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const github = new LocalGitHubAPI(rsa.publicKey);
const bindings = { ENVIRONMENT: 'staging', CODE_SHA: codeSha, GITHUB_OWNER: 'local-test', GITHUB_REPOSITORY: 'salero-editorial-snapshots-staging',
  GITHUB_APP_ID: '1', GITHUB_INSTALLATION_ID: '2', GITHUB_APP_PRIVATE_KEY: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }), EDITOR_KEY: randomBytes(32).toString('hex'),
  PROMOTER_KEY: randomBytes(32).toString('hex'), BUILDER_KEY: randomBytes(32).toString('hex'), MONITOR_KEY: randomBytes(32).toString('hex'), SNAPSHOT_KEY: randomBytes(32).toString('hex') };
const directory = await mkdtemp(path.join(os.tmpdir(), 'salero-push-runtime-'));
const bundle = path.join(directory, 'bundle');
const compiled = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', bundle],
  { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
assert.equal(compiled.status, 0, compiled.stderr);
const options = convertV4MiniflareOptions({ name: 'salero-push-staging', modules: true, script: await readFile(path.join(bundle, 'worker.js'), 'utf8'), compatibilityDate: '2026-10-08',
  compatibilityFlags: ['nodejs_compat'], bindings, durableObjects: { COORDINATOR: { className: 'EditorialCoordinator', useSQLite: true } },
  outboundService: request => github.fetch(request), resourcePersistencePath: path.join(directory, 'storage') });
let mf, passed = 0;
async function test(label, operation) { await operation(); passed++; console.log(`PASS ${label}`); }
const command = (role, operation, args, extra = {}) => ({ ...signCommand(role, operation, args, bindings[`${role.toUpperCase()}_KEY`], Math.floor(Date.now() / 1000)), ...extra });
const rpc = async request => (await mf.dispatchFetch('http://localhost/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json();
const invoke = (role, operation, args) => rpc(command(role, operation, args));
const denied = (response, code) => { assert.equal(response.ok, false); assert.equal(response.error, code); };
let packet, lease, replay;
function phpMessage(mode) {
  const result = spawnSync(php, ['-d','pcre.jit=0','tests/editorial-push-staging-transport.php', mode],
    { cwd: root, input: JSON.stringify(snapshot), encoding: 'utf8', env: { ...process.env, SALERO_TEST_EDITOR_KEY: bindings.EDITOR_KEY, SALERO_TEST_SNAPSHOT_KEY: bindings.SNAPSHOT_KEY } });
  assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
}
try {
  mf = new Miniflare(options);
  await test('unknown state cannot build', async () => denied(await invoke('builder', 'claim', ['job-1', codeSha]), 'editorial_blocked'));
  await test('role and HMAC required', async () => denied(await rpc(command('editor', 'begin', ['batch-1'], { signature: '0'.repeat(64) })), 'rpc_authentication'));
  await test('builder cannot open editing', async () => denied(await invoke('builder', 'begin', ['batch-1']), 'rpc_permission'));
  await test('expired request rejected', async () => denied(await rpc(command('editor', 'begin', ['batch-1'], { at: 0 })), 'rpc_authentication'));
  await test('PHP command HMAC interoperates with real local Worker', async () => assert.equal((await rpc(phpMessage('--emit-command'))).value.generation, 1));
  await test('permit persists in SQLite', async () => { replay = command('editor', 'begin', ['batch-1']); const r = await rpc(replay); assert.equal(r.value.generation, 1); });
  await test('editing blocks builder', async () => denied(await invoke('builder', 'claim', ['job-1', codeSha]), 'editorial_blocked'));
  await test('nonce replay rejected', async () => denied(await rpc(replay), 'rpc_replay'));
  await test('workerd restart retains permit and nonce', async () => {
    await mf.dispose(); mf = new Miniflare(options);
    denied(await rpc(replay), 'rpc_replay'); assert.equal((await invoke('editor', 'begin', ['batch-1'])).value.generation, 1);
  });
  await test('corrupt snapshot cannot publish manifest', async () => {
    packet = phpMessage('--emit-packet');
    denied(await invoke('editor', 'offer', [{ ...packet, body: `${packet.body} ` }]), 'snapshot_size');
  });
  for (const [status, code] of [[401,'github_unauthorized'],[403,'github_forbidden'],[404,'github_not_found'],[422,'github_unprocessable'],[202,'github_http_error'],[302,'github_redirect']]) {
    await test(`installation token HTTP ${status} remains distinguishable in real workerd`, async () => {
      github.fault = {path:'/access_tokens', method:'POST', status};
      denied(await invoke('editor','offer',[packet]), code);
      denied(await invoke('builder','claim',['job-1',codeSha]), 'editorial_blocked');
      assert.equal(github.commits.size,1, 'no snapshot commit after authentication failure');
      assert.equal(github.dispatches.length,0, 'no Actions dispatch after authentication failure');
    });
  }
  await test('complete snapshot reaches isolated GitHub fixture and atomic SQLite head', async () => {
    const results = await Promise.all([invoke('editor', 'offer', [packet]), invoke('editor', 'offer', [packet])]);
    for (const offered of results) { assert.equal(offered.ok, true, offered.error); assert.equal(offered.value.accepted, true); }
    assert.equal(github.commits.size, 2, 'concurrent identical offers share one commit');
    assert.ok([...github.blobs.values()].some(blob => blob.toString('utf8') === packet.body));
  });
  await test('lost acceptance ACK can be retried idempotently', async () => assert.equal((await invoke('editor', 'offer', [packet])).value.duplicate, true));
  const notifiedJob='blog-'+sha256(packet.snapshotId+':'+packet.generation);
  await test('lost Actions notification ACK preserves durable identity', async () => {
    github.fault={path:'/dispatches',method:'POST',lost:true};
    denied(await invoke('editor','notify',[notifiedJob,packet.generation]),'github_unavailable');
    await mf.dispose();mf=new Miniflare(options);
    const r=await invoke('editor','notify',[notifiedJob,packet.generation]);assert.equal(r.value.dispatched,true);
    assert.equal(github.dispatches.length,2);assert.deepEqual(github.dispatches[0],github.dispatches[1]);
  });
  await test('confirmed Actions notification is not emitted twice',async()=>{await invoke('editor','notify',[notifiedJob,packet.generation]);assert.equal(github.dispatches.length,2);});
  await test('builder cannot trigger Actions or notify another generation',async()=>{denied(await invoke('builder','notify',[notifiedJob,packet.generation]),'rpc_permission');denied(await invoke('editor','notify',[notifiedJob,packet.generation+1]),'obsolete_job');});
  await test('builder claims current manifest', async () => { lease = (await invoke('builder', 'claim', ['job-1', codeSha])).value; assert.equal(lease.snapshotId, packet.snapshotId); });
  await test('verified snapshot retrieval without SiteGround', async () => {
    const r = await invoke('builder', 'check', ['job-1']); assert.equal(r.ok, true);
    assert.deepEqual(verifySnapshot(r.value.packet, bindings.SNAPSHOT_KEY).counts, snapshot.counts);
  });
  await test('SSG keeps H1 title canonical and current renderers', async () => {
    const check = async id => { const r = await invoke('builder', 'check', [id]); if (!r.ok) throw new Error(r.error); return r.value; };
    const result = await renderVerifiedSnapshot({ root, packet, key: bindings.SNAPSHOT_KEY, jobId: 'job-1', check });
    assert.equal(result.output.size, 5);
    for (const [file, html] of result.output) {
      const previous = await readFile(path.join(root, file), 'utf8');
      for (const pattern of [/<h1\b[^>]*>[\s\S]*?<\/h1>/i, /<title[^>]*>[\s\S]*?<\/title>/i, /<link[^>]*rel="canonical"[^>]*>/i]) assert.equal(html.match(pattern)?.[0], previous.match(pattern)?.[0]);
      assert.doesNotMatch(html, /Cargando servicios|Cargando sectores/);
    }
    assert.equal(result.output.has('nuestros-menus/index.html'), false);
  });
  await test('SSG rejects a corrupt packet before rendering', async () => {
    await assert.rejects(renderVerifiedSnapshot({ root, packet: { ...packet, body: `${packet.body} ` }, key: bindings.SNAPSHOT_KEY, jobId: 'job-1', check: async () => lease }), /snapshot_size/);
  });
  await test('SSG rejects a mismatched generation before rendering', async () => {
    await assert.rejects(renderVerifiedSnapshot({ root, packet, key: bindings.SNAPSHOT_KEY, jobId: 'job-1', check: async () => ({ ...lease, generation: 2 }) }), /build_snapshot_identity/);
  });
  await test('SSG rechecks revision after rendering without emitting artifacts', async () => {
    let calls = 0;
    await assert.rejects(renderVerifiedSnapshot({ root, packet, key: bindings.SNAPSHOT_KEY, jobId: 'job-1', check: async () => (++calls === 1 ? lease : { ...lease, revision: 'b'.repeat(64) }) }), /build_snapshot_identity/);
    assert.equal(calls, 2);
  });
  await test('new edit invalidates build', async () => { assert.equal((await invoke('editor', 'begin', ['batch-2'])).value.generation, 2); denied(await invoke('promoter', 'preparePromotion', ['job-1']), 'obsolete_build'); });
  await test('stale snapshot rejected', async () => denied(await invoke('editor', 'offer', [packet]), 'obsolete_snapshot'));
  await test('terminal failure permits recovery', async () => assert.equal((await invoke('monitor', 'settle', ['job-1', { jobId: 'job-1', codeSha, environment: 'production', id: 'local-failure', status: 'failure' }])).ok, true));
  await test('lost GitHub ref ACK leaves editing open and survives restart', async () => {
    const next = signSnapshot(snapshot, 2, 'batch-2', bindings.SNAPSHOT_KEY);
    github.fault = { path: '/git/refs/heads/snapshots', method: 'PATCH', lost: true };
    denied(await invoke('editor', 'offer', [next]), 'github_unavailable');
    denied(await invoke('builder', 'claim', ['job-2', codeSha]), 'editorial_blocked');
    const commits = github.commits.size;
    await mf.dispose(); mf = new Miniflare(options);
    assert.equal((await invoke('editor', 'offer', [next])).ok, true);
    assert.equal(github.commits.size, commits);
  });
  await test('promotion lock survives workerd restart', async () => {
    assert.equal((await invoke('builder', 'claim', ['job-2', codeSha])).ok, true);
    denied(await invoke('builder', 'preparePromotion', ['job-2']), 'rpc_permission');
    denied(await invoke('promoter', 'claim', ['job-2', codeSha]), 'rpc_permission');
    denied(await invoke('promoter', 'preparePromotion', ['job-2', 'c'.repeat(64)]), 'artifact_identity');
    assert.equal((await invoke('builder', 'sealArtifact', ['job-2', 'c'.repeat(64)])).ok, true);
    denied(await invoke('promoter', 'preparePromotion', ['job-2', 'd'.repeat(64)]), 'artifact_identity');
    assert.equal((await invoke('promoter', 'preparePromotion', ['job-2', 'c'.repeat(64)])).ok, true);
    await mf.dispose(); mf = new Miniflare(options);
    denied(await invoke('editor', 'begin', ['batch-3']), 'publication_locked');
  });
  await test('unknown deployment does not expire or unlock', async () => {
    assert.equal((await invoke('monitor', 'uncertain', ['job-2'])).ok, true);
    denied(await invoke('editor', 'begin', ['batch-3']), 'publication_locked');
  });
  await test('confirmed failure unlocks without publishing old generation', async () => {
    assert.equal((await invoke('monitor', 'settle', ['job-2', { jobId: 'job-2', codeSha, environment: 'production', id: 'local-failure-2', status: 'failure' }])).ok, true);
    assert.equal((await invoke('editor', 'begin', ['batch-3'])).value.generation, 3);
  });
  await test('strict HTTP route and JSON', async () => {
    assert.equal((await mf.dispatchFetch('http://localhost/rpc')).status, 404);
    assert.equal((await mf.dispatchFetch('http://localhost/rpc', { method: 'POST', body: '<html>challenge</html>' })).status, 415);
  });
  await test('HTTP client refuses 202 HTML challenges', async () => {
    await assert.rejects(stagingCommand({ url: 'http://localhost/rpc', role: 'editor', operation: 'begin', args: ['batch-4'], key: bindings.EDITOR_KEY,
      fetchImpl: async () => new Response('<html>challenge</html>', { status: 202, headers: { 'content-type': 'text/html' } }) }), /coordinator_unavailable/);
  });
  await test('actual local timeout aborts and lost ACK retry keeps generation', async () => {
    const proxy = createServer(async (req, res) => {
      let body = ''; for await (const chunk of req) body += chunk;
      const result = await rpc(JSON.parse(body));
      setTimeout(() => { if (!res.destroyed) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(result)); } }, 150);
    });
    await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
    try {
      const request = { url: `http://127.0.0.1:${proxy.address().port}/rpc`, role: 'editor', operation: 'begin', args: ['batch-3'], key: bindings.EDITOR_KEY };
      await assert.rejects(stagingCommand({ ...request, timeoutMs: 50 }), error => error.name === 'TimeoutError');
      assert.equal((await stagingCommand({ ...request, timeoutMs: 2000 })).generation, 3);
    } finally { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  });
  await test('actual connection refusal does not fabricate a permit', async () => {
    const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port; await new Promise(resolve => server.close(resolve));
    await assert.rejects(stagingCommand({ url: `http://127.0.0.1:${port}/rpc`, role: 'editor', operation: 'begin', args: ['batch-4'], key: bindings.EDITOR_KEY }), /fetch failed/);
  });
  console.log(JSON.stringify({ passed, runtime: 'local-workerd', cloudResources: 0, cpuCloudflare: 'not-measured', snapshotBytes: packet.bytes }));
} finally { await mf?.dispose(); await rm(directory, { recursive: true, force: true }); }
