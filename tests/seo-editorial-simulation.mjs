import assert from 'node:assert/strict';
import { readFile, cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handleBlogPostRequest } from '../functions/_shared/blog-renderer-client.js';
import { handleServiceRequest } from '../functions/_shared/service-renderer.js';
import { onRequest } from '../functions/_middleware.js';
import { schemaForPath } from '../functions/_shared/schema.js';
import { syncEditorialSeo } from '../scripts/sync-editorial-seo.mjs';
const source = path.resolve(import.meta.dirname, '..');
const originalFetch = globalThis.fetch;
let checks = 0;
try {
  for (const [body, status, expected] of [[[],200,404], [[{slug:'publicado',status:'publish'}],200,200], [[{slug:'publicado',status:'draft'}],200,503], [{error:true},200,503], [[],500,503]]) {
    globalThis.fetch = async () => Response.json(body, {status});
    const response = await handleBlogPostRequest({params:{slug:'publicado'}});
    assert.equal(response.status, expected); checks++;
  }
  for (const mode of ['html', 'json', 'network', 'timeout']) {
    globalThis.fetch = async () => { if (mode === 'network' || mode === 'timeout') throw new Error(mode); return new Response(mode === 'json' ? '{bad' : '<html>', {headers:{'content-type': mode === 'json' ? 'application/json' : 'text/html'}}); };
    assert.equal((await handleBlogPostRequest({params:{slug:'publicado'}})).status, 503); checks++;
  }
  for (const slug of ['a/b','../publicado','page','']) {
    globalThis.fetch = () => { throw new Error('Must not fetch invalid slug'); };
    assert.equal((await handleBlogPostRequest({params:{slug}})).status,404); checks++;
  }
  for (const slug of ['cimientos-digitales','el-pregonero','gracia-y-presencia','el-empujon']) {
    const request = new Request(`https://agenciaconsalero.es/el-menu/${slug}/`);
    const response = await onRequest({request,next:()=>handleServiceRequest({params:{slug}})});
    const html = await response.text(), scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(response.status,200); assert.equal(scripts.length,1);
    const nodes = JSON.parse(scripts[0][1])['@graph'], url = `https://agenciaconsalero.es/el-menu/${slug}/`;
    for (const type of ['WebPage','Service','Organization','WebSite','BreadcrumbList']) assert.equal(nodes.filter(n=>[].concat(n['@type']).includes(type)).length,1);
    assert.equal(nodes.find(n=>n['@type']==='WebPage').mainEntity['@id'], `${url}#service`);
    assert.equal(nodes.find(n=>n['@type']==='Service').provider['@id'],'https://agenciaconsalero.es/#organization'); checks++;
  }
  for (const pathname of ['/', '/el-menu/el-pregonero/', '/sectores/marketing-para-almazaras-aceite/']) assert.doesNotMatch(JSON.stringify(schemaForPath(pathname)), /"(?:HomePage|ServicePage)"|salero.webagencia360.com/);
  for (const status of [404,410,502,503]) {
    const html = '<html><head><title>Error</title></head><body>Error</body></html>';
    const response = await onRequest({request:new Request('https://agenciaconsalero.es/el-menu/el-pregonero/'),next:async()=>new Response(html,{status,headers:{'content-type':'text/html'}})});
    assert.equal(response.status,status); assert.equal(await response.text(),html); checks++;
  }
} finally { globalThis.fetch = originalFetch; }
const root = await mkdtemp(path.join(tmpdir(),'salero-seo-test-'));
const item = (id,slug) => ({id,slug,status:'publish',date:'2026-06-01T12:00:00',title:{rendered:slug},excerpt:{rendered:'<p>Texto</p>'},acf:{}});
const data = {servicios:[],sectores:[],'casos-exito':[item(140,'140'), item(157,'enoro')], posts:[item(326,'seo-moron-de-la-frontera')]};
const rest = async url => {const items = data[new URL(url).pathname.split('/').at(-1)];return Response.json(items,{headers:{'X-WP-Total':`${items.length}`,'X-WP-TotalPages':`${Math.ceil(items.length/100)}`}});};
try {
  for (const name of ['index.html','assets/js','el-menu','sectores','casos-de-exito','la-rebotica']) await cp(path.join(source,name),path.join(root,name),{recursive:true});
  await syncEditorialSeo({root,write:true,fetchOptions:{fetchImpl:rest}});
  const before = await readFile(path.join(root,'la-rebotica/index.html'),'utf8');
  assert.ok(before.includes('seo-moron-de-la-frontera'));
  const sitemap = await readFile(path.join(root,'sitemap.xml'),'utf8');
  assert.ok(sitemap.includes('/casos-de-exito/140/')); assert.ok(sitemap.includes('/casos-de-exito/enoro/')); assert.ok(!sitemap.includes('gestamp-digital-summit')); checks++;
  assert.deepEqual((await syncEditorialSeo({root,fetchOptions:{fetchImpl:rest}})).updated,[]); checks++;
  await writeFile(path.join(root,'la-rebotica/index.html'),before.replace('seo-moron-de-la-frontera','desincronizado'));
  await assert.rejects(syncEditorialSeo({root,fetchOptions:{fetchImpl:rest}}),/out of sync/); checks++;
  await writeFile(path.join(root,'la-rebotica/index.html'),before);
  let reads=0;
  await assert.rejects(syncEditorialSeo({root,write:true,fetchOptions:{fetchImpl:async url=>{reads++; if(reads===5)data.posts[0].title.rendered='Cambio concurrente';return rest(url);}}}),/CMS changed/);
  assert.equal(await readFile(path.join(root,'la-rebotica/index.html'),'utf8'),before);
  assert.equal(await readFile(path.join(root,'sitemap.xml'),'utf8'),sitemap); checks++;
  data.posts[0].status='draft';
  await assert.rejects(syncEditorialSeo({root,write:true,fetchOptions:{fetchImpl:rest}}),/non-public/); checks++;
} finally { await rm(root,{recursive:true,force:true}); }
console.log(`SEO/editorial: ${checks} checks passed`);
