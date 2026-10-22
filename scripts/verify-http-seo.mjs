import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/verify-http-seo.mjs http://127.0.0.1:8799');
const get = pathname => fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
const sitemap = await get('/sitemap.xml');
assert.equal(sitemap.status, 200);
const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.ok(urls.length > 0); assert.equal(new Set(urls).size, urls.length);
let checks = 0;
for (const url of urls) {
  const pathname = new URL(url).pathname, response = await get(pathname), html = await response.text();
  assert.equal(response.status, 200, `${pathname}: expected published page`);
  assert.ok(html.includes(`rel="canonical" href="${url}"`), `${pathname}: canonical changed`);
  const graphs = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  for (const graph of graphs) assert.doesNotMatch(JSON.stringify(graph), /"(?:HomePage|ServicePage)"/);
  if (/^\/el-menu\/[^/]+\/$/.test(pathname)) {
    assert.equal(graphs.length, 1, `${pathname}: duplicate graph`);
    const nodes = graphs[0]['@graph'];
    for (const type of ['WebPage','Service','Organization','WebSite','BreadcrumbList']) assert.equal(nodes.filter(n => [].concat(n['@type']).includes(type)).length, 1);
    assert.equal(nodes.find(n => n['@type'] === 'WebPage').mainEntity['@id'], `${url}#service`);
  }
  console.log(`PASS 200 canonical/schema ${pathname}`); checks++;
}
for (const pathname of ['/no-existe-seo-probe/', '/el-menu/no-existe-seo-probe/', '/la-rebotica/no-existe-seo-probe/', '/casos-de-exito/no-existe-seo-probe/', '/sectores/no-existe-seo-probe/', '/la-rebotica/page/999/', '/el-menu/no-existe/otra/']) {
  const response = await get(pathname), html = await response.text();
  assert.equal(response.status, 404, pathname);
  assert.doesNotMatch(html, /application\/ld\+json|rel="canonical"/);
  console.log(`PASS 404 ${pathname}`); checks++;
}
for (const slug of ['el-pellizco', 'media-racion', 'menu-degustacion']) {
  const response = await get(`/nuestros-menus/${slug}/`);
  assert.equal(response.status, 301); assert.equal(response.headers.get('location'), 'https://agenciaconsalero.es/nuestros-menus/'); checks++;
}
console.log(`HTTP/SEO: ${checks} checks passed`);
