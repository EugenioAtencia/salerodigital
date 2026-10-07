import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fetchCollection } from '../scripts/lib/cms-collections.mjs';
import { renderCollections, generate } from '../scripts/generate-collections-ssg.mjs';
import { plain } from '../scripts/lib/collection-renderers.mjs';
import { onRequest } from '../functions/_middleware.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let checks = 0;
const item = (index, prefix = 'post') => ({ id: index + 1, slug: `${prefix}-${index + 1}`, status: 'publish', date: '2026-05-27T08:54:36', title: { rendered: `Título ${index + 1} &amp; Salero` }, excerpt: { rendered: '<p>Texto editorial.</p>' }, acf: {}, _embedded: { 'wp:term': [[{ id: 3, name: 'Marketing local', slug: 'marketing-local' }]], 'wp:featuredmedia': [{ source_url: 'https://cms.webagencia360.com/image.jpg', alt_text: 'Imagen', media_details: {} }] } });
const fixture = count => ({ servicios: Array.from({ length: 4 }, (_, i) => item(i, 'servicio')), sectores: Array.from({ length: 3 }, (_, i) => item(i, 'sector')), 'casos-exito': [item(0, 'muebles-sarria'), item(1, 'enoro')], posts: Array.from({ length: count }, (_, i) => item(i)) });
function response(data, total = data.length, pages = Math.ceil(total / 100), options = {}) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-WP-Total': String(total), 'X-WP-TotalPages': String(pages) }, ...options });
}
function rest(data) {
  return async url => { const parsed = new URL(url), list = data[parsed.pathname.split('/').at(-1)], page = Number(parsed.searchParams.get('page')), size = Number(parsed.searchParams.get('per_page')); return response(list.slice((page - 1) * size, page * size), list.length, Math.ceil(list.length / size)); };
}
const schema = html => JSON.parse(html.match(/<script id="salero-schema-graph"[^>]*>([\s\S]*?)<\/script>/)[1]);
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]);

assert.equal((await fetchCollection('posts', { fetchImpl: rest(fixture(200)) })).length, 200); checks++;
assert.deepEqual(await fetchCollection('posts', { fetchImpl: async () => response([], 0, 0) }), []); checks++;
for (const status of [403, 404, 500, 503]) { await assert.rejects(fetchCollection('posts', { fetchImpl: async () => response([], 0, 0, { status }) }), /HTTP/); checks++; }
for (const bad of [new Response('<html>CMS error</html>', { headers: { 'Content-Type': 'text/html' } }), new Response('{bad', { headers: { 'Content-Type': 'application/json' } }), response({ error: true }), new Response('[]', { headers: { 'Content-Type': 'application/json' } }), response([item(0)], 2), response([], 0, 1), response([item(0), item(0)], 2)]) {
  await assert.rejects(fetchCollection('posts', { fetchImpl: async () => bad.clone() })); checks++;
}
await assert.rejects(fetchCollection('posts', { timeoutMs: 5, fetchImpl: async (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')))) }), /timeout/); checks++;
await assert.rejects(fetchCollection('posts', { fetchImpl: async url => Number(new URL(url).searchParams.get('page')) === 1 ? response(fixture(101).posts.slice(0, 100), 101, 2) : response([item(100)], 102, 2) }), /changed/); checks++;
for (const invalid of [{ ...item(0), slug: '../escape' }, { ...item(0), title: {} }, { ...item(0), date: 'invalid' }, { ...item(0), status: 'draft' }]) { await assert.rejects(fetchCollection('posts', { fetchImpl: async () => response([invalid]) })); checks++; }

for (const [count, pages] of [[0, 1], [12, 1], [13, 2], [20, 2], [50, 5], [200, 17]]) {
  const data = fixture(count), output = await renderCollections(root, data);
  assert.equal(output.size, pages + 4);
  const home = output.get('index.html');
  assert.equal((home.match(/<article class="service-row"/g) || []).length, 4);
  assert.equal((home.match(/<article class="sector-card"/g) || []).length, 3);
  assert.doesNotMatch(home, /Cargando servicios|Cargando sectores|Failed to fetch/);
  for (const [endpoint, base] of [['servicios', 'el-menu'], ['sectores', 'sectores']]) {
    for (const entry of data[endpoint]) assert.equal(links(home).filter(link => link === `/${base}/${entry.slug}/`).length, 1);
  }
  // Execute the full Home script as the dynamic browser would, with the same data.
  // Its resulting markup must be byte-identical to the generated block content.
  const nodes = Object.fromEntries(['servicios', 'sectores'].map(endpoint => [`[data-home-${endpoint}]`, { dataset: {}, innerHTML: '' }]));
  let ready, fetches = 0;
  const errors = [];
  const client = vm.createContext({ URL, console: { warn: (...args) => errors.push(args), error: (...args) => errors.push(args) }, document: {
    querySelector: selector => nodes[selector], addEventListener: (_, handler) => { ready = handler; },
    createElement: () => ({ innerHTML: '', get textContent() { return plain(this.innerHTML); } })
  }, window: { location: { origin: 'https://agenciaconsalero.es' }, saleroFetchJson: async url => { fetches++; return data[new URL(url).pathname.split('/').at(-1)]; } } });
  vm.runInContext(await readFile(path.join(root, 'assets/js/home.js'), 'utf8'), client);
  ready();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetches, 2);
  for (const endpoint of ['servicios', 'sectores']) {
    assert.ok(home.includes(`data-home-${endpoint} data-ssg="collections">${nodes[`[data-home-${endpoint}]`].innerHTML}</div>`));
    nodes[`[data-home-${endpoint}]`].dataset.ssg = 'collections';
  }
  const beforeHome = Object.values(nodes).map(node => node.innerHTML);
  client.window.saleroFetchJson = () => { fetches++; throw new Error('Failed to fetch'); };
  ready(); ready();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetches, 2);
  assert.deepEqual(Object.values(nodes).map(node => node.innerHTML), beforeHome);
  assert.equal(errors.length, 0); checks++;
  for (let page = 1; page <= pages; page++) {
    const file = page === 1 ? 'la-rebotica/index.html' : `la-rebotica/page/${page}/index.html`, html = output.get(file), expected = Math.min(12, Math.max(0, count - (page - 1) * 12));
    assert.equal((html.match(/<article class="rb-post-card/g) || []).length, expected);
    assert.doesNotMatch(html, /Cargando artículos/);
    if (page > 1) { assert.match(html, new RegExp(`rel="canonical" href="https://agenciaconsalero.es/la-rebotica/page/${page}/"`)); assert.match(html, /rel="prev"/); }
    if (page < pages) assert.ok(links(html).includes(`/la-rebotica/page/${page + 1}/`));
    const list = schema(html)['@graph'].find(node => node['@type'] === 'ItemList');
    assert.equal(list.itemListElement.length, expected);
    for (const entry of list.itemListElement) assert.ok(links(html).includes(new URL(entry.url).pathname));
    // Content and pagination remain after scripts are removed (no JS required).
    const noJs = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.equal((noJs.match(/<article class="rb-post-card/g) || []).length, expected);
    checks++;
  }
  for (const [directory, expected] of [['el-menu', 4], ['sectores', 3], ['casos-de-exito', 2]]) {
    const html = output.get(`${directory}/index.html`);
    assert.equal((html.match(/<article class="(?:card|caso-card)/g) || []).length, expected);
    assert.doesNotMatch(html, /Cargando|Gestamp|fundacion-once/);
    const list = schema(html)['@graph'].find(node => node['@type'] === 'ItemList');
    assert.equal(list.itemListElement.length, expected);
    for (const entry of list.itemListElement) assert.ok(links(html).includes(new URL(entry.url).pathname));
    const transformed = await onRequest({ request: new Request(`https://agenciaconsalero.es/${directory}/`), next: async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }) });
    const served = await transformed.text();
    assert.equal((served.match(/id="salero-schema-graph"/g) || []).length, 1);
    assert.deepEqual(schema(served), schema(html)); checks++;
  }
}

// A late CMS failure cannot change even the first valid output file.
const temporary = await mkdtemp(path.join(tmpdir(), 'salero-collections-'));
try {
  await cp(path.join(root, 'index.html'), path.join(temporary, 'index.html'));
  for (const directory of ['assets/js', 'el-menu', 'sectores', 'casos-de-exito', 'la-rebotica']) await cp(path.join(root, directory), path.join(temporary, directory), { recursive: true });
  const valid = await generate({ root: temporary, fetchOptions: { fetchImpl: rest(fixture(20)) } });
  const before = await Promise.all(valid.files.map(file => readFile(path.join(temporary, file), 'utf8')));
  const fetchOk = rest(fixture(20));
  await assert.rejects(generate({ root: temporary, fetchOptions: { fetchImpl: url => new URL(url).pathname.endsWith('/posts') ? Promise.resolve(response([], 0, 0, { status: 500 })) : fetchOk(url) } }));
  assert.deepEqual(await Promise.all(valid.files.map(file => readFile(path.join(temporary, file), 'utf8'))), before); checks++;
  await generate({ root: temporary, fetchOptions: { fetchImpl: rest(fixture(20)) } });
  assert.deepEqual(await Promise.all(valid.files.map(file => readFile(path.join(temporary, file), 'utf8'))), before); checks++;
  await generate({ root: temporary, fetchOptions: { fetchImpl: rest(fixture(12)) } });
  await assert.rejects(readFile(path.join(temporary, 'la-rebotica/page/2/index.html')), /ENOENT/); checks++;
} finally { await rm(temporary, { recursive: true, force: true }); }

// Execute the actual client entry points: SSG means no CMS call and no replacement.
for (const [file, selector, invoke] of [['collection.js', '[data-collection]', 'renderCollectionPage()'], ['casos-de-exito.js', '[data-casos]', 'renderCasosPage()']]) {
  const element = { dataset: { ssg: 'collections' }, innerHTML: '<article>valid SSG</article>', querySelector: () => null };
  const context = vm.createContext({ document: { querySelector: name => name === selector ? element : null, addEventListener() {} }, getCollection() { throw new Error('CMS must not be called'); } });
  vm.runInContext(await readFile(path.join(root, 'assets/js', file), 'utf8'), context);
  await vm.runInContext(invoke, context);
  assert.equal(element.innerHTML, '<article>valid SSG</article>'); checks++;
}
const cards = { innerHTML: '<article>valid blog SSG</article>' }, status = { classList: { toggle() {} } };
let click;
const button = { hidden: false, href: '/la-rebotica/page/2/', getAttribute: () => '/la-rebotica/page/2/', addEventListener(name, handler) { click = handler; } };
const doc = { querySelector: () => cards, getElementById: id => ({ salero_blog: null, rbPostsStatus: status, rbLoadMore: button, 'salero-blog-data': { textContent: JSON.stringify({ page: 1, totalPages: 2, posts: fixture(12).posts }) } })[id] || null };
const context = vm.createContext({ document: doc, fetch: async () => { throw new Error('CMS unavailable'); }, console });
vm.runInContext(await readFile(path.join(root, 'assets/js/blog.js'), 'utf8'), context);
assert.equal(cards.innerHTML, '<article>valid blog SSG</article>');
await click({ preventDefault() {} });
assert.equal(cards.innerHTML, '<article>valid blog SSG</article>'); assert.equal(button.hidden, false); checks++;

// CLI must propagate failures as nonzero rather than reporting a successful build.
const cli = spawnSync(process.execPath, ['scripts/generate-collections-ssg.mjs', '--root', '/nonexistent-salero-root'], { cwd: root, encoding: 'utf8', timeout: 90000 });
assert.notEqual(cli.status, 0); checks++;
console.log(`collections SSG: ${checks} checks passed (REST, pagination, HTML, schema, middleware, clients, failure preservation)`);
