import assert from 'node:assert/strict';
import {snapshotEditorialRequest} from '../functions/_shared/snapshot-page.js';
import {sha256} from '../scripts/lib/editorial-push-snapshot.mjs';
const html='<html><head><title>Certified</title></head><body>Immutable article</body></html>', xml='<urlset/>', origin='https://agenciaconsalero.es';
const receipt={mode:'snapshot-coordinated',scope:'rebotica',buildSuccess:true,snapshotConsistent:true,tests:'passed',pages:{'la-rebotica/index.html':sha256(html),'la-rebotica/article/index.html':sha256(html),'la-rebotica/page/2/index.html':sha256(html)},sitemapSha256:sha256(xml)};
let mode='snapshot', reads=0;
const context={request:new Request(origin+'/la-rebotica/article/'),env:{ASSETS:{fetch:async request=>{reads++;const p=new URL(request.url).pathname;if(p==='/salero-build.json'){if(mode==='legacy')return new Response('',{status:404});if(mode==='broken')return new Response('bad',{headers:{'content-type':'application/json'}});return Response.json(receipt);}return new Response(mode==='tampered'?'corrupt':p==='/sitemap.xml'?xml:html,{headers:{'content-type':p.endsWith('.xml')?'application/xml':'text/html'}});}}}};
for(const route of ['/la-rebotica/','/la-rebotica/article/','/la-rebotica/page/2/','/sitemap.xml/']){const r=await snapshotEditorialRequest(context,route);assert.equal(r.status,200);assert.equal(r.headers.get('x-salero-render'),'snapshot-asset');}
assert.equal((await snapshotEditorialRequest(context,'/la-rebotica/deleted/')).status,404);
mode='tampered';assert.equal((await snapshotEditorialRequest(context,'/la-rebotica/article/')).status,503);
mode='broken';assert.equal((await snapshotEditorialRequest(context,'/la-rebotica/article/')).status,503);
mode='legacy';assert.equal(await snapshotEditorialRequest(context,'/la-rebotica/article/'),null);
const before=reads;assert.equal(await snapshotEditorialRequest(context,'/el-menu/'),null);assert.equal(reads,before);
console.log('PASS production editorial delivery: article, listing, pagination, sitemap, withdrawal, corrupt hash/receipt, rollback and unrelated routes; no CMS calls');
