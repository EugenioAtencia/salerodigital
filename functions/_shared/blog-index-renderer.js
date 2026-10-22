import { fetchCollection } from '../../scripts/lib/cms-collections.mjs';
import { renderJsonLd, schemaForPath, SITE_ORIGIN } from './schema.js';

const PAGE_SIZE = 12;
const blogPath = page => page === 1 ? '/la-rebotica/' : `/la-rebotica/page/${page}/`;
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', euro: '€' };
function plain(value = '') {
  return String(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, key) => {
    if (key[0] !== '#') return entities[key] ?? match;
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd';
  }).replace(/\s+/g, ' ').trim();
}
const jsonScript = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');

// Keep the existing page, styles and client-side filters; replace only editorial slots.
function replaceDiv(html, attribute, content) {
  const start = new RegExp(`<div\\b[^>]*\\b${attribute}(?:\\s|=|>)`, 'i').exec(html);
  if (!start) throw new Error('Missing editorial slot');
  const openingEnd = html.indexOf('>', start.index) + 1;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = openingEnd;
  let depth = 1, token;
  while ((token = tags.exec(html))) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(0, openingEnd) + content + html.slice(token.index);
  }
  throw new Error('Unclosed editorial slot');
}

function postCard(post, index) {
  const title = plain(post.title.rendered), excerpt = plain(post.excerpt.rendered).slice(0, 170);
  const categories = post._embedded?.['wp:term']?.[0] || [];
  const category = categories.find(item => !['sin-categoria', 'uncategorized'].includes(item.slug));
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const sizes = media?.media_details?.sizes;
  const image = (sizes?.large || sizes?.medium_large || sizes?.medium || sizes?.full)?.source_url || media?.source_url;
  const imageUrl = /^https?:\/\//i.test(image || '') ? image : null;
  const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(post.date));
  const url = `/la-rebotica/${post.slug}/`, featured = index === 0;
  return `<article class="rb-post-card ${featured ? 'rb-post-card--featured' : ''}" data-categories="${escape(categories.map(item => item.id).join(' '))}">
    <a class="rb-post-card__media" href="${escape(url)}" aria-label="Leer ${escape(title)}">${imageUrl ? `<img src="${escape(imageUrl)}" alt="${escape(media.alt_text || title)}" loading="${featured ? 'eager' : 'lazy'}">` : '<span class="rb-post-card__fallback" aria-hidden="true">SD</span>'}</a>
    <div class="rb-post-card__body"><div class="rb-post-card__meta"><span class="rb-post-card__cat">${escape(category?.name || 'La Rebotica')}</span><time datetime="${escape(post.date)}">${date}</time></div>
    <h3><a href="${escape(url)}">${escape(title)}</a></h3>${excerpt ? `<p>${escape(excerpt)}${excerpt.length >= 170 ? '...' : ''}</p>` : ''}<a class="rb-post-card__link" href="${escape(url)}">Leer artículo</a></div>
  </article>`;
}

export function renderBlogIndexHtml(template, posts, page = 1) {
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const items = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), pathname = blogPath(page);
  let html = replaceDiv(template, 'data-blog-posts', items.map(postCard).join('') || '<div class="rb-empty">Todavía no hay artículos publicados.</div>');
  const navigation = `${page > 1 ? `<a class="btn btn-secondary rb-load-more" rel="prev" href="${blogPath(page - 1)}">Artículos anteriores</a>` : ''}${page < totalPages ? `<a class="btn btn-secondary rb-load-more" rel="next" id="rbLoadMore" href="${blogPath(page + 1)}">Cargar más artículos</a>` : ''}`;
  html = replaceDiv(html, 'data-ssg-pagination', navigation);
  html = html.replace(/<script\b[^>]*id=["'](?:salero-schema-graph|salero-blog-data)["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${SITE_ORIGIN}${pathname}">`);
  if (page > 1) html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>La Rebotica · Página ${page} | Salero Digital</title>`);
  const schema = schemaForPath('/la-rebotica/');
  const graph = schema['@graph'].filter(node => node['@type'] !== 'ItemList');
  const blog = graph.find(node => node['@type'] === 'Blog');
  blog['@id'] = `${SITE_ORIGIN}${pathname}#webpage`; blog.url = `${SITE_ORIGIN}${pathname}`;
  blog.mainEntity = { '@id': `${SITE_ORIGIN}${pathname}#item-list` };
  const breadcrumb = graph.find(node => node['@type'] === 'BreadcrumbList');
  breadcrumb['@id'] = `${SITE_ORIGIN}${pathname}#breadcrumb`;
  if (page > 1) breadcrumb.itemListElement.push({ '@type': 'ListItem', position: 3, name: `Página ${page}`, item: `${SITE_ORIGIN}${pathname}` });
  graph.push({ '@type': 'ItemList', '@id': `${SITE_ORIGIN}${pathname}#item-list`, numberOfItems: items.length, itemListElement: items.map((post, index) => ({ '@type': 'ListItem', position: index + 1, name: plain(post.title.rendered), url: `${SITE_ORIGIN}/la-rebotica/${post.slug}/` })) });
  html = html.replace('</head>', `${renderJsonLd({ '@context': 'https://schema.org', '@graph': graph })}\n</head>`);
  const payload = { page, totalPages, posts: items.map(({ id, slug, status, date, title, excerpt, _embedded }) => ({ id, slug, status, date, title, excerpt, _embedded })) };
  return html.replace('</body>', `<script id="salero-blog-data" type="application/json">${jsonScript(payload)}</script>\n</body>`);
}

function editorialResponse(html, status, mode, sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  for (const key of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(key);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('X-Salero-Editorial', mode);
  if (status >= 400) headers.set('X-Robots-Tag', 'noindex');
  return new Response(html, { status, headers });
}

export async function handleBlogIndexRequest(context, page = 1) {
  const source = page === 1 ? await context.next() : await context.env.ASSETS.fetch(new URL('/la-rebotica/', context.request.url));
  if (!source.ok) return source;
  const template = await source.clone().text();
  try {
    // Fresh reads bypass the CMS/CDN cache. No deploy hook or WordPress write is needed.
    const posts = await fetchCollection('posts', { timeoutMs: 8000, fetchImpl: (url, options) => {
      const fresh = new URL(url); fresh.searchParams.set('_salero_listing', crypto.randomUUID());
      return fetch(fresh.toString(), { ...options, cf: { cacheTtl: 0, cacheEverything: false } });
    } });
    if (!Number.isSafeInteger(page) || page < 1 || page > Math.max(1, Math.ceil(posts.length / PAGE_SIZE))) {
      return editorialResponse('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Página no encontrada | Salero Digital</title></head><body><main><h1>Página no encontrada</h1><a href="/la-rebotica/">Volver a La Rebotica</a></main></body></html>', 404, 'not-found');
    }
    return editorialResponse(renderBlogIndexHtml(template, posts, page), 200, 'wordpress-live', source.headers);
  } catch {
    // A temporary CMS outage keeps the existing first-page snapshot available.
    if (page === 1) return editorialResponse(template, 200, 'snapshot-fallback', source.headers);
    return editorialResponse('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>La Rebotica | Salero Digital</title></head><body><main><h1>La Rebotica no está disponible temporalmente</h1><a href="/la-rebotica/">Volver al blog</a></main></body></html>', 503, 'cms-unavailable');
  }
}
