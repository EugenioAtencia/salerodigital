import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildSnapshotArtifacts } from '../scripts/lib/editorial-snapshot-artifacts.mjs';
import { applyStagingPreview } from '../scripts/lib/editorial-staging-preview.mjs';
import { signSnapshot, sha256 } from '../scripts/lib/editorial-push-snapshot.mjs';
import { validatePagesWorkerUpload } from '../scripts/lib/editorial-pages-worker-validation.mjs';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(new URL('../integrations/cloudflare/push-staging/package.json', import.meta.url));
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
const key = 'offline-test-not-a-real-credential', codeSha = 'a'.repeat(40), revision = 'b'.repeat(64);
const collections = { servicios: [], sectores: [], 'casos-exito': [], posts: [{ id: 1, slug: 'posts-0', status: 'publish', date: '2026-06-01T12:00:00', title: { rendered: 'Preview article' }, excerpt: { rendered: '<p>Preview description</p>' }, content: { rendered: '<p>Complete offline content.</p>' }, acf: {} }] };
const counts = Object.fromEntries(Object.entries(collections).map(([name, items]) => [name, items.length]));
const body = JSON.stringify({ formatVersion: 1, revision, counts, collections }), hash = sha256(body);
const packet = signSnapshot({ formatVersion: 1, revision, counts, body, sha256: hash, snapshotId: `sha256:${hash}`, bytes: Buffer.byteLength(body) }, 1, 'preview-batch', key);
const lease = { ...packet, jobId: 'preview-test', codeSha, phase: 'building' };
const dir = await mkdtemp(path.join(os.tmpdir(), 'salero-preview-policy-'));
let mf;
try {
  const build = output => ({ root, output, packet, key, jobId: 'preview-test', check: async () => lease, codeSha, tests: 'passed', scope: 'rebotica' });
  const production = path.join(dir, 'production');
  await buildSnapshotArtifacts({ ...build(production), branch: 'main' });
  assert.equal(await readFile(production + '/functions/_middleware.js', 'utf8'), await readFile(root + '/functions/_middleware.js', 'utf8'));
  assert.equal(await applyStagingPreview(production, { scope: 'all', branch: 'codex/rebotica-editorial-staging' }), false);
  console.log('PASS production and unrelated build scopes keep original middleware');

  const site = path.join(dir, 'staging');
  const { receipt } = await buildSnapshotArtifacts({ ...build(site), branch: 'codex/rebotica-editorial-staging' });
  for (const [file, expected] of Object.entries(receipt.pages)) assert.equal(sha256(await readFile(site + '/' + file)), expected);
  assert.equal(await readFile(site + '/nuestros-menus/index.html', 'utf8'), await readFile(root + '/nuestros-menus/index.html', 'utf8'));
  console.log('PASS staging preserves certified HTML hashes and noneditorial page files');
  const compiled = spawnSync(process.execPath, [root + '/integrations/cloudflare/push-staging/node_modules/wrangler/bin/wrangler.js', 'pages', 'functions', 'build', site + '/functions', '--outfile', site + '/_worker.js', '--build-output-directory', site, '--output-routes-path', site + '/_routes.json', '--compatibility-date', '2026-10-07'], { cwd: dir, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  assert.equal(compiled.status, 0, compiled.stderr);
  const decoded = await validatePagesWorkerUpload(await readFile(site + '/_worker.js'));
  assert.equal(decoded.field, '_worker.bundle'); assert.equal(decoded.modules.length, 1);
  const asset = async request => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/legacy-tracking/') return new Response('<html><head><title>Legacy</title><script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script></head><body><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TEST"></iframe></noscript></body></html>', { headers: { 'Content-Type': 'text/html' } });
    let name = pathname.slice(1); if (!name || name.endsWith('/')) name += 'index.html';
    try { return new Response(await readFile(site + '/' + name), { headers: { 'Content-Type': name.endsWith('.json') ? 'application/json' : name.endsWith('.html') ? 'text/html' : 'application/octet-stream' } }); }
    catch { return new Response('Missing', { status: 404 }); }
  };
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: decoded.modules[0].content, compatibilityDate: '2026-10-07', serviceBindings: { ASSETS: asset }, outboundService: () => { throw Error('unexpected_network'); } }));
  for (const origin of ['https://1234abcd.salerodigital-staging.pages.dev', 'https://codex-rebotica-editorial-staging.salerodigital-staging.pages.dev']) {
    const response = await mf.dispatchFetch(origin + '/la-rebotica/posts-0/'), html = await response.text();
    assert.equal(response.status, 200); assert.equal(response.headers.get('x-salero-render'), 'snapshot-asset');
    assert.match(response.headers.get('x-robots-tag'), /noindex/); assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert(html.includes(`rel="canonical" href="${origin}/la-rebotica/posts-0/"`));
    assert.match(html, /Complete offline content/); assert.doesNotMatch(html, /googletagmanager|google-analytics|GTM-WSLMDJ8N|blog-article-client\.js/);
    for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { const graph = JSON.parse(match[1]); assert(!JSON.stringify(graph).includes('https://agenciaconsalero.es')); assert(JSON.stringify(graph).includes(origin)); }
  }
  console.log('PASS immutable and branch previews serve initial article, staging canonical/schema, noindex, no analytics');
  const legacy = await mf.dispatchFetch('https://1234abcd.salerodigital-staging.pages.dev/legacy-tracking/');
  assert.doesNotMatch(await legacy.text(), /googletagmanager|google-analytics/);
  const missing = await mf.dispatchFetch('https://1234abcd.salerodigital-staging.pages.dev/missing.txt');
  assert.equal(missing.status, 404); assert.match(missing.headers.get('x-robots-tag'), /noindex/);
  const wrongHost = await mf.dispatchFetch('https://agenciaconsalero.es/la-rebotica/posts-0/'); assert.equal(wrongHost.status, 503);
  console.log('PASS embedded legacy tracking removed, non-HTML noindex and staging artifact refuses production host');
  console.log('PASS staging policy; remote calls=0, deployments=0');
} finally { if (mf) await mf.dispose(); await rm(dir, { recursive: true, force: true }); }
