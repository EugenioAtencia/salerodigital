import {sha256,canonical,fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
export const ACCOUNT='0bd72789f683471596f05b6d0c4653fc';
export const PROJECT='salerodigital-staging';
export const BRANCH='codex/rebotica-editorial-staging';
export const REPOSITORY='EugenioAtencia/salero-editorial-snapshots-staging';
export const CODE_REPOSITORY='EugenioAtencia/salerodigital';
export const MAX_FILE=16*1024*1024,CHUNK=1024*1024,MAX_SPECIAL=1024*1024;
export const SPECIAL=new Set(['_headers','_redirects','_routes.json','_worker.js']);
export function exact(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...names].sort().join(','))fail('request_fields');}
export function jobId(value){if(!/^[a-z0-9-]{1,80}$/.test(value||''))fail('job_identity');}
export function filesManifest(files){
 if(!Array.isArray(files)||!files.length||files.length>3000)fail('artifact_manifest');
 const paths=new Set();let total=0;
 for(const file of files){
  exact(file,['path','sha256','bytes','pagesHash','contentType']);
  if(typeof file.path!=='string'||file.path.length>240||!/^[_a-zA-Z0-9][a-zA-Z0-9_./%+ -]*$/.test(file.path)||file.path.split('/').some(s=>!s||s==='.'||s==='..')||/^(?:functions\/|\.git\/|node_modules\/)/.test(file.path)||file.path.includes('%')||paths.has(file.path))fail('artifact_path');
  if(!/^[a-f0-9]{64}$/.test(file.sha256)||!/^[a-f0-9]{32}$/.test(file.pagesHash)||!Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>MAX_FILE||(SPECIAL.has(file.path)&&file.bytes>MAX_SPECIAL)||!/^[-a-zA-Z0-9.+]+\/[-a-zA-Z0-9.+]+(?:; charset=utf-8)?$/.test(file.contentType))fail('artifact_file');
  paths.add(file.path);total+=file.bytes;
 }
 if(total>80*1024*1024||!paths.has('salero-build.json')||!paths.has('la-rebotica/index.html')||!paths.has('_worker.js'))fail('artifact_manifest');
 return sha256(JSON.stringify(canonical([...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0))));
}
export function receiptMatches(r,lease,codeSha){
 if(!r||r.jobId!==lease.jobId||r.generation!==lease.generation||r.snapshotId!==lease.snapshotId||r.revision!==lease.revision||r.sha256!==lease.sha256||r.commit!==codeSha||r.branch!==BRANCH||r.scope!=='rebotica'||r.mode!=='snapshot-coordinated'||r.tests!=='passed'||r.buildSuccess!==true||r.snapshotConsistent!==true||JSON.stringify(canonical(r.counts))!==JSON.stringify(canonical(lease.counts)))fail('artifact_receipt');
}
