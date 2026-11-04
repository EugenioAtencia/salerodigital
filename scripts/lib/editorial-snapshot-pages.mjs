import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { plain, esc, jsonScript } from './collection-renderers.mjs';
import { renderIntoTemplate } from '../generate-sectors-ssg.mjs';
import { schemaForPath, schemaGraph, organizationSchema, websiteSchema, webPageSchema, breadcrumbSchema, blogPostingSchema, caseStudySchema } from '../../functions/_shared/schema.js';
import { fail } from './editorial-push-snapshot.mjs';

// Execute only trusted existing renderers. CMS strings are data, never code.
async function renderer(root, file, extra = {}) {
  const source = (await readFile(path.join(root, file), 'utf8')).replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '');
  const context = vm.createContext({ URL, Response, AbortController, Date, Intl, Map, setTimeout, clearTimeout,
    fetch() { fail('snapshot_network_forbidden'); }, ...extra });
  vm.runInContext(source, context, { timeout: 1000 }); return context;
}
function graph(html, pathname, title, post = null) {
  const scripts = [...html.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (scripts.length > 1) fail('individual_schema_duplicate');
  if (scripts.length === 1) return html.replace(scripts[0][0], scripts[0][0].replace(/\s+id=["'][^"']*["']/gi, '').replace('<script', '<script id="salero-schema-graph"'));
  const description = plain(post?.excerpt?.rendered || '');
  const schema = schemaForPath(pathname) || schemaGraph([organizationSchema(), websiteSchema(), webPageSchema({ url: pathname, name: title, description }), breadcrumbSchema([{ name: 'Inicio', url: '/' }, { name: title, url: pathname }]), post ? blogPostingSchema({ post, title, description, url: pathname, content: post.content.rendered }) : caseStudySchema({ title, description, url: pathname })]);
  const normalized = JSON.parse(JSON.stringify(schema).replaceAll('https://salero.webagencia360.com', 'https://agenciaconsalero.es'));
  return html.replace('</head>', `${jsonScript('salero-schema-graph', normalized, 'application/ld+json')}</head>`);
}
export async function renderSnapshotPages(root, collections) {
  const output = new Map();
  const service = await renderer(root, 'functions/_shared/service-renderer.js', { renderJsonLd: value => jsonScript('salero-schema-graph', value, 'application/ld+json'), schemaForPath });
  const blog = await renderer(root, 'functions/_shared/blog-renderer.js', { blogPostingSchema, schemaGraph, renderJsonLd: value => jsonScript('salero-schema-graph', value, 'application/ld+json'), organizationSchema, websiteSchema, webPageSchema, breadcrumbSchema });
  const caseRenderer = await renderer(root, 'functions/_shared/caso-renderer-v4.js', {
    // Numeric references must be resolved by the WordPress export, never via HTTP here.
    fetch: async url => {
      const parsed = new URL(url), route = parsed.searchParams.get('rest_route') || parsed.pathname.replace('/wp-json', '');
      const match = /^\/wp\/v2\/media\/(\d+)$/.exec(route);
      if (!match || parsed.origin !== 'https://cms.webagencia360.com') fail('snapshot_network_forbidden');
      const media = mediaById.get(Number(match[1])); if (!media) fail('snapshot_media_missing');
      return Response.json(media);
    }
  });
  const mediaById = new Map();
  for (const item of collections['casos-exito']) {
    for (const media of [...(item._embedded?.['wp:featuredmedia'] || []), ...Object.values(item.salero_snapshot_media || {})]) {
      if (media && Number.isSafeInteger(media.id)) mediaById.set(media.id, media);
    }
  }
  for (const item of collections.servicios) {
    service.selectedSlug = item.slug;
    const baseline = vm.runInContext('SERVICES[selectedSlug]', service);
    if (!baseline) fail('snapshot_service_template_missing');
    const a = item.salero_acf || item.acf || {}, model = { ...baseline };
    // Explicit mappings preserve the existing layout and code defaults for absent optional fields.
    const fields = { title: ['hero_title','nombre_creativo'], metaTitle: ['meta_title'], metaDescription: ['meta_description'],
      claim: ['hero_text'], label: ['etiqueta_comercial'], heroVideo: ['hero_video'], cardTitle: ['hero_card_title'],
      intro: ['introduccion'], problem: ['problema'], approach: ['solucion_salero'] };
    for (const [target, names] of Object.entries(fields)) {
      const value = names.map(name => a[name]).find(value => typeof value === 'string' && value.trim());
      if (value) model[target] = target === 'heroVideo' ? value : plain(value);
    }
    for (const [target, key] of Object.entries({ cardItems: 'hero_card_items', includes: 'incluye', benefits: 'beneficios', process: 'proceso' })) {
      if (Array.isArray(a[key])) model[target] = a[key].map(v => plain(typeof v === 'string' ? v : v.punto || v.text || '')).filter(Boolean);
    }
    output.set(`el-menu/${item.slug}/index.html`, graph(service.renderServicePage(item.slug, model), `/el-menu/${item.slug}/`, model.title));
  }
  for (const item of collections.sectores) {
    // Use the established sector template and generator, without changing their implementation.
    let template;
    try { template = await readFile(path.join(root, 'sectores', item.slug, 'index.html'), 'utf8'); }
    catch { fail('snapshot_sector_template_missing'); }
    output.set(`sectores/${item.slug}/index.html`, renderIntoTemplate(template, item));
  }
  for (const original of collections['casos-exito']) {
    const item = structuredClone(original);
    await caseRenderer.hydrateCasoMedia(item);
    output.set(`casos-de-exito/${item.slug}/index.html`, graph(caseRenderer.renderCasoPage(item.slug, item), `/casos-de-exito/${item.slug}/`, plain(item.title.rendered)));
  }
  const articleLinks = new Map(collections.posts.filter(item => typeof item.link === 'string').map(item => [item.link.replace(/\/$/, ''), `https://agenciaconsalero.es/la-rebotica/${item.slug}/`]));
  const sorted = [...collections.posts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  for (const original of collections.posts) {
    const item = structuredClone(original);
    item.content.rendered = item.content.rendered.replace(/<(\/?)h1\b/gi, '<$1h2').replace(/href="([^" ]+)"/g, (attribute, href) => {
      let url; try { url = new URL(href); } catch { return attribute; }
      const target = articleLinks.get(`${url.origin}${url.pathname}`.replace(/\/$/, ''));
      return target ? `href="${esc(target + url.search + url.hash)}"` : attribute;
    });
    const index = sorted.findIndex(post => post.id === item.id);
    const blogContext = { previous: sorted[index + 1] || null, next: sorted[index - 1] || null, related: sorted.filter(post => post.id !== item.id).slice(0, 2) };
    let html = blog.renderPostPage(item.slug, item, blogContext);
    const featured = item._embedded?.['wp:featuredmedia']?.[0];
    html = html.replace('alt="" aria-hidden="true"', `alt="${esc(featured?.alt_text || '')}"`);
    const tags = (item._embedded?.['wp:term'] || []).flat().filter(term => term.taxonomy === 'post_tag');
    if (tags.length) html = html.replace('<span>Salero Digital</span>', `<span>Salero Digital</span>${tags.map(term => `<span>${esc(term.name)}</span>`).join('')}`);
    output.set(`la-rebotica/${item.slug}/index.html`, html);
  }
  for (const [file, html] of output) {
    if ((html.match(/<h1\b/gi) || []).length !== 1 || /Cargando (artículo|contenido)|blog-article-client\.js/.test(html)
      || (html.match(/id="salero-schema-graph"/g) || []).length !== 1) fail('individual_html_invalid');
    const canonical = /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(html)?.[1];
    if (canonical !== `https://agenciaconsalero.es/${file.replace('index.html', '')}`) fail('individual_canonical_invalid');
  }
  return output;
}
