import {broker}from'./lib/editorial-broker-client.mjs';
import {retryEditorial}from'./lib/editorial-push-retry.mjs';
const jobId=process.env.SALERO_BUILD_JOB_ID;
try{
 if(!/^[a-z0-9-]{1,80}$/.test(jobId||''))throw Error('job_identity');
 for(let i=0;i<24;i++){
  const result=await retryEditorial(()=>broker('status',{jobId,buildFailed:process.env.SALERO_BUILD_RESULT!=='success'},'monitor'));
  if(result.phase==='published'){console.log(JSON.stringify({stage:'broker_confirmed',...result}));break;}
  if(result.phase==='failed')throw Error('deployment_failed');
  if(i===23)throw Error('deployment_reconciliation_required');
  await new Promise(resolve=>setTimeout(resolve,10000));
 }
}catch(e){console.error(JSON.stringify({stage:'broker_monitor',error:/^[a-z_]{1,60}$/.test(e.message)?e.message:'monitor_failed'}));process.exitCode=1;}
