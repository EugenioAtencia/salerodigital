import {createHmac} from 'node:crypto';
import {sha256,verifySnapshot,signSnapshot,fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
import {exact,jobId,filesManifest,receiptMatches,SPECIAL,CHUNK} from './policy.mjs';
export class PromoterEngine{
 constructor({store,coordinator,pages,config}){Object.assign(this,{store,coordinator,pages,config});}
 async execute(operation,args,actor){
  const allowed={builder:['claim','check','attest','upload','promote'],monitor:['status']};
  if(!allowed[actor.role]?.includes(operation))fail('promoter_permission');
  if(!/^[a-f0-9]{40}$/.test(this.config.CODE_SHA||''))fail('promoter_configuration');
  if(operation==='claim'){
   exact(args,['jobId','generation','codeSha']);jobId(args.jobId);
   if(args.codeSha!==this.config.CODE_SHA||!Number.isSafeInteger(args.generation)||args.generation<1)fail('code_revision');
   let job=await this.store.get(args.jobId);
   if(job&&(job.runId!==actor.run_id||job.runAttempt!==actor.run_attempt||job.runSha!==actor.sha))fail('artifact_run');
   await this.coordinator('builder','claim',[args.jobId,args.codeSha,args.generation]);
   const lease=await this.coordinator('builder','check',[args.jobId]);
   if(lease.phase!=='building')fail('job_phase');
   if(!job){job={jobId:args.jobId,codeSha:args.codeSha,generation:args.generation,runId:actor.run_id,runAttempt:actor.run_attempt,runSha:actor.sha,phase:'building',files:null,uploaded:{},special:{}};await this.store.put(job);}
   return this.publicLease(lease,job);
  }
  if(operation==='check'){
   exact(args,['jobId']);const job=await this.owned(args.jobId,actor);return this.publicLease(await this.coordinator('builder','check',[args.jobId]),job);
  }
  if(operation==='attest'){
   exact(args,['jobId','files']);const job=await this.owned(args.jobId,actor);
   const digest=filesManifest(args.files);
   const lease=await this.coordinator('builder','check',[job.jobId]);if(lease.phase!=='building')fail('job_phase');
   if(job.digest&&job.digest!==digest)fail('artifact_conflict');
   await this.coordinator('builder','sealArtifact',[job.jobId,digest]);
   job.digest=digest;job.files=structuredClone(args.files);await this.store.put(job);return {digest};
  }
  if(operation==='upload'){
   exact(args,['jobId','path','part','base64']);const job=await this.owned(args.jobId,actor);
   if(!job.files||job.phase!=='building')fail('artifact_not_attested');
   const file=job.files.find(f=>f.path===args.path);if(!file)fail('artifact_path');
   if(typeof args.base64!=='string'||args.base64.length>Math.ceil(CHUNK/3)*4||/[^A-Za-z0-9+/=]/.test(args.base64))fail('artifact_bytes');
   const piece=Buffer.from(args.base64,'base64');
   const parts=Math.max(1,Math.ceil(file.bytes/CHUNK));
   if(!Number.isSafeInteger(args.part)||args.part<0||args.part>=parts||piece.toString('base64')!==args.base64||piece.length!==Math.min(CHUNK,Math.max(0,file.bytes-args.part*CHUNK)))fail('artifact_bytes');
   const lease=await this.coordinator('builder','check',[job.jobId]);if(lease.phase!=='building')fail('job_phase');
   if(job.uploaded[file.path])return{uploaded:true,duplicate:true};
   await this.store.putChunk(job.jobId,file.path,args.part,piece);
   const bytes=await this.store.assemble(job.jobId,file.path,parts);
   if(!bytes)return{uploaded:false,part:args.part};
   if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)fail('artifact_hash');
   if(file.path==='salero-build.json'){
    let receipt;try{receipt=JSON.parse(bytes);}catch{fail('artifact_receipt');}receiptMatches(receipt,lease,job.codeSha);job.receipt=receipt;
   }
   if(SPECIAL.has(file.path))job.special[file.path]=bytes.toString('base64');
   else await this.pages.upload(file,bytes); // Content-addressed upload is safe to repeat after a lost ACK.
   // An edit during upload invalidates this job even though unpublished assets may exist.
   const after=await this.coordinator('builder','check',[job.jobId]);if(after.phase!=='building')fail('job_phase');
   job.uploaded[file.path]=true;await this.store.put(job);await this.store.clearChunks(job.jobId,file.path);return{uploaded:true,duplicate:false};
  }
  if(operation==='promote'){
   exact(args,['jobId']);const job=await this.owned(args.jobId,actor);
   // Durable marker BEFORE the non-idempotent deployment call. Never submit it twice.
   if(['creation_started','submitted','published','failed'].includes(job.phase))return this.summary(job);
   if(!job.files||!job.receipt||job.files.some(f=>!job.uploaded[f.path]))fail('artifact_incomplete');
   const lease=await this.coordinator('promoter','check',[job.jobId]);receiptMatches(job.receipt,lease,job.codeSha);
   if(lease.artifactDigest!==job.digest)fail('artifact_conflict');
   await this.coordinator('promoter','preparePromotion',[job.jobId,job.digest]);
   job.phase='creation_started';await this.store.put(job);
   try{const d=await this.pages.create(job);job.phase='submitted';job.deploymentId=d.id;job.url=d.url;await this.store.put(job);}catch{fail('deployment_outcome_unknown');}
   return this.summary(job);
  }
  exact(args,['jobId','buildFailed']);jobId(args.jobId);if(typeof args.buildFailed!=='boolean')fail('request_fields');
  const job=await this.store.get(args.jobId);if(!job)fail('job_identity');
  if(['published','failed'].includes(job.phase))return this.summary(job);
  if(job.phase==='building'){
   if(args.buildFailed){await this.coordinator('monitor','abort',[job.jobId]);job.phase='failed';await this.store.put(job);}
   return this.summary(job);
  }
  const d=await this.pages.inspect(job);if(!d||!['success','failure'].includes(d.latest_stage?.status))return this.summary(job);
  if(d.latest_stage.status==='success')receiptMatches(d.receipt,job.receipt,job.codeSha);
  await this.coordinator('monitor','settle',[job.jobId,{jobId:job.jobId,codeSha:job.codeSha,id:d.id,environment:'preview',status:d.latest_stage.status,receipt:d.receipt}]);
  job.phase=d.latest_stage.status==='success'?'published':'failed';job.deploymentId=d.id;job.url=d.url;await this.store.put(job);return this.summary(job);
 }
 async owned(id,actor){jobId(id);const job=await this.store.get(id);if(!job||job.runId!==actor.run_id||job.runAttempt!==actor.run_attempt||job.runSha!==actor.sha)fail('artifact_run');return job;}
 publicLease(lease,job){
  verifySnapshot(lease.packet,this.config.SNAPSHOT_KEY);
  const verificationKey=createHmac('sha256',this.config.SNAPSHOT_KEY).update('build-packet:'+job.jobId+':'+job.runId+':'+job.codeSha).digest('hex');
  // Per-job transit key only. Long-lived snapshot/authentication keys stay in Cloudflare.
  return {...lease,packet:signSnapshot(lease.packet,lease.generation,lease.batchId,verificationKey),verificationKey};
 }
 summary(job){return{jobId:job.jobId,generation:job.generation,digest:job.digest,phase:job.phase,...(job.deploymentId?{deploymentId:job.deploymentId,url:job.url}:{})};}
}
