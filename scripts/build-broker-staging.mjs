import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';import path from 'node:path';
import {broker} from './lib/editorial-broker-client.mjs';
import {retryEditorial} from './lib/editorial-push-retry.mjs';
import {buildSnapshotArtifacts} from './lib/editorial-snapshot-artifacts.mjs';
import {validatePagesWorkerUpload} from './lib/editorial-pages-worker-validation.mjs';
import {sha256} from './lib/editorial-push-snapshot.mjs';
import {CHUNK,filesManifest} from '../integrations/cloudflare/editorial-promoter/policy.mjs';
const require=createRequire(new URL('../integrations/cloudflare/push-staging/package.json',import.meta.url));
const blake3=require('blake3-wasm');
const jobId=process.env.SALERO_BUILD_JOB_ID,codeSha=process.env.SALERO_CODE_SHA,generation=Number(process.env.SALERO_EXPECTED_GENERATION);
try{
 if(!/^[a-z0-9-]{1,80}$/.test(jobId||'')||!/^[a-f0-9]{40}$/.test(codeSha||'')||!Number.isSafeInteger(generation)||generation<1)throw Error('build_identity');
 const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(head.status!==0||head.stdout.trim()!==codeSha)throw Error('code_revision');
 const tests=spawnSync(process.execPath,['scripts/test-rebotica-editorial.mjs'],{stdio:'inherit'});if(tests.status!==0)throw Error('critical_tests');
 await retryEditorial(()=>broker('claim',{jobId,generation,codeSha}));
 const initial=await broker('check',{jobId});
 const site=path.join(await mkdtemp(path.join(os.tmpdir(),'salero-broker-site-')),'site');
 await buildSnapshotArtifacts({root:process.cwd(),output:site,packet:initial.packet,key:initial.verificationKey,jobId,codeSha,tests:'passed',scope:'rebotica',branch:'codex/rebotica-editorial-staging',check:()=>broker('check',{jobId})});
 const cli=path.resolve('integrations/cloudflare/push-staging/node_modules/wrangler/bin/wrangler.js');
 const compiled=spawnSync(process.execPath,[cli,'pages','functions','build',path.join(site,'functions'),'--outfile',path.join(site,'_worker.js'),'--build-output-directory',site,'--output-routes-path',path.join(site,'_routes.json'),'--compatibility-date','2026-10-09'],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(compiled.status!==0)throw Error('functions_compile');
 await validatePagesWorkerUpload(await readFile(path.join(site,'_worker.js')));
 await rm(path.join(site,'functions'),{recursive:true});
 const files=[];
 async function walk(relative=''){
  for(const e of await readdir(path.join(site,relative),{withFileTypes:true})){
   const name=path.posix.join(relative,e.name);
   if(e.isDirectory()){await walk(name);continue;}if(!e.isFile())throw Error('artifact_file_type');
   const bytes=await readFile(path.join(site,name));
   const types={html:'text/html',css:'text/css',js:'application/javascript',json:'application/json',xml:'application/xml',txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',ico:'image/x-icon',woff2:'font/woff2',pdf:'application/pdf'};
   const ext=path.extname(name).slice(1);
   files.push({path:name,bytes:bytes.length,sha256:sha256(bytes),pagesHash:blake3.hash(bytes.toString('base64')+ext).toString('hex').slice(0,32),contentType:types[ext]||'application/octet-stream'});
  }
 }
 await walk();const digest=filesManifest(files);await retryEditorial(()=>broker('attest',{jobId,files}));
 for(const file of files){
  const bytes=await readFile(path.join(site,file.path));
  for(let part=0;part<Math.max(1,Math.ceil(bytes.length/CHUNK));part++)await retryEditorial(()=>broker('upload',{jobId,path:file.path,part,base64:bytes.subarray(part*CHUNK,(part+1)*CHUNK).toString('base64')}));
 }
 // A retry invokes the durable promoter, never submits the Pages deployment directly.
 const result=await retryEditorial(()=>broker('promote',{jobId}));
 console.log(JSON.stringify({stage:'broker_promotion',digest,...result}));
}catch(e){console.error(JSON.stringify({stage:'broker_builder',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'builder_failed'}));process.exitCode=1;}
