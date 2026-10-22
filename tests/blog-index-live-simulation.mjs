import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleBlogIndexRequest } from '../functions/_shared/blog-index-renderer.js';

const template = await readFile(new URL('../la-rebotica/index.html', import.meta.url), 'utf8');
const originalFetch = globalThis.fetch;
const post = index => ({ id: index + 1, slug: `articulo-${index + 1}`, status: 'publish', date: '2026-10-22T09:00:00', title: { rendered: `Título actualizado ${index + 1}` }, excerpt: { rendered: `<p>Extracto actual de WordPress ${index + 1}.</p>` }, _embedded: { 'wp:term': [[{ id: 3, name: 'SEO local', slug: 'seo-local' }]] } });
const context = page => ({ request: new Request(`https://agenciaconsalero.es${page === 1 ? '/la-rebotica/' : `/la-rebotica/page/${page}/`}`), next: async () => new Response(template, { headers: { 'Content-Type': 'text/html', ETag: 'old-snapshot' } }), env: { ASSETS: { fetch: async () => new Response(template) } } });
const cms = items => async (url, options) => {
  assert.ok(new URL(url).searchParams.get('_t'));
  assert.equal(options.headers['User-Agent'], 'SaleroDigital-Cloudflare-Blog-SSR');
  assert.equal(options.cf.cacheTtl, 0);
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(items.length), 'X-WP-TotalPages': String(Math.ceil(items.length / 100)) } });
};
const payload = html => JSON.parse(html.match(/<script id="salero-blog-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const schema = html => JSON.parse(html.match(/<script id="salero-schema-graph"[^>]*>([\s\S]*?)<\/script>/)[1]);
try {
  // Publishing/updating a record replaces the deployed snapshot, including schema and client data.
  globalThis.fetch = cms([post(0)]);
  let response = await handleBlogIndexRequest(context(1)), html = await response.text();
  assert.equal(response.status, 200); assert.equal(response.headers.get('X-Salero-Editorial'), 'wordpress-live');
  assert.equal(response.headers.get('ETag'), null); assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.match(html, /Extracto actual de WordPress 1/);
  assert.equal(payload(html).posts[0].slug, 'articulo-1');
  assert.equal(schema(html)['@graph'].find(node => node['@type'] === 'ItemList').itemListElement[0].name, 'Título actualizado 1');
  assert.doesNotMatch(html, /SEO en Morón de la Frontera: cómo conseguir más visibilidad/);

  // Newly created pagination works without new files/deploys; nonexistent pages stay 404.
  globalThis.fetch = cms(Array.from({ length: 13 }, (_, i) => post(i)));
  response = await handleBlogIndexRequest(context(1)); html = await response.text();
  assert.equal(payload(html).posts.length, 12); assert.match(html, /href="\/la-rebotica\/page\/2\/"/);
  response = await handleBlogIndexRequest(context(2), 2); html = await response.text();
  assert.equal(response.status, 200); assert.equal(payload(html).posts[0].slug, 'articulo-13');
  assert.match(html, /rel="canonical" href="https:\/\/agenciaconsalero.es\/la-rebotica\/page\/2\/"/);
  response = await handleBlogIndexRequest(context(3), 3);
  assert.equal(response.status, 404); assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');

  // A genuinely empty collection removes old cards; an unavailable CMS preserves the first page.
  globalThis.fetch = cms([]);
  response = await handleBlogIndexRequest(context(1)); html = await response.text();
  assert.equal(payload(html).posts.length, 0); assert.match(html, /Todavía no hay artículos publicados/);
  globalThis.fetch = async () => new Response('CMS unavailable', { status: 503 });
  response = await handleBlogIndexRequest(context(1));
  assert.equal(response.status, 200); assert.equal(response.headers.get('X-Salero-Editorial'), 'snapshot-fallback'); assert.equal(await response.text(), template);
  response = await handleBlogIndexRequest(context(2), 2); assert.equal(response.status, 503);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: blog listing updates, withdrawals, pagination, empty CMS and outage fallback');
