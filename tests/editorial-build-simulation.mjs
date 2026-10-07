import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from '../scripts/build-editorial-ssg.mjs';
const source = path.resolve(import.meta.dirname, '..');
const root = await mkdtemp(path.join(tmpdir(), 'salero-editorial-test-'));
let checks = 0;
const item = (id, type) => ({ id, slug: `${type}-${id}`, status: 'publish', date: '2026-06-01T00:00:00', title: { rendered: `${type} ${id}` }, excerpt: { rendered: '<p>Editorial</p>' }, acf: {} });
const data = Object.fromEntries(['servicios', 'sectores', 'casos-exito', 'posts'].map(type => [type, [item(1, type)]]));
function response(value, total = value.length) { return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'X-WP-Total': `${total}`, 'X-WP-TotalPages': `${Math.ceil(total / 100)}` } }); }
function rest(collections = data) { return async url => new URL(url).pathname.endsWith('/revision') ? response({ revision: 'a'.repeat(64), editing: false }, 0) : response(collections[new URL(url).pathname.split('/').at(-1)]); }
try {
  for (const name of ['assets/js', 'functions', 'scripts', 'tests', 'index.html', 'el-menu', 'sectores', 'casos-de-exito', 'la-rebotica', 'nuestros-menus', '_redirects']) await cp(path.join(source, name), path.join(root, name), { recursive: true });
  const original = await readFile(path.join(root, 'index.html'), 'utf8');
  const scenarios = [
    ['CMS HTTP 500', async () => new Response('error', { status: 500 })],
    ['HTML instead of JSON', async () => new Response('<html>failure</html>', { headers: { 'Content-Type': 'text/html' } })],
    ['partial collection', async () => response([item(1, 'servicio')], 2)],
    ['duplicate slug', async () => response([item(1, 'servicio'), { ...item(2, 'servicio'), slug: 'servicio-1' }])],
    ['timeout', async (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }))],
    ['unconfirmed empty collection', async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })]
  ];
  for (const [name, fetchImpl] of scenarios) {
    await assert.rejects(build({ root, fetchImpl, runTests: false, snapshotCheck: true, timeoutMs: 5 }));
    assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), original);
    console.log(`PASS: ${name}; no output replaced`); checks++;
  }
  let reads = 0;
  await assert.rejects(build({ root, runTests: false, snapshotCheck: true, fetchImpl: async url => {
    reads++; const result = structuredClone(data[new URL(url).pathname.split('/').at(-1)]);
    if (reads > 4) result[0].title.rendered = 'Changed';
    return response(result);
  } }), /CMS changed/); checks++;
  let revisions = 0;
  await assert.rejects(build({ root, runTests: false, fetchImpl: async url => new URL(url).pathname.endsWith('/revision')
    ? response({ revision: (++revisions === 1 ? 'a' : 'b').repeat(64), editing: false }, 0) : rest()(url) }), /revision changed/); checks++;
  await assert.rejects(build({ root, runTests: false, fetchImpl: async () => response({ revision: 'a'.repeat(64), editing: true }, 0) }), /edit in progress/); checks++;
  assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), original);
  await build({ root, runTests: false, fetchImpl: rest() });
  const receipt = JSON.parse(await readFile(path.join(root, 'salero-build.json'), 'utf8'));
  assert.equal(receipt.mode, 'revision-guarded'); assert.equal(receipt.revision, 'a'.repeat(64)); checks++;
  const empty = Object.fromEntries(Object.keys(data).map(type => [type, []]));
  const result = await build({ root, runTests: false, snapshotCheck: true, fetchImpl: rest(empty) });
  assert.ok(Object.values(result.counts).every(count => count === 0)); checks++;
  // Actual CLI failure, not just an exception caught by the test harness.
  await writeFile(path.join(root, 'index.html'), original);
  const preload = path.join(root, 'cms-500.mjs');
  await writeFile(preload, 'globalThis.fetch = async () => new Response("CMS down", {status:500});\n');
  const cli = spawnSync(process.execPath, ['--import', preload, path.join(source, 'scripts/build-editorial-ssg.mjs'), '--root', root, '--snapshot-check'], { encoding: 'utf8' });
  assert.equal(cli.status, 1, cli.stdout + cli.stderr);
  assert.match(cli.stderr, /deployment must not be promoted/);
  assert.match(cli.stdout, /static menu packs simulations passed/);
  assert.match(cli.stdout, /casos cms source-of-truth simulations passed/); checks++;
  console.log(`PASS: editorial build — ${checks} scenarios; failing CLI exit=${cli.status}`);
} finally { await rm(root, { recursive: true, force: true }); }
