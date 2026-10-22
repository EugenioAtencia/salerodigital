import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchCollections } from './lib/cms-collections.mjs';
import { renderCollections } from './generate-collections-ssg.mjs';
import { digest } from './build-editorial-ssg.mjs';

// Local editorial proposal only: no hook, remote write, plugin activation or deployment.
export async function syncEditorialSeo({ root = process.cwd(), write = false, fetchOptions = {} } = {}) {
  const collections = await fetchCollections(fetchOptions);
  const rendered = await renderCollections(root, collections);
  if (digest(collections) !== digest(await fetchCollections(fetchOptions))) throw new Error('CMS changed during editorial sync');
  const output = new Map([...rendered].filter(([file]) => file === 'sitemap.xml' || file.startsWith('la-rebotica/')));
  const stale = [];
  const pagesRoot = path.join(root, 'la-rebotica/page');
  for (const dir of await readdir(pagesRoot, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) {
    const file = `la-rebotica/page/${dir.name}/index.html`;
    if (dir.isDirectory() && /^\d+$/.test(dir.name) && !output.has(file)) {
      const html = await readFile(path.join(root, file), 'utf8').catch(e => { if (e.code === 'ENOENT') return ''; throw e; });
      if (html.includes('data-ssg="collections"')) stale.push(file);
    }
  }
  const differences = [...stale];
  for (const [file, html] of output) {
    const old = await readFile(path.join(root, file), 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    if (old !== html) differences.push(file);
  }
  if (write) {
    for (const [file, html] of output) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), html);
    }
    for (const file of stale) await rm(path.join(root, file));
  } else if (differences.length) throw new Error(`Editorial output out of sync: ${differences.join(', ')}`);
  return { mode: write ? 'local-write' : 'check', counts: Object.fromEntries(Object.entries(collections).map(([key, items]) => [key, items.length])),
    contentHash: digest(collections), files: [...output.keys()], updated: differences,
    posts: collections.posts.map(({ id, slug, modified_gmt }) => ({ id, slug, modified_gmt })),
    cases: collections['casos-exito'].map(({ id, slug }) => ({ id, slug })) };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  syncEditorialSeo({ write: process.argv.includes('--write') }).then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
