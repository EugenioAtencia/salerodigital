import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generate } from './generate-collections-ssg.mjs';
import { API_BASE, fetchCollections } from './lib/cms-collections.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export async function build({ root = process.cwd(), apiBase = API_BASE, fetchImpl = fetch, timeoutMs = 15000,
  snapshotCheck = false, runTests = true, revisionUrl = `${apiBase.replace('/wp/v2', '')}/salero-pages/v1/revision` } = {}) {
  // Unique cache key for every read, including revision reads. Not a CORS change.
  const freshFetch = (url, options) => {
    const fresh = new URL(url); fresh.searchParams.set('_salero_build', randomUUID());
    return fetchImpl(fresh, options);
  };
  const options = { apiBase, fetchImpl: freshFetch, timeoutMs };
  const readRevision = async () => {
    const r = await freshFetch(revisionUrl, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw new Error('Editorial revision unavailable');
    const data = await r.json();
    if (!/^[a-f0-9]{64}$/.test(data.revision) || data.editing !== false) throw new Error('Editorial revision invalid or edit in progress');
    return data.revision;
  };
  if (runTests) {
    for (const name of ['sector-ssg-generator', 'collections-ssg', 'fetch-json', 'casos-cms-source-of-truth', 'static-menu-packs']) {
      const result = spawnSync(process.execPath, [`tests/${name}-simulation.mjs`], { cwd: root, stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Critical test failed: ${name}`);
    }
  }
  const revision = snapshotCheck ? null : await readRevision();
  let contentHash;
  const result = await generate({ root, fetchOptions: options, beforeWrite: async ({ collections, output }) => {
    contentHash = digest(collections);
    // A second complete validation catches changes without a revision endpoint
    // in 2A. 2B additionally requires the server epoch before/after both reads.
    if (digest(await fetchCollections(options)) !== contentHash) throw new Error('CMS changed during build');
    if (!snapshotCheck && await readRevision() !== revision) throw new Error('Editorial revision changed during build');
    const home = output.get('index.html');
    if (!home?.includes('data-home-servicios data-ssg="collections"') || /Cargando servicios|Cargando sectores/.test(home)) throw new Error('Invalid generated Home');
    for (const [file, html] of output) {
      if (file !== 'index.html' && (html.match(/id="salero-schema-graph"/g) || []).length !== 1) throw new Error('Invalid generated graph');
    }
  } });
  // Final check also guards a CMS change during local output writes. Any failure
  // exits nonzero: this build directory is disposable and must never be promoted.
  if (!snapshotCheck && await readRevision() !== revision) throw new Error('Editorial revision changed after rendering');
  await writeFile(path.join(root, 'salero-build.json'), JSON.stringify({ version: 1, revision, contentHash,
    commit: process.env.CF_PAGES_COMMIT_SHA || null, branch: process.env.CF_PAGES_BRANCH || null,
    generatedAt: new Date().toISOString(), counts: result.counts, mode: snapshotCheck ? '2A-snapshot-check' : 'revision-guarded' }) + '\n');
  console.log(JSON.stringify({ phase: 'editorial-build-complete', ...result, revision, contentHash }));
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), at = flag => args.indexOf(flag);
  build({ root: at('--root') < 0 ? process.cwd() : args[at('--root') + 1], snapshotCheck: args.includes('--snapshot-check') })
    .catch(() => { console.error('Editorial build failed; deployment must not be promoted.'); process.exitCode = 1; });
}
