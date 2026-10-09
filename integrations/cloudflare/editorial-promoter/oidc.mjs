import {fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
import {REPOSITORY,CODE_REPOSITORY} from './policy.mjs';
const ISSUER='https://token.actions.githubusercontent.com';
export async function boundedJSON(response,max=65536){
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))fail('remote_json');
 const reader=response.body.getReader();const parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail('remote_size');}parts.push(value);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail('remote_json');}
}
export async function verifyOIDC(token,role,config,{fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}){
 if(!['builder','monitor'].includes(role)||!/^[a-f0-9]{40}$/.test(config.TRUSTED_WORKFLOW_SHA||'')||!/^\d+$/.test(config.REPOSITORY_ID||'')||!/^[a-f0-9]{40}$/.test(config.CODE_SHA||''))fail('promoter_configuration');
 if(typeof token!=='string'||token.length>8192)fail('oidc_token');
 const parts=token.split('.');if(parts.length!==3||parts.some(s=>!s||!/^[A-Za-z0-9_-]+$/.test(s)))fail('oidc_token');
 let h,c;try{h=JSON.parse(Buffer.from(parts[0],'base64url'));c=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{fail('oidc_token');}
 if(h.alg!=='RS256'||h.typ!=='JWT'||typeof h.kid!=='string'||h.jku||h.jwk||h.x5u||h.crit)fail('oidc_algorithm');
 if(c.iss!==ISSUER||c.aud!==`urn:salero:rebotica:staging:${role}`||c.repository!==REPOSITORY||c.repository_id!==config.REPOSITORY_ID||c.repository_visibility!=='private'||c.ref!=='refs/heads/snapshots'||!['repository_dispatch','workflow_dispatch'].includes(c.event_name)||c.runner_environment!=='github-hosted'||c.job_workflow_sha!==config.TRUSTED_WORKFLOW_SHA||c.job_workflow_ref!==`${CODE_REPOSITORY}/.github/workflows/rebotica-trusted-${role}.yml@${config.TRUSTED_WORKFLOW_SHA}`)fail('oidc_origin');
 if(!Number.isSafeInteger(c.exp)||!Number.isSafeInteger(c.iat)||!Number.isSafeInteger(c.nbf)||c.exp<=now||c.nbf>now+15||c.iat>now+15||c.exp-c.iat>600||c.iat<now-600||typeof c.jti!=='string'||c.jti.length>120||!c.jti||!/^\d+$/.test(c.run_id||'')||!/^\d+$/.test(c.run_attempt||'')||!/^[a-f0-9]{40}$/.test(c.sha||''))fail('oidc_claims');
 const response=await fetchImpl(ISSUER+'/.well-known/jwks',{redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(response.status!==200)fail('oidc_keys');
 const jwks=await boundedJSON(response);const matches=(jwks.keys||[]).filter(k=>k.kid===h.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');if(matches.length!==1)fail('oidc_keys');
 let key;try{key=await crypto.subtle.importKey('jwk',matches[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);}catch{fail('oidc_keys');}
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,Buffer.from(parts[2],'base64url'),Buffer.from(parts[0]+'.'+parts[1])))fail('oidc_signature');
 return {...c,role};
}
