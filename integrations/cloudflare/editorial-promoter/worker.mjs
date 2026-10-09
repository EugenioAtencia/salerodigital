import {DurableObject} from 'cloudflare:workers';
import {fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
import {signCommand} from '../../../scripts/lib/editorial-push-rpc.mjs';
import {PromoterEngine} from './engine.mjs';
import {verifyOIDC,boundedJSON} from './oidc.mjs';
import {StagingPages} from './pages.mjs';
import {exact} from './policy.mjs';
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const operations=['claim','check','attest','upload','promote','status'];
export default{
 async fetch(request,env){
  const url=new URL(request.url),operation=url.pathname.split('/')[2];
  if(env.PROMOTER_ENABLED!=='true')return response({error:'promoter_disabled'},503);
  if(request.method!=='POST'||url.pathname!==`/v1/${operation}`||!operations.includes(operation)||url.search)return response({error:'route'},404);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return response({error:'content_type'},415);
  return env.PROMOTER.getByName('staging-only').fetch(request); // Heavy work stays in the SQLite DO.
 }
};
export class StagingPromoter extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.serial=Promise.resolve();ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS chunks (job TEXT, path TEXT, part INTEGER, body BLOB NOT NULL, PRIMARY KEY(job,path,part))');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, body TEXT NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS oidc_jti (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)');}
 fetch(request){const result=this.serial.then(()=>this.handle(request));this.serial=result.catch(()=>{});return result;}
 async handle(request){
  try{
   if(this.env.PROMOTER_ENABLED!=='true'||this.env.ENVIRONMENT!=='staging')fail('promoter_disabled');
   const keys=['BUILDER_KEY','PROMOTER_KEY','MONITOR_KEY','SNAPSHOT_KEY'].map(k=>this.env[k]);
   if(keys.some(k=>typeof k!=='string'||k.length<32)||new Set(keys).size!==keys.length||!this.env.PAGES_DEPLOY_TOKEN||this.env.CODE_SHA!==this.env.TRUSTED_WORKFLOW_SHA)fail('promoter_configuration');
   const operation=new URL(request.url).pathname.split('/')[2],role=operation==='status'?'monitor':'builder';
   const auth=request.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))fail('oidc_token');
   const actor=await verifyOIDC(auth.slice(7),role,this.env);
   const reader=request.body.getReader(),parts=[];let length=0;
   while(true){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>(operation==='upload'?1500000:1024*1024)){await reader.cancel();fail('request_size');}parts.push(value);}
   let envelope;try{envelope=JSON.parse(Buffer.concat(parts));}catch{fail('request_json');}
   exact(envelope,['nonce','args']);if(!/^[a-z0-9-]{1,80}$/.test(envelope.nonce||''))fail('oidc_nonce');
   const args=envelope.args,replayId=actor.jti+':'+envelope.nonce;
   const sql=this.ctx.storage.sql,now=Math.floor(Date.now()/1000);
   sql.exec('DELETE FROM oidc_jti WHERE expires < ?',now);
   if(sql.exec('SELECT id FROM oidc_jti WHERE id=?',replayId).toArray().length)fail('oidc_replay');
   sql.exec('INSERT INTO oidc_jti(id,expires)VALUES(?,?)',replayId,actor.exp);
   const store={get:async id=>{const r=sql.exec('SELECT body FROM jobs WHERE id=?',id).toArray();return r.length?JSON.parse(r[0].body):null;},put:async job=>{const body=JSON.stringify(job);if(Buffer.byteLength(body)>1500000)fail('job_storage_size');sql.exec('INSERT INTO jobs(id,body)VALUES(?,?)ON CONFLICT(id)DO UPDATE SET body=excluded.body',job.jobId,body);}};
   store.putChunk=async(job,path,part,bytes)=>{sql.exec('INSERT INTO chunks(job,path,part,body)VALUES(?,?,?,?)ON CONFLICT(job,path,part)DO UPDATE SET body=excluded.body',job,path,part,bytes);};
   store.assemble=async(job,path,parts)=>{const rows=sql.exec('SELECT part,body FROM chunks WHERE job=? AND path=? ORDER BY part',job,path).toArray();if(rows.length!==parts||rows.some((r,i)=>r.part!==i))return null;return Buffer.concat(rows.map(r=>Buffer.from(r.body)));};
   store.clearChunks=async(job,path)=>{sql.exec('DELETE FROM chunks WHERE job=? AND path=?',job,path);};
   const coordinator=async(role,op,a)=>{
    const key=this.env[role.toUpperCase()+'_KEY'];if(!key)fail('coordinator_configuration');
    const r=await this.env.EDITORIAL_COORDINATOR.fetch('https://internal/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(signCommand(role,op,a,key,Math.floor(Date.now()/1000)))});
    if(r.status!==200)fail('coordinator_unavailable');const d=await boundedJSON(r,1200000);if(d.ok!==true)fail(/^[a-z_]+$/.test(d.error||'')?d.error:'coordinator_unavailable');return d.value;
   };
   const engine=new PromoterEngine({store,coordinator,pages:new StagingPages(this.env.PAGES_DEPLOY_TOKEN),config:this.env});
   return response({ok:true,value:await engine.execute(operation,args,actor)});
  }catch(error){return response({ok:false,error:/^[a-z_]{1,60}$/.test(error.message||'')?error.message:'promoter_failed'},403);}
 }
}
