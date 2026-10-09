import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync,createSign,randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {EditorialPushCoordinator} from '../../../scripts/lib/editorial-push-coordinator.mjs';
import {AuthenticatedCoordinatorRPC} from '../../../scripts/lib/editorial-push-rpc.mjs';
import {MemorySnapshotStore} from '../../../tests/fixtures/editorial-push-local.mjs';
import {sha256,signSnapshot,verifySnapshot} from '../../../scripts/lib/editorial-push-snapshot.mjs';
import {BRANCH,REPOSITORY,CODE_REPOSITORY,CHUNK} from '../editorial-promoter/policy.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),sha='a'.repeat(40),tmp=await mkdtemp(path.join(os.tmpdir(),'salero-promoter-runtime-'));
const env={ENVIRONMENT:'staging',PROMOTER_ENABLED:'true',CODE_SHA:sha,TRUSTED_WORKFLOW_SHA:sha,REPOSITORY_ID:'123',PAGES_DEPLOY_TOKEN:'local-private-pages-token'};
for(const n of ['BUILDER','PROMOTER','MONITOR','SNAPSHOT'])env[n+'_KEY']=randomBytes(32).toString('hex');
const exported=spawnSync('php',['-d','pcre.jit=0','tests/editorial-push-exporter-simulation.php','--emit-snapshot'],{cwd:root,encoding:'utf8'});assert.equal(exported.status,0);
const packet=signSnapshot(JSON.parse(exported.stdout),1,'batch-test',env.SNAPSHOT_KEY);
const model=new EditorialPushCoordinator({key:env.SNAPSHOT_KEY,codeSha:sha,branch:BRANCH,publishEnvironment:'preview',store:new MemorySnapshotStore()});model.begin('batch-test');model.offer(packet);
const rpc=new AuthenticatedCoordinatorRPC(model,{builder:env.BUILDER_KEY,promoter:env.PROMOTER_KEY,monitor:env.MONITOR_KEY},()=>Math.floor(Date.now()/1000));
const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...rsa.publicKey.export({format:'jwk'}),kid:'local',use:'sig',alg:'RS256'};
function jwt(role='builder',extra={}){const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const c={iss:'https://token.actions.githubusercontent.com',aud:'urn:salero:rebotica:staging:'+role,repository:REPOSITORY,repository_id:'123',repository_visibility:'private',ref:'refs/heads/snapshots',event_name:'repository_dispatch',runner_environment:'github-hosted',job_workflow_sha:sha,job_workflow_ref:`${CODE_REPOSITORY}/.github/workflows/rebotica-trusted-${role}.yml@${sha}`,iat:now,nbf:now,exp:now+300,jti:randomUUID(),run_id:'777',run_attempt:'1',sha:'b'.repeat(40),...extra};const p=enc({alg:'RS256',typ:'JWT',kid:'local'})+'.'+enc(c);return p+'.'+createSign('RSA-SHA256').update(p).sign(rsa.privateKey).toString('base64url');}
const receipt={jobId:'test-job',generation:1,snapshotId:packet.snapshotId,revision:packet.revision,sha256:packet.sha256,counts:packet.counts,commit:sha,branch:BRANCH,scope:'rebotica',mode:'snapshot-coordinated',tests:'passed',buildSuccess:true,snapshotConsistent:true};
const contents={'la-rebotica/index.html':Buffer.from('approved blog'),'_worker.js':Buffer.from('export default {};'),'salero-build.json':Buffer.from(JSON.stringify(receipt))};
contents['assets/large-fixture.bin']=Buffer.alloc(15219071,42);
const files=Object.entries(contents).map(([path,b])=>({path,sha256:sha256(b),bytes:b.length,pagesHash:sha256(b).slice(0,32),contentType:'application/octet-stream'}));
let creates=0,terminal=false,mf,passed=0;
const deployment={id:'local-deployment',environment:'preview',url:'https://1234abcd.salerodigital-staging.pages.dev',deployment_trigger:{metadata:{commit_hash:sha,commit_message:'editorial-job:test-job'}},latest_stage:{status:'success'}};
const compiled=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--dry-run','--config','../editorial-promoter/wrangler.jsonc','--outdir',path.join(tmp,'bundle')],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});assert.equal(compiled.status,0,compiled.stderr);
const options=convertV4MiniflareOptions({name:'salero-editorial-promoter-staging',modules:true,script:await readFile(path.join(tmp,'bundle/worker.js'),'utf8'),compatibilityDate:'2026-10-09',compatibilityFlags:['nodejs_compat'],bindings:env,durableObjects:{PROMOTER:{className:'StagingPromoter',useSQLite:true}},resourcePersistencePath:path.join(tmp,'storage'),serviceBindings:{EDITORIAL_COORDINATOR:async request=>{try{const r=await request.json(),v=rpc.invoke(r);return Response.json({ok:true,value:r.operation==='check'?{...v,packet}:v});}catch(e){return Response.json({ok:false,error:e.message});}}},outboundService:async request=>{
 const u=new URL(request.url);
 if(u.href==='https://token.actions.githubusercontent.com/.well-known/jwks')return Response.json({keys:[jwk]});
 if(u.href===deployment.url+'/salero-build.json')return Response.json(receipt);
 assert.equal(u.origin,'https://api.cloudflare.com');
 if(u.pathname==='/client/v4/pages/assets/upload'){await request.arrayBuffer();return Response.json({success:true,result:{}});}
 assert(u.pathname.startsWith('/client/v4/accounts/0bd72789f683471596f05b6d0c4653fc/pages/projects/salerodigital-staging'));
 if(u.pathname.endsWith('/upload-token'))return Response.json({success:true,result:{jwt:'local-upload-token'}});
 if(u.pathname.endsWith('/deployments')&&request.method==='POST'){creates++;throw Error('simulated lost acknowledgement');}
 if(u.pathname.endsWith('/deployments'))return Response.json({success:true,result:terminal?[deployment]:[]});
 return Response.json({success:true,result:{name:'salerodigital-staging',production_branch:'codex/cms-auto-deploy'}});
}});
async function call(op,args,role='builder',token=jwt(role),nonce=randomUUID()){const r=await mf.dispatchFetch('https://local/v1/'+op,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({nonce,args})});const d=await r.json();for(const k of ['PAGES_DEPLOY_TOKEN','BUILDER_KEY','PROMOTER_KEY','MONITOR_KEY','SNAPSHOT_KEY'])assert(!JSON.stringify(d).includes(env[k]));return d;}
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
try{
 mf=new Miniflare(options);
 await test('modified workflow rejected',async()=>assert.equal((await call('claim',{jobId:'test-job',generation:1,codeSha:sha},'builder',jwt('builder',{job_workflow_sha:'c'.repeat(40)}))).error,'oidc_origin'));
 await test('transit snapshot verified',async()=>{const r=await call('claim',{jobId:'test-job',generation:1,codeSha:sha});assert.equal(r.ok,true,r.error);verifySnapshot(r.value.packet,r.value.verificationKey);});
 const token=jwt(),nonce=randomUUID();
 await test('nonce replay rejected',async()=>{assert.equal((await call('check',{jobId:'test-job'},'builder',token,nonce)).ok,true);assert.equal((await call('check',{jobId:'test-job'},'builder',token,nonce)).error,'oidc_replay');});
 await mf.dispose();mf=new Miniflare(options);
 await test('SQLite replay protection survives restart',async()=>assert.equal((await call('check',{jobId:'test-job'},'builder',token,nonce)).error,'oidc_replay'));
 await test('manifest and uploads verified through SQLite',async()=>{let r=await call('attest',{jobId:'test-job',files});assert.equal(r.ok,true,r.error);for(const[path,b]of Object.entries(contents)){for(let part=0;part<Math.max(1,Math.ceil(b.length/CHUNK));part++){r=await call('upload',{jobId:'test-job',path,part,base64:b.subarray(part*CHUNK,(part+1)*CHUNK).toString('base64')});assert.equal(r.ok,true,r.error);}}});
 await test('lost POST acknowledgement leaves lock',async()=>{assert.equal((await call('promote',{jobId:'test-job'})).error,'deployment_outcome_unknown');assert.equal(creates,1);assert.throws(()=>model.begin('new-edit'),/publication_locked/);});
 await mf.dispose();mf=new Miniflare(options);
 await test('restart never repeats deployment POST',async()=>{const r=await call('promote',{jobId:'test-job'});assert.equal(r.value.phase,'creation_started');assert.equal(creates,1);});
 await test('unknown deployment never unlocks on build failure',async()=>{const r=await call('status',{jobId:'test-job',buildFailed:true},'monitor');assert.equal(r.value.phase,'creation_started');assert.throws(()=>model.begin('new-edit'),/publication_locked/);});
 terminal=true;
 await test('actual mocked receipt required before settling',async()=>{const r=await call('status',{jobId:'test-job',buildFailed:false},'monitor');assert.equal(r.ok,true,r.error);assert.equal(r.value.phase,'published');assert.equal(model.state.published.generation,1);assert.equal(creates,1);});
 console.log(JSON.stringify({passed,localSQLite:true,remoteResources:0,realDeployments:0}));
}finally{await mf?.dispose();await rm(tmp,{recursive:true,force:true});}
