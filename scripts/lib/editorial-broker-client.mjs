import {randomUUID} from 'node:crypto';
import {boundedJSON} from '../../integrations/cloudflare/editorial-promoter/oidc.mjs';
const ENDPOINT='https://salero-editorial-promoter-staging.eu-atencia.workers.dev';
let cached=null;
export async function githubOIDC(role){
 const audience=`urn:salero:rebotica:staging:${role}`;
 if(cached?.role===role&&cached.expires>Date.now()+30000)return cached.token;
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com')||url.username||url.password)throw Error('oidc_request_origin');
 url.searchParams.set('audience',audience);
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(r.status!==200||!r.headers.get('content-type')?.includes('application/json'))throw Error('oidc_request');
 const d=await boundedJSON(r);if(typeof d.value!=='string'||d.value.length>8192)throw Error('oidc_request');
 const c=JSON.parse(Buffer.from(d.value.split('.')[1],'base64url'));cached={role,token:d.value,expires:c.exp*1000};return d.value;
}
export async function broker(operation,args,role='builder'){
 const token=await githubOIDC(role);
 const r=await fetch(ENDPOINT+'/v1/'+operation,{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({nonce:randomUUID(),args})});
 if(![200,403].includes(r.status)||!r.headers.get('content-type')?.includes('application/json'))throw Error('promoter_unavailable');
 const d=await boundedJSON(r,1200000);if(d.ok!==true)throw Error(/^[a-z_]{1,60}$/.test(d.error||'')?d.error:'promoter_unavailable');return d.value;
}
