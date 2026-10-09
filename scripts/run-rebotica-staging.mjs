import {spawnSync} from 'node:child_process';
import {mkdtemp,appendFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {stagingCommand} from './lib/editorial-push-http.mjs';
import {artifactDigest} from './lib/editorial-artifact-digest.mjs';
const jobId=process.env.SALERO_BUILD_JOB_ID,sha=process.env.SALERO_CODE_SHA;
try{
 if(!/^[a-z0-9-]{1,80}$/.test(jobId||'')||!/^[a-f0-9]{40}$/.test(sha||'')||process.env.CLOUDFLARE_ACCOUNT_ID!=='0bd72789f683471596f05b6d0c4653fc')throw Error('staging_configuration');
 const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(head.status!==0||head.stdout.trim()!==sha)throw Error('code_revision');
 const dir=await mkdtemp(path.join(os.tmpdir(),'rebotica-runner-')),site=path.join(dir,'site');
 const result=spawnSync(process.execPath,['scripts/build-snapshot-isolated.mjs',site],{stdio:'inherit'});if(result.status!==0)throw Error('build_failed');
 const rpc=(operation,args)=>stagingCommand({url:process.env.SALERO_COORDINATOR_URL,role:'builder',operation,args,key:process.env.SALERO_BUILDER_KEY});
 const digest=await artifactDigest(site);
 await rpc('sealArtifact',[jobId,digest]);
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`site=${site}\n`);
 console.log(JSON.stringify({stage:'staging_artifact_sealed',jobId,digest}));
}catch(e){console.error(JSON.stringify({stage:'staging_runner',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'runner_failed'}));process.exitCode=1;}
