import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generate } from './generate-collections-ssg.mjs';
import { readEditorialRevision } from './lib/editorial-revision.mjs';
import { API_BASE, ENDPOINTS, fetchCollections } from './lib/cms-collections.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');


// Fixed diagnostics: never print exception messages, URLs, bodies or credentials.
function diagnostic(error, stage, collection) {
  if (error.revisionDiagnostic) return { stage, code: 'revision-invalid', collection, reason: 'Revision validation failed', ...error.revisionDiagnostic };
  const message = String(error.message || '');
  const rules = [
    [/HTTP (\d{3})/, 'cms-http', match => `HTTP ${match[1]}`],
    [/non-JSON|expected array|Unexpected token|JSON/, 'cms-invalid-json', () => 'Invalid JSON response'],
    [/partial|incomplete/, 'cms-partial', () => 'Incomplete collection'],
    [/duplicate/i, 'cms-duplicate', () => 'Duplicate slug or ID'],
    [/pagination|X-WP-Total/, 'cms-pagination', () => 'Invalid pagination headers or totals'],
    [/CMS changed/, 'snapshot-changed', () => 'CMS snapshots differ'],
    [/revision/, 'revision-invalid', () => 'Revision missing, changed or edit in progress'],
    [/Invalid generated|renderer|container|schema/i, 'render-invalid', () => 'Generated document validation failed'],
    [/Critical test/, 'test-failed', () => 'Critical test exited nonzero'],
  ];
  if (error.name === 'AbortError' || error.name === 'TimeoutError' || /timeout/i.test(message) || /TIMEOUT/.test(error.cause?.code || ''))
    return { stage, code: 'cms-timeout', collection, reason: 'CMS request timed out' };
  if (message === 'fetch failed') return { stage, code: 'cms-network', collection, reason: 'CMS connection failed' };
  for (const [pattern, code, reason] of rules) { const match = message.match(pattern); if (match) return { stage, code, collection, reason: reason(match) }; }
  return { stage, code: 'build-error', collection, reason: 'Required build operation failed' };
}

export async function build({ root = process.cwd(), apiBase = API_BASE, fetchImpl = fetch, timeoutMs = 15000,
  snapshotCheck = false, runTests = true, revisionUrl = `${apiBase.replace('/wp/v2', '')}/salero-pages/v1/revision` } = {}) {
  let stage = 'tests', collection = null;
  const phase = (value, data = {}) => { stage = value; collection = null; console.log(JSON.stringify({ phase: value, ...data })); };
  phase('pipeline-start', { node: process.version, mode: snapshotCheck ? '2A-snapshot-check' : 'revision-guarded' });
  try {
  // Unique cache key for every read, including revision reads. Not a CORS change.
  const freshFetch = (url, options) => {
    const fresh = new URL(url);
    collection = ENDPOINTS.includes(fresh.pathname.split('/').at(-1)) ? fresh.pathname.split('/').at(-1) : null; fresh.searchParams.set('_salero_build', randomUUID());
    return fetchImpl(fresh, options);
  };
  const options = { apiBase, fetchImpl: freshFetch, timeoutMs };
  const readRevision = () => readEditorialRevision(revisionUrl, { fetchImpl: freshFetch, timeoutMs,
    onRead: metadata => console.log(JSON.stringify({ phase: 'revision-read', stage, ...metadata })) });
  if (runTests) {
    for (const name of ['sector-ssg-generator', 'collections-ssg', 'fetch-json', 'casos-cms-source-of-truth', 'static-menu-packs']) {
      phase('tests', { test: name, status: 'start' });
      const result = spawnSync(process.execPath, [`tests/${name}-simulation.mjs`], { cwd: root, stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Critical test failed: ${name}`);
      console.log(JSON.stringify({ phase: 'test-passed', test: name }));
    }
  }
  phase('revision-before');
  const revision = snapshotCheck ? null : await readRevision();
  let contentHash;
  const result = await generate({ root, fetchOptions: options, onStage: (value, data) => {
    if (value === 'ssg-generation') console.log(JSON.stringify({ phase: 'cms-read-1-complete', ...data }));
    phase(value, data);
  }, beforeWrite: async ({ collections, output }) => {
    contentHash = digest(collections);
    // A second complete validation catches changes without a revision endpoint
    // in 2A. 2B additionally requires the server epoch before/after both reads.
    phase('cms-read-2');
    const second = await fetchCollections(options);
    console.log(JSON.stringify({ phase: 'cms-read-2-complete', counts: Object.fromEntries(ENDPOINTS.map(key => [key, second[key].length])) }));
    phase('snapshot-comparison', { counts: Object.fromEntries(ENDPOINTS.map(key => [key, second[key].length])) });
    if (digest(second) !== contentHash) throw new Error('CMS changed during build');
    console.log(JSON.stringify({ phase: 'snapshot-consistent', contentHash }));
    phase('validation');
    if (!snapshotCheck && await readRevision() !== revision) throw new Error('Editorial revision changed during build');
    const home = output.get('index.html');
    if (!home?.includes('data-home-servicios data-ssg="collections"') || /Cargando servicios|Cargando sectores/.test(home)) throw new Error('Invalid generated Home');
    for (const [file, html] of output) {
      if (file !== 'index.html' && (html.match(/id="salero-schema-graph"/g) || []).length !== 1) throw new Error('Invalid generated graph');
    }
  } });
  // Final check also guards a CMS change during local output writes. Any failure
  // exits nonzero: this build directory is disposable and must never be promoted.
  phase('revision-final');
  if (!snapshotCheck && await readRevision() !== revision) throw new Error('Editorial revision changed after rendering');
  phase('receipt');
  await writeFile(path.join(root, 'salero-build.json'), JSON.stringify({ version: 1, revision, contentHash,
    commit: process.env.CF_PAGES_COMMIT_SHA || null, branch: process.env.CF_PAGES_BRANCH || null,
    generatedAt: new Date().toISOString(), counts: result.counts, tests: runTests ? 'passed' : 'skipped', snapshotConsistent: true, buildSuccess: true, mode: snapshotCheck ? '2A-snapshot-check' : 'revision-guarded' }) + '\n');
  console.log(JSON.stringify({ phase: 'editorial-build-complete', ...result, revision, contentHash, exitCode: 0 }));
  return result;
  } catch (error) {
    error.editorialDiagnostic = diagnostic(error, stage, collection);
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), at = flag => args.indexOf(flag);
  build({ root: at('--root') < 0 ? process.cwd() : args[at('--root') + 1], snapshotCheck: args.includes('--snapshot-check') })
    .catch(error => { console.error(JSON.stringify({ phase: 'editorial-build-failed', ...(error.editorialDiagnostic || { code: 'build-error' }), exitCode: 1 })); console.error('Editorial build failed; deployment must not be promoted.'); process.exitCode = 1; });
}
