import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/_middleware.js';
import { handleServiceRequest } from '../functions/_shared/service-renderer.js';
import { schemaForPath } from '../functions/_shared/schema.js';
import { renderSitemap } from '../functions/_shared/sitemap-renderer.js';

let checks = 0;
const originalFetch = globalThis.fetch;
const headers = { 'Content-Type': 'text/html; charset=utf-8' };
const graph = html => JSON.parse(html.match(/<script id="salero-schema-graph"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
try {
  const errorHtml = await readFile(new URL('../404.html', import.meta.url), 'utf8');
  assert.match(errorHtml, /name="robots" content="noindex, follow"/); checks++;
  assert.doesNotMatch(errorHtml, /rel="canonical"/); checks++;
  const notFound = await onRequest({ request: new Request('https://agenciaconsalero.es/no-existe/'), next: () => new Response(errorHtml, { status: 404, headers }) });
  assert.equal(notFound.status, 404); checks++;
  assert.equal(notFound.headers.get('X-Robots-Tag'), 'noindex'); checks++;
  assert.doesNotMatch(await notFound.text(), /salero-schema-graph/); checks++;

  globalThis.fetch = async () => json([]);
  const missingArticle = await onRequest({ request: new Request('https://agenciaconsalero.es/la-rebotica/no-existe/'), next: () => { throw new Error('Must not fall back to client shell'); } });
  assert.equal(missingArticle.status, 404); checks++;
  assert.equal(missingArticle.headers.get('X-Robots-Tag'), 'noindex'); checks++;
  assert.doesNotMatch(await missingArticle.text(), /Cargando artículo/); checks++;
  globalThis.fetch = async () => { throw new Error('CMS unavailable'); };
  const unavailable = await onRequest({ request: new Request('https://agenciaconsalero.es/la-rebotica/articulo/'), next: () => { throw new Error('Must not mask CMS outage'); } });
  assert.equal(unavailable.status, 502); checks++;
  assert.equal(unavailable.headers.get('X-Robots-Tag'), 'noindex'); checks++;

  const post = { id: 123, slug: 'articulo', title: { rendered: 'Artículo de prueba' }, excerpt: { rendered: '<p>Resumen actualizado.</p>' }, content: { rendered: '<h2>Respuesta</h2><p>Contenido desde WordPress.</p>' }, date: '2026-10-08T10:00:00', modified: '2026-10-21T18:18:19', categories: [] };
  globalThis.fetch = async url => json(new URL(url).searchParams.get('slug') ? [post] : []);
  const article = await onRequest({ request: new Request('https://agenciaconsalero.es/la-rebotica/articulo/'), next: () => { throw new Error('SSR expected'); } });
  const articleHtml = await article.text();
  assert.equal(article.status, 200); checks++;
  assert.match(articleHtml, /Contenido desde WordPress/); checks++;
  assert.match(articleHtml, /rel="canonical" href="https:\/\/agenciaconsalero.es\/la-rebotica\/articulo\/"/); checks++;
  assert.equal(graph(articleHtml).find(node => node['@type'] === 'BlogPosting').dateModified, post.modified); checks++;

  assert.ok(schemaForPath('/')['@graph'].some(node => node['@type'] === 'WebPage')); checks++;
  for (const slug of ['cimientos-digitales', 'el-pregonero', 'gracia-y-presencia', 'el-empujon']) {
    const request = new Request(`https://agenciaconsalero.es/el-menu/${slug}/`);
    const response = await onRequest({ request, next: () => handleServiceRequest({ params: { slug } }) });
    const html = await response.text(), nodes = graph(html);
    assert.equal(response.status, 200); checks++;
    assert.equal((html.match(/type="application\/ld\+json"/g) || []).length, 1); checks++;
    assert.ok(nodes.some(node => node['@type'] === 'WebPage')); checks++;
    assert.ok(nodes.some(node => node['@type'] === 'Service')); checks++;
    assert.equal(new Set(nodes.map(node => node['@id'])).size, nodes.length); checks++;
    assert.doesNotMatch(html, /"@type":"(?:HomePage|ServicePage)"/); checks++;
  }

  const baseXml = '<?xml version="1.0"?><urlset><url><loc>https://agenciaconsalero.es/</loc></url><url><loc>https://agenciaconsalero.es/casos-de-exito/retirado/</loc></url></urlset>';
  globalThis.fetch = async url => json(new URL(url).pathname.endsWith('/posts') ? [{ slug: 'articulo', modified_gmt: '2026-10-21T18:00:00' }] : [{ slug: 'enoro', modified_gmt: '2026-10-22T09:00:00' }, { slug: 'muebles-sarria', modified_gmt: '2026-10-21T18:00:00' }]);
  const sitemap = await renderSitemap({ next: () => new Response(baseXml, { headers: { 'Content-Type': 'application/xml' } }) });
  const xml = await sitemap.text();
  assert.equal(sitemap.status, 200); checks++;
  for (const path of ['/la-rebotica/articulo/', '/casos-de-exito/enoro/', '/casos-de-exito/muebles-sarria/']) { assert.ok(xml.includes(`https://agenciaconsalero.es${path}`)); checks++; }
  assert.doesNotMatch(xml, /retirado/); checks++;
  assert.match(xml, /<lastmod>2026-10-22<\/lastmod>/); checks++;
  globalThis.fetch = async () => new Response('CMS unavailable', { status: 503 });
  let fallbackReads = 0;
  const fallback = await renderSitemap({ next: () => { fallbackReads++; return new Response(baseXml); } });
  assert.equal(await fallback.text(), baseXml); checks++;
  assert.equal(fallbackReads, 1); checks++;
} finally { globalThis.fetch = originalFetch; }
console.log(`PASS: SEO HTTP/editorial — ${checks} checks`);
