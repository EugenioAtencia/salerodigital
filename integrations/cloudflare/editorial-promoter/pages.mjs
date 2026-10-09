import {ACCOUNT,PROJECT,BRANCH,SPECIAL} from './policy.mjs';
import {boundedJSON} from './oidc.mjs';
import {fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
import {pagesWorkerUpload} from './pages-worker-upload.mjs';
const ORIGIN='https://api.cloudflare.com/client/v4';
export class StagingPages{
 constructor(token,fetchImpl=(...args)=>fetch(...args)){this.token=token;this.fetchImpl=fetchImpl;}
 async api(path,method='GET',body,token=this.token){
  if(!this.token)fail('pages_configuration');
  const form=body instanceof FormData;
  let r;try{r=await this.fetchImpl(ORIGIN+path,{method,redirect:'manual',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,...(!form?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:form?body:JSON.stringify(body)});}catch{fail('pages_unavailable');}
  if(r.status===429||r.status>=500)fail('pages_unavailable');
  if(r.status!==200&&r.status!==201)fail('pages_http');const d=await boundedJSON(r,1048576);if(d.success!==true)fail('pages_api');return d.result;
 }
 get base(){return `/accounts/${ACCOUNT}/pages/projects/${PROJECT}`;}
 async upload(file,bytes){
  const {jwt}=await this.api(this.base+'/upload-token');if(typeof jwt!=='string'||!jwt)fail('pages_upload_token');
  await this.api('/pages/assets/upload','POST',[{key:file.pagesHash,value:Buffer.from(bytes).toString('base64'),metadata:{contentType:file.contentType},base64:true}],jwt);
 }
 async create(job){
  const project=await this.api(this.base);if(project.name!==PROJECT||project.production_branch===BRANCH)fail('pages_project_configuration');
  const form=new FormData();const manifest=Object.fromEntries(job.files.filter(f=>!SPECIAL.has(f.path)).map(f=>['/'+f.path,f.pagesHash]));
  form.set('manifest',JSON.stringify(manifest));form.set('branch',BRANCH);form.set('commit_hash',job.codeSha);form.set('commit_dirty','false');form.set('commit_message','editorial-job:'+job.jobId);
  for(const [name,encoded]of Object.entries(job.special)){
   const bytes=Buffer.from(encoded,'base64');
   if(name==='_worker.js'){const {field,blob}=pagesWorkerUpload(bytes);form.set(field,blob,field);}
   else form.set(name,new Blob([bytes]),name);
  }
  const d=await this.api(this.base+'/deployments','POST',form);
  if(d.environment!=='preview'||d.deployment_trigger?.metadata?.commit_hash!==job.codeSha||d.deployment_trigger?.metadata?.commit_message!=='editorial-job:'+job.jobId||!/^https:\/\/[a-f0-9]{8}\.salerodigital-staging\.pages\.dev$/.test(d.url)||typeof d.id!=='string')fail('deployment_identity');return d;
 }
 async inspect(job){
  const list=await this.api(this.base+'/deployments');if(!Array.isArray(list))fail('deployment_list');
  const matches=list.filter(d=>d.environment==='preview'&&d.deployment_trigger?.metadata?.commit_hash===job.codeSha&&d.deployment_trigger?.metadata?.commit_message==='editorial-job:'+job.jobId);
  if(matches.length>1)fail('duplicate_deployment');if(!matches.length)return null;
  const d=matches[0];if(!/^https:\/\/[a-f0-9]{8}\.salerodigital-staging\.pages\.dev$/.test(d.url))fail('deployment_identity');
  if(d.latest_stage?.status!=='success')return{...d,receipt:null};
  const r=await this.fetchImpl(d.url+'/salero-build.json',{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(r.status!==200)fail('deployment_receipt');return{...d,receipt:await boundedJSON(r,1048576)};
 }
}
