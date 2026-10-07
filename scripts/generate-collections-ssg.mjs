#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchCollections, ENDPOINTS, validateItem } from './lib/cms-collections.mjs';
import { createRenderers, collectionSchema, jsonScript, SITE } from './lib/collection-renderers.mjs';

export const BLOG_PAGE_SIZE = 12;
export const blogPath = page => page === 1 ? '/la-rebotica/' : `/la-rebotica/page/${page}/`;

function replaceRoot(html, attribute, content) {
  const start = new RegExp(`<div\\b[^>]*\\b${attribute}(?:\\s|=|>)`, 'i').exec(html);
  if (!start) throw new Error(`Missing ${attribute} container`);
  const openingEnd = html.indexOf('>', start.index) + 1;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = openingEnd;
  let depth = 1, token;
  while ((token = tags.exec(html))) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      const opening = html.slice(start.index, openingEnd).replace(/\sdata-ssg="[^"]*"/g, '').replace(/>$/, ' data-ssg="collections">');
      return html.slice(0, start.index) + opening + content + html.slice(token.index);
    }
  }
  throw new Error(`Unclosed ${attribute} container`);
}

function withSchema(html, pathname, entries) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (!title) throw new Error('Missing document title');
  html = html.replace(/<script\b[^>]*id="salero-schema-graph"[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  const schema = collectionSchema(pathname, title, entries);
  for (const entry of entries) {
    if (!['https:', 'http:'].includes(new URL(entry.url, SITE).protocol)) throw new Error('Unsafe collection URL');
  }
  return html.replace('</head>', `${jsonScript('salero-schema-graph', schema, 'application/ld+json')}\n</head>`);
}

// Default CSS remains unchanged. Before carousel JS succeeds, every case is readable.
const CASE_BASELINE = `<style id="salero-ssg-case-baseline">
[data-casos] [data-casos-carousel]:not([data-enhanced]) .casos-carousel-viewport{height:auto;overflow:visible}
[data-casos] [data-casos-carousel]:not([data-enhanced]) .casos-carousel-track{height:auto;display:grid;gap:22px}
[data-casos] [data-casos-carousel]:not([data-enhanced]) .caso-card-visual{position:relative;top:auto;left:auto;width:100%;height:auto;aspect-ratio:auto;display:grid;transform:none;filter:none;opacity:1;pointer-events:auto}
[data-casos] [data-casos-carousel]:not([data-enhanced]) .caso-content{opacity:1;transform:none;pointer-events:auto}
[data-casos] [data-casos-carousel]:not([data-enhanced]) .casos-carousel-controls{display:none}
</style>`;

export async function renderCollections(root, collections) {
  for (const endpoint of ENDPOINTS) {
    if (!Array.isArray(collections[endpoint])) throw new Error(`Missing collection ${endpoint}`);
    const slugs = new Set(), ids = new Set();
    for (const item of collections[endpoint]) {
      validateItem(item, endpoint);
      const slug = decodeURIComponent(item.slug).toLowerCase();
      if (slugs.has(slug) || ids.has(item.id)) throw new Error('Duplicate record');
      slugs.add(slug); ids.add(item.id);
    }
  }
  const render = await createRenderers(root);
  const output = new Map();
  for (const [directory, endpoint, label] of [['el-menu', 'servicios', 'Servicio'], ['sectores', 'sectores', 'Sector'], ['casos-de-exito', 'casos-exito', 'Caso']]) {
    const file = `${directory}/index.html`, items = collections[endpoint];
    let html = await readFile(path.join(root, file), 'utf8');
    const cards = directory === 'casos-de-exito' ? render.cases(items) : render.cards(items, `/${directory}`, label);
    html = replaceRoot(html, directory === 'casos-de-exito' ? 'data-casos' : 'data-collection', cards || '<div class="empty">Todavía no hay contenidos publicados.</div>');
    if (directory === 'casos-de-exito') {
      html = html.replace(/<style id="salero-ssg-case-baseline">[\s\S]*?<\/style>\s*/g, '');
      html = html.replace('</head>', `${CASE_BASELINE}\n</head>`);
    }
    output.set(file, withSchema(html, `/${directory}/`, render.entries(items, `/${directory}`)).replace(/[ \t]+$/gm, ''));
  }
  let template = await readFile(path.join(root, 'la-rebotica/index.html'), 'utf8');
  template = template.replace(/<script\b[^>]*id="salero-blog-data"[^>]*>[\s\S]*?<\/script>\s*/g, '');
  const posts = collections.posts, totalPages = Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE));
  for (let page = 1; page <= totalPages; page++) {
    const pathname = blogPath(page), items = posts.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);
    let html = replaceRoot(template, 'data-blog-posts', render.posts(items) || '<div class="rb-empty">Todavía no hay artículos publicados.</div>');
    html = html.replace(/<div\b[^>]*id="rbPostsStatus"[^>]*>[\s\S]*?<\/div>/, '<div class="rb-posts-status" id="rbPostsStatus" role="status" hidden></div>');
    const navigation = `<div class="rb-load-more-wrap" data-ssg-pagination>${page > 1 ? `<a class="btn btn-secondary rb-load-more" rel="prev" href="${blogPath(page - 1)}">Artículos anteriores</a>` : ''}${page < totalPages ? `<a class="btn btn-secondary rb-load-more" rel="next" id="rbLoadMore" href="${blogPath(page + 1)}">Cargar más artículos</a>` : ''}</div>`;
    html = html.replace(/<div class="rb-load-more-wrap"[^>]*>[\s\S]*?<\/div>/, navigation);
    if (!html.includes('data-ssg-pagination')) throw new Error('Missing blog navigation slot');
    if (page > 1) html = html.replace(/<link\b[^>]*rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE}${pathname}">`);
    html = html.replace('</body>', `${jsonScript('salero-blog-data', { page, totalPages, posts: items.map(({ id, slug, status, date, title, excerpt, _embedded }) => ({ id, slug, status, date, title, excerpt, _embedded })) })}\n</body>`);
    output.set(page === 1 ? 'la-rebotica/index.html' : `la-rebotica/page/${page}/index.html`, withSchema(html, pathname, render.entries(items, '/la-rebotica')).replace(/[ \t]+$/gm, ''));
  }
  return output;
}

export async function generate({ root = process.cwd(), fetchOptions = {}, dryRun = false } = {}) {
  // No output is touched until ALL CMS collections and ALL rendered documents validate.
  await Promise.all(['el-menu', 'sectores', 'casos-de-exito', 'la-rebotica'].map(directory => readFile(path.join(root, directory, 'index.html'), 'utf8')));
  const collections = await fetchCollections(fetchOptions);
  const output = await renderCollections(root, collections);
  if (!dryRun) {
    for (const [file, html] of output) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), html);
    }
    const pagesRoot = path.join(root, 'la-rebotica/page');
    for (const entry of await readdir(pagesRoot, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name) || output.has(`la-rebotica/page/${entry.name}/index.html`)) continue;
      const file = path.join(pagesRoot, entry.name, 'index.html');
      const html = await readFile(file, 'utf8');
      if (html.includes('data-ssg="collections"')) await rm(file);
    }
  }
  return { counts: Object.fromEntries(ENDPOINTS.map(endpoint => [endpoint, collections[endpoint].length])), files: [...output.keys()], dryRun };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  generate({ root: rootIndex === -1 ? process.cwd() : args[rootIndex + 1], dryRun: args.includes('--dry-run') })
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(`Collections SSG failed: ${error.message}`); process.exitCode = 1; });
}
