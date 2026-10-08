// Temporary read-only staging probe. Never outputs headers, bodies or queries.
import { randomUUID } from 'node:crypto';
const endpoint='https://cms.webagencia360.com/wp-json/salero-pages/v1/revision';
for (const variant of ['default','identified-client','identity-encoding','canonical-url']) {
 const url=new URL(endpoint);
 if(variant!=='canonical-url') url.searchParams.set('_salero_build',randomUUID());
 const headers={Accept:'application/json'};
 if(variant==='identified-client') headers['User-Agent']='SaleroEditorialSSG/1.0';
 if(variant==='identity-encoding') headers['Accept-Encoding']='identity';
 try {
 const r=await fetch(url,{headers,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000)});
 const body=await r.text();
 console.log(JSON.stringify({phase:'revision-transport-probe',variant,httpStatus:r.status,contentType:r.headers.get('content-type')?.split(';')[0],bytes:Buffer.byteLength(body),html: /<html|<script/i.test(body),challengeMarker:/captcha|challenge|sgcaptcha|__sg_tk/i.test(body),javascriptMarker:/javascript|<script/i.test(body),cookieMarker:/cookie/i.test(body),cacheNoStore:/no-store/i.test(r.headers.get('cache-control')||''),compressed:!!r.headers.get('content-encoding')}));
 }catch{console.log(JSON.stringify({phase:'revision-transport-probe',variant,logicalCode:'network-or-timeout'}));}
}
