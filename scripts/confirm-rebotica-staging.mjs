import {stagingCommand} from './lib/editorial-push-http.mjs';
const jobId=process.env.SALERO_BUILD_JOB_ID,sha=process.env.SALERO_CODE_SHA;
const rpc=(operation,args)=>stagingCommand({url:process.env.SALERO_COORDINATOR_URL,role:'monitor',operation,args,key:process.env.SALERO_MONITOR_KEY});
try{
 if(!/^[a-z0-9-]{1,80}$/.test(jobId||'')||!/^[a-f0-9]{40}$/.test(sha||'')||process.env.CLOUDFLARE_ACCOUNT_ID!=='0bd72789f683471596f05b6d0c4653fc')throw Error('staging_configuration');
 const base='https://api.cloudflare.com/client/v4/accounts/0bd72789f683471596f05b6d0c4653fc/pages/projects/salerodigital-staging';
 const read=async url=>{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,Accept:'application/json'}});if(r.status!==200||!r.headers.get('content-type')?.includes('application/json'))throw Error('monitor_unavailable');const p=await r.json();if(!p.success)throw Error('monitor_unavailable');return p.result;};
 let deployment;
 for(let attempt=0;attempt<24;attempt++){
  const list=await read(base+'/deployments');const matches=list.filter(d=>d.environment==='preview'&&d.deployment_trigger?.metadata?.commit_hash===sha&&d.deployment_trigger?.metadata?.commit_message===`editorial-job:${jobId}`);
  if(matches.length>1)throw Error('duplicate_deployment_reconciliation');
  if(matches.length===1){deployment=matches[0];if(['success','failure'].includes(deployment.latest_stage?.status))break;}
  if(attempt<23)await new Promise(r=>setTimeout(r,10000));
 }
 if(!deployment){if(process.env.SALERO_RUN_RESULT==='failure'){await rpc('abort',[jobId]);console.log('Build failed; no publishing job was cleared unless still building.');}else throw Error('deployment_not_found');}
 else{
  if(!['success','failure'].includes(deployment.latest_stage.status))throw Error('deployment_not_terminal');
  if(!/^https:\/\/[a-f0-9]{8}\.salerodigital-staging\.pages\.dev$/.test(deployment.url))throw Error('deployment_identity');
  let receipt=null;
  if(deployment.latest_stage.status==='success'){
   const r=await fetch(deployment.url+'/salero-build.json',{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(r.status!==200||!r.headers.get('content-type')?.includes('application/json'))throw Error('receipt_unavailable');receipt=await r.json();
  }
  await rpc('settle',[jobId,{jobId,codeSha:sha,id:deployment.id,environment:'preview',status:deployment.latest_stage.status,receipt}]);
  console.log(JSON.stringify({stage:'staging_confirmed',id:deployment.id,status:deployment.latest_stage.status}));
 }
}catch(e){console.error(JSON.stringify({stage:'staging_monitor',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'monitor_failed'}));process.exitCode=1;}
