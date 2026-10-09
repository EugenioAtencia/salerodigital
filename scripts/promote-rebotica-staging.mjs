import {spawnSync} from 'node:child_process';
import {appendFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {stagingCommand} from './lib/editorial-push-http.mjs';
import {artifactDigest} from './lib/editorial-artifact-digest.mjs';
const jobId=process.env.SALERO_BUILD_JOB_ID,sha=process.env.SALERO_CODE_SHA;
try {
 const site=process.argv[2];
 if(!site||!/^[a-z0-9-]{1,80}$/.test(jobId||'')||!/^[a-f0-9]{40}$/.test(sha||'')||process.env.CLOUDFLARE_ACCOUNT_ID!=='0bd72789f683471596f05b6d0c4653fc')throw Error('staging_configuration');
 const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(head.status!==0||head.stdout.trim()!==sha)throw Error('code_revision');
 const receipt=JSON.parse(await readFile(path.join(site,'salero-build.json'),'utf8'));
 if(receipt.jobId!==jobId||receipt.commit!==sha||receipt.branch!=='codex/rebotica-editorial-staging'||receipt.tests!=='passed'||receipt.buildSuccess!==true||receipt.snapshotConsistent!==true||receipt.scope!=='rebotica')throw Error('artifact_receipt');
 const digest=await artifactDigest(site);
 const rpc=(operation,args)=>stagingCommand({url:process.env.SALERO_COORDINATOR_URL,role:'promoter',operation,args,key:process.env.SALERO_PROMOTER_KEY});
 const lease=await rpc('check',[jobId]);
 if(!lease.artifactDigest||lease.artifactDigest!==digest||lease.generation!==receipt.generation||lease.snapshotId!==receipt.snapshotId||lease.revision!==receipt.revision)throw Error('artifact_identity');
 await rpc('preparePromotion',[jobId,digest]);
 // ONE upload; an uncertain outcome is reconciled by the monitor, never retried here.
 const wrangler=path.resolve('integrations/cloudflare/push-staging/node_modules/wrangler/bin/wrangler.js');
 const upload=spawnSync(process.execPath,[wrangler,'pages','deploy',site,'--project-name=salerodigital-staging','--branch=codex/rebotica-editorial-staging',`--commit-hash=${sha}`,`--commit-message=editorial-job:${jobId}`,'--commit-dirty=false'],{encoding:'utf8'});
 if(upload.status!==0)throw Error('deployment_outcome_unknown');
 const url=upload.stdout.match(/https:\/\/([a-f0-9]{8})\.salerodigital-staging\.pages\.dev/);
 if(!url)throw Error('deployment_outcome_unknown');
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`deployment_id=${url[1]}\n`);
 console.log(JSON.stringify({stage:'staging_upload_submitted',deploymentPrefix:url[1],jobId}));
}catch(e){console.error(JSON.stringify({stage:'staging_promoter',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'promoter_failed'}));process.exitCode=1;}
