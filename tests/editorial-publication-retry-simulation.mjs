import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {EditorialPushCoordinator} from '../scripts/lib/editorial-push-coordinator.mjs';
import {AuthenticatedCoordinatorRPC,signCommand} from '../scripts/lib/editorial-push-rpc.mjs';
import {sha256,signSnapshot} from '../scripts/lib/editorial-push-snapshot.mjs';
import {MemorySnapshotStore} from './fixtures/editorial-push-local.mjs';
import {PromoterEngine} from '../integrations/cloudflare/editorial-promoter/engine.mjs';
import {BRANCH} from '../integrations/cloudflare/editorial-promoter/policy.mjs';
const oldSha='a'.repeat(40),newSha='b'.repeat(40),key='local-fixture-only-snapshot-key';
const exported=spawnSync(process.env.SALERO_TEST_PHP||'php',['-d','pcre.jit=0','tests/editorial-push-exporter-simulation.php','--emit-snapshot'],{encoding:'utf8'});
assert.equal(exported.status,0);const packet=signSnapshot(JSON.parse(exported.stdout),1,'batch-original',key);
const original='blog-'+sha256(packet.snapshotId+':1'),retryId=original+'-r2',failedId='failed-deployment';
function fixture(){
 const store=new MemorySnapshotStore();const m=new EditorialPushCoordinator({store,key,codeSha:oldSha,publishEnvironment:'preview',branch:BRANCH});
 m.begin(packet.batchId);m.offer(packet);m.notify(original,1).dispatched=true;m.claim(original,oldSha,1);
 m.settle(original,{jobId:original,codeSha:oldSha,id:failedId,environment:'preview',status:'failure'});
 const model=new EditorialPushCoordinator({store,key,codeSha:newSha,state:m.checkpoint(),publishEnvironment:'preview',branch:BRANCH});
 // The original real journal predates outcomeDigest. Verify compatibility with that format too.
 delete model.state.jobs[original].outcomeDigest;
 return model;
}
const prepare=m=>m.prepareRetry(original,1,packet.snapshotId,failedId);
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('second attempt retains generation, snapshot and terminal history',()=>{const m=fixture(),before=m.checkpoint();const r=prepare(m);assert.equal(r.jobId,retryId);assert.equal(r.attempt,2);assert.equal(r.sha256,packet.sha256);assert.equal(r.batchId,packet.batchId);assert.deepEqual(m.state.jobs,before.jobs);assert.deepEqual(m.state.head,before.head);assert.deepEqual(m.state.permits,before.permits);assert.equal(m.state.generation,1);assert.equal(m.state.active,null);assert.deepEqual(m.state.notifications,before.notifications);});
await test('lost preparation ACK and restart return same attempt',()=>{const m=fixture(),r=prepare(m);const restored=new EditorialPushCoordinator({store:m.store,key,codeSha:newSha,state:m.checkpoint()});assert.deepEqual(prepare(restored),r);assert.equal(Object.keys(restored.state.retryAttempts).length,1);});
for(const [name,change,error] of [
 ['nonterminal predecessor',m=>delete m.state.jobs[original],'retry_not_terminal'],
 ['unknown predecessor',m=>m.state.jobs[original].status='unknown','retry_not_terminal'],
 ['successful predecessor',m=>m.state.jobs[original].status='success','retry_not_terminal'],
 ['unconfirmed dispatch',m=>m.state.notifications[original].dispatched=false,'retry_not_terminal'],
 ['active publication',m=>m.state.active={jobId:original,phase:'unknown'},'publication_locked'],
 ['already published, even another code release',m=>m.state.published={generation:1,codeSha:oldSha},'already_published'],
 ['editing window',m=>m.state.window={batchId:'new-edit'},'obsolete_job'],
 ['obsolete generation',m=>m.state.generation=2,'obsolete_job']
])await test('retry rejects '+name,()=>{const m=fixture();change(m);const before=m.checkpoint();assert.throws(()=>prepare(m),new RegExp(error));assert.deepEqual(m.checkpoint(),before);});
await test('wrong deployment, snapshot and predecessor rejected',()=>{const m=fixture();assert.throws(()=>m.prepareRetry(original,1,packet.snapshotId,'wrong-id'),/retry_not_terminal/);assert.throws(()=>m.prepareRetry(original,1,'sha256:'+ 'f'.repeat(64),failedId),/obsolete_job/);assert.throws(()=>m.prepareRetry(retryId,1,packet.snapshotId,failedId),/retry_identity/);});
await test('prepared release cannot be silently changed',()=>{const m=fixture();prepare(m);m.codeSha='c'.repeat(40);assert.throws(()=>prepare(m),/retry_conflict/);assert.throws(()=>m.claim(retryId,m.codeSha,1),/code_revision/);});
await test('forged retry IDs cannot notify or claim',()=>{const m=fixture();assert.throws(()=>m.notify(retryId,1),/retry_not_authorized/);assert.throws(()=>m.claim(retryId,newSha,1),/retry_not_authorized/);prepare(m);assert.throws(()=>m.notify(original+'-r3',1),/retry_not_authorized/);});
await test('terminal original cannot be notified again',()=>assert.throws(()=>fixture().notify(original,1),/job_completed/));
await test('authorized retry notify and claim stay idempotent',()=>{const m=fixture();prepare(m);const n=m.notify(retryId,1);n.dispatched=true;assert.deepEqual(m.notify(retryId,1),n);const lease=m.claim(retryId,newSha,1);assert.deepEqual(m.claim(retryId,newSha,1),lease);assert.equal(lease.snapshotId,packet.snapshotId);});
await test('head changing after preparation fences retry',()=>{const m=fixture();prepare(m);m.begin('new-edit');assert.throws(()=>m.notify(retryId,1),/obsolete_job/);assert.throws(()=>m.claim(retryId,newSha,1),/obsolete_job/);});
await test('only editor can authorize retry; nonce replay denied',()=>{const m=fixture(),keys={editor:'editor-fixture',builder:'builder-fixture',monitor:'monitor-fixture',promoter:'promoter-fixture'},rpc=new AuthenticatedCoordinatorRPC(m,keys,()=>1000),args=[original,1,packet.snapshotId,failedId];for(const role of ['builder','monitor','promoter'])assert.throws(()=>rpc.invoke(signCommand(role,'prepareRetry',args,keys[role],1000)),/rpc_permission/);const command=signCommand('editor','prepareRetry',args,keys.editor,1000);assert.equal(rpc.invoke(command).jobId,retryId);assert.throws(()=>rpc.invoke(command),/rpc_replay/);});
function promoterFixture(){
 const model=fixture();prepare(model);model.notify(retryId,1).dispatched=true;
 const records=new Map([[original,{jobId:original,phase:'failed',deploymentId:failedId}]]),chunks=new Map();
 const store={get:async id=>structuredClone(records.get(id)||null),put:async j=>records.set(j.jobId,structuredClone(j)),putChunk:async(j,p,i,b)=>chunks.set(`${j}:${p}:${i}`,Buffer.from(b)),assemble:async(j,p)=>chunks.get(`${j}:${p}:0`),clearChunks:async()=>{}};
 let creations=0,loseCreate=false,loseSettle=false;
 const receipt={jobId:retryId,generation:1,snapshotId:packet.snapshotId,sha256:packet.sha256,revision:packet.revision,counts:packet.counts,commit:newSha,branch:BRANCH,scope:'rebotica',mode:'snapshot-coordinated',tests:'passed',buildSuccess:true,snapshotConsistent:true};
 const contents={'la-rebotica/index.html':Buffer.from('local static HTML'),'_worker.js':Buffer.from('export default {};'),'salero-build.json':Buffer.from(JSON.stringify(receipt))};
 const files=Object.entries(contents).map(([path,b])=>({path,sha256:sha256(b),bytes:b.length,pagesHash:sha256(b).slice(0,32),contentType:'application/octet-stream'}));
 const deployment={id:'new-deployment',url:'https://abcd1234.salerodigital-staging.pages.dev',latest_stage:{status:'success'},receipt};
 const coordinator=async(role,op,args)=>{const r=model[op](...args);if(op==='settle'&&loseSettle){loseSettle=false;throw Error('settle_ack_lost');}return op==='check'?{...r,packet}:r;};
 const pages={upload:async()=>{},create:async()=>{creations++;if(loseCreate)throw Error('create_ack_lost');return deployment;},inspect:async()=>deployment};
 const config={CODE_SHA:newSha,SNAPSHOT_KEY:key},actor={role:'builder',run_id:'new-run',run_attempt:'1',sha:'d'.repeat(40)};
 const engine=()=>new PromoterEngine({store,coordinator,pages,config});
 const ready=async e=>{await e.execute('claim',{jobId:retryId,codeSha:newSha,generation:1},actor);await e.execute('attest',{jobId:retryId,files},actor);for(const [path,b]of Object.entries(contents))await e.execute('upload',{jobId:retryId,path,part:0,base64:b.toString('base64')},actor);};
 return {model,records,engine,actor,ready,get creations(){return creations;},set loseCreate(v){loseCreate=v;},set loseSettle(v){loseSettle=v;}};
}
await test('duplicate workflow run cannot own the retry artefact',async()=>{const f=promoterFixture(),e=f.engine();await f.ready(e);await assert.rejects(e.execute('claim',{jobId:retryId,codeSha:newSha,generation:1},{...f.actor,run_id:'another-run'}),/artifact_run/);});
await test('lost Pages ACK and promoter restart never create twice',async()=>{const f=promoterFixture(),e=f.engine();await f.ready(e);f.loseCreate=true;await assert.rejects(e.execute('promote',{jobId:retryId},f.actor),/deployment_outcome_unknown/);assert.equal(f.records.get(retryId).phase,'creation_started');await f.engine().execute('promote',{jobId:retryId},f.actor);assert.equal(f.creations,1);assert.throws(()=>prepare(f.model),/publication_locked/);assert.equal(f.records.get(original).phase,'failed');});
await test('lost settle ACK reconciles exact outcome without redeployment',async()=>{const f=promoterFixture(),e=f.engine();await f.ready(e);await e.execute('promote',{jobId:retryId},f.actor);f.loseSettle=true;const args={jobId:retryId,buildFailed:false},monitor={...f.actor,role:'monitor'};await assert.rejects(e.execute('status',args,monitor),/settle_ack_lost/);assert.equal(f.model.state.published.generation,1);assert.equal((await f.engine().execute('status',args,monitor)).phase,'published');assert.equal(f.creations,1);assert.equal(f.records.get(original).deploymentId,failedId);assert.throws(()=>prepare(f.model),/already_published/);assert.throws(()=>f.model.settle(retryId,{jobId:retryId,id:'different'}),/deployment_identity/);});
await test('obsolete retry artefact cannot promote',async()=>{const f=promoterFixture(),e=f.engine();await f.ready(e);f.model.begin('new-edit');await assert.rejects(e.execute('promote',{jobId:retryId},f.actor),/obsolete_build/);assert.equal(f.creations,0);});
console.log(JSON.stringify({passed,remoteOperations:0,remoteEditorialGenerations:0}));
