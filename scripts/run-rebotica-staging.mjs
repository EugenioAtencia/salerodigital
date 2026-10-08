import {spawnSync} from 'node:child_process';
import {mkdtemp,appendFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {stagingCommand} from './lib/editorial-push-http.mjs';
const jobId=process.env.SALERO_BUILD_JOB_ID,sha=process.env.SALERO_CODE_SHA;
try{
 if(!/^[a-z0-9-]{1,80}$/.test(jobId||'')||!/^[a-f0-9]{40}$/.test(sha||'')||process.env.CLOUDFLARE_ACCOUNT_ID!=='0bd72789f683471596f05b6d0c4653fc')throw Error('staging_configuration');
 const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(head.status!==0||head.stdout.trim()!==sha)throw Error('code_revision');
 const dir=await mkdtemp(path.join(os.tmpdir(),'rebotica-runner-')),site=path.join(dir,'site');
 const result=spawnSync(process.execPath,['scripts/build-snapshot-isolated.mjs',site],{stdio:'inherit'});if(result.status!==0)throw Error('build_failed');
 const rpc=(operation,args)=>stagingCommand({url:process.env.SALERO_COORDINATOR_URL,role:'builder',operation,args,key:process.env.SALERO_BUILDER_KEY});
 // Promotion is a separate durable transition. A failed/unknown upload is never resubmitted here.
 await rpc('preparePromotion',[jobId]);
 const wrangler=path.resolve('integrations/cloudflare/push-staging/node_modules/wrangler/bin/wrangler.js');
 const upload=spawnSync(process.execPath,[wrangler,'pages','deploy',site,'--project-name=salerodigital-staging','--branch=codex/rebotica-editorial-staging',`--commit-hash=${sha}`,`--commit-message=editorial-job:${jobId}`,'--commit-dirty=false'],{encoding:'utf8'});
 // Do not print subprocess output: keep credentials and unpredictable diagnostics out of CI logs.
 if(upload.status!==0)throw Error('deployment_outcome_unknown');
 const url=upload.stdout.match(/https:\/\/([a-f0-9]{8})\.salerodigital-staging\.pages\.dev/);
 if(!url)throw Error('deployment_outcome_unknown');
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`deployment_id=${url[1]}\n`);
 console.log(JSON.stringify({stage:'staging_upload_submitted',deploymentPrefix:url[1],jobId}));
}catch(e){console.error(JSON.stringify({stage:'staging_runner',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'runner_failed'}));process.exitCode=1;}
