import { retryEditorial } from '../scripts/lib/editorial-push-retry.mjs';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { GitHubSnapshotStore } from '../scripts/lib/editorial-github-store.mjs';
import { signSnapshot } from '../scripts/lib/editorial-push-snapshot.mjs';
import { LocalGitHubAPI } from './fixtures/editorial-github-api.mjs';
import { installationToken } from '../integrations/cloudflare/push-staging/github-app.mjs';
const key = 'offline-test-key-which-is-not-a-credential';
const exported = spawnSync(process.env.SALERO_TEST_PHP || 'php', ['-d','pcre.jit=0','tests/editorial-push-exporter-simulation.php','--emit-snapshot'], { encoding: 'utf8' });
assert.equal(exported.status, 0, exported.stderr);
const snapshot = JSON.parse(exported.stdout), packet = signSnapshot(snapshot, 1, 'batch-1', key);
let passed = 0;
async function test(label, fn) { await fn(); passed++; console.log('PASS ' + label); }
function fixture() {
  const api = new LocalGitHubAPI();
  const store = new GitHubSnapshotStore({ owner:'local-test',repository:'salero-editorial-snapshots-staging',token:async()=>api.token,key,fetchImpl:(...args)=>api.fetch(...args) });
  let journal = { snapshotId:packet.snapshotId,generation:1,batchId:'batch-1',createdAt:'2026-10-08T00:00:00.000Z' };
  return { api, store, put: () => store.put(packet, journal, async value => { journal = structuredClone(value); }, async()=>{}), journal:()=>journal };
}
await test('complete commit membership, manifest hash and snapshot authentication', async()=>{const f=fixture(), locator=await f.put();assert.deepEqual(await f.store.read(locator),packet);});
for (const point of ['/git/blobs','/git/trees','/git/commits','/git/refs/heads/snapshots']) {
 await test('lost confirmation recovered: '+point,async()=>{const f=fixture();f.api.fault={path:point,method:point.includes('/refs/')?'PATCH':'POST',lost:true};await assert.rejects(f.put(),/github_unavailable/);const locator=await f.put();assert.deepEqual(await f.store.read(locator),packet);assert.equal(f.api.commits.size,2);});
}
for(const status of [401,403,429,500,503]) await test('GitHub failure is closed '+status,async()=>{const f=fixture();f.api.fault={path:'/salero-editorial-snapshots-staging',status};await assert.rejects(f.put(),/github_(http|rate_limit|unavailable)/);assert.equal(f.api.commits.size,1);});
await test('public repository rejected',async()=>{const f=fixture();f.api.private=false;await assert.rejects(f.put(),/github_isolation/);});
await test('ref advanced by another writer rejected without force',async()=>{const f=fixture();await f.put();const locator=f.journal();f.api.head='f'.repeat(40);await assert.rejects(f.put(),/github_conflict/);assert.equal(f.api.head,'f'.repeat(40));assert.ok(locator.commit);});
await test('corrupt stored body rejected',async()=>{const f=fixture(),locator=await f.put();f.api.blobs.set(locator.blob,Buffer.from(packet.body.replace('Texto','Otro!')));await assert.rejects(f.store.read(locator),/snapshot_integrity/);});
await test('manifest corruption rejected',async()=>{const f=fixture(),locator=await f.put();f.api.blobs.set(locator.manifest,Buffer.from('{}'));await assert.rejects(f.store.read(locator),/github_manifest/);});
await test('missing tree membership rejected',async()=>{const f=fixture(),locator=await f.put();f.api.trees.set(locator.tree,[]);await assert.rejects(f.store.read(locator),/github_membership/);});
await test('truncated Git tree rejected',async()=>{const f=fixture(),locator=await f.put();const original=f.store.api.bind(f.store);f.store.api=async(...args)=>{const r=await original(...args);if(args[0].includes('/git/trees/'))r.truncated=true;return r;};await assert.rejects(f.store.read(locator),/github_tree/);});
await test('immutable commit identity required',async()=>{const f=fixture(),locator=await f.put();await assert.rejects(f.store.read({...locator,commit:'snapshots'}),/github_identity/);});
await test('new generation during upload prevents ref promotion',async()=>{const f=fixture();let n=0;await assert.rejects(f.store.put(packet,f.journal(),async()=>{},async()=>{if(++n===2)throw new Error('obsolete_snapshot');}),/obsolete_snapshot/);assert.equal(f.api.commits.size,2);assert.notEqual(f.api.head,[...f.api.commits.keys()].at(-1));});
await test('202 HTML is never a snapshot',async()=>{const f=fixture();f.store.fetchImpl=async()=>new Response('<html>challenge</html>',{status:202});await assert.rejects(f.put(),/github_http/);});
await test('GitHub App JWT and repository scoped token, cached until near expiry',async()=>{const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),api=new LocalGitHubAPI(rsa.publicKey);const token=installationToken({GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_REPOSITORY:'salero-editorial-snapshots-staging',GITHUB_APP_PRIVATE_KEY:rsa.privateKey.export({type:'pkcs8',format:'pem'})},(...args)=>api.fetch(...args));assert.equal(await token(),api.token);assert.equal(await token(),api.token);assert.equal(api.calls.length,1);});
await test('bounded retry with backoff keeps operation identity',async()=>{let calls=0;const delays=[];assert.equal(await retryEditorial(async()=>{if(++calls<3)throw Error('github_unavailable');return 'confirmed';},{wait:async ms=>delays.push(ms)}),'confirmed');assert.deepEqual(delays,[1000,2000]);});
await test('authentication and conflict are not retried',async()=>{for(const code of ['github_authentication','github_conflict','snapshot_hash','obsolete_build']){let calls=0;await assert.rejects(retryEditorial(async()=>{calls++;throw Error(code);}),new RegExp(code));assert.equal(calls,1);}});
console.log(`PASS GitHub store: ${passed} checks; no remote resources`);
