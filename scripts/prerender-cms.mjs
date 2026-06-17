import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const API_BASE = process.env.SALERO_CMS_API_BASE || 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_URL = process.env.SALERO_SITE_URL || 'https://agenciaconsalero.es';

const ENDPOINTS = {
  servicios: 'servicios',
  sectores: 'sectores',
  posts: 'posts',
  casos: 'casos-exito'
};

const STATIC_CASES = [
  { title: 'Gestamp Digital Summit', slug: 'gestamp-digital-summit', excerpt: 'Experiencia digital privada para centralizar contenidos, sesiones, recursos formativos y comunicación interna.' },
  { title: 'Fundación ONCE', slug: 'fundacion-once', excerpt: 'Campañas digitales multicanal para dar visibilidad a eventos, cursos e iniciativas formativas.' },
  { title: 'Muebles Sarria', slug: 'muebles-sarria', excerpt: 'Sistema de captación multicanal para retail local, combinando buscadores, email, SMS, WhatsApp y contenidos.' },
  { title: 'Comercial Vázquez', slug: 'comercial-vazquez', excerpt: 'Estrategia de contenidos y comunicación para productos, proyectos de cocina y campañas comerciales.' },
  { title: 'Enoro', slug: 'enoro', excerpt: 'Presencia digital para una marca agroalimentaria con producto propio y origen.' },
  { title: 'Museo de la Cal de Morón', slug: 'museo-de-la-cal-de-moron', excerpt: 'Digitalización de un proyecto cultural preparado para informar, captar visitas y reforzar su valor turístico.' }
];

main().catch((error) => {
  console.error('[SSG CMS] Error:', error);
  process.exit(1);
});

async function main() {
  console.log(`[SSG CMS] Leyendo CMS desde ${API_BASE}`);

  const [servicios, sectores, posts, casos] = await Promise.all([
    fetchCollection(ENDPOINTS.servicios).catch((error) => warnAndReturn('servicios', error, [])),
    fetchCollection(ENDPOINTS.sectores).catch((error) => warnAndReturn('sectores', error, [])),
    fetchCollection(ENDPOINTS.posts, { per_page: 12, orderby: 'date', order: 'desc', status: 'publish' }).catch((error) => warnAndReturn('posts', error, [])),
    fetchCollection(ENDPOINTS.casos).catch((error) => warnAndReturn('casos', error, STATIC_CASES))
  ]);

  await patchHome(servicios, sectores);
  await patchSectoresIndex(sectores);
  await patchElMenu(servicios);
  await patchCasos(casos.length ? casos : STATIC_CASES);
  await patchRebotica(posts);
  await generateSectorDetailPages(sectores);
  await writeRoutesJson(sectores);

  console.log('[SSG CMS] Renderizado seguro completado.');
}

async function fetchCollection(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('per_page', String(params.per_page || 100));
  url.searchParams.set('_embed', '1');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${endpoint} respondió ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function warnAndReturn(label, error, fallback) {
  console.warn(`[SSG CMS] No se pudo leer ${label}: ${error.message}`);
  return fallback;
}

async function patchHome(servicios, sectores) {
  const file = 'index.html';
  let html = await read(file);

  if (servicios.length) {
    html = html.replace(
      '<div class="loading">Cargando servicios desde el CMS...</div>',
      `<!-- SSG fallback desde CMS: servicios -->\n${servicios.map(renderHomeService).join('\n')}`
    );
  }

  if (sectores.length) {
    html = html.replace(
      '<div class="loading">Cargando sectores desde el CMS...</div>',
      `<!-- SSG fallback desde CMS: sectores -->\n${sectores.map(renderHomeSector).join('\n')}`
    );
  }

  html = canonical(html, '/');
  await write(file, html);
}

async function patchSectoresIndex(sectores) {
  if (!sectores.length) return;
  const file = 'sectores/index.html';
  let html = await read(file);

  html = html.replace(
    '<div class="loading">Cargando contenido desde el CMS...</div>',
    `<!-- SSG fallback desde CMS: sectores -->\n${sectores.map(renderSectorIndexCard).join('\n')}`
  );

  html = canonical(html, '/sectores/');
  await write(file, html);
}

async function patchElMenu(servicios) {
  if (!servicios.length) return;
  const file = 'el-menu/index.html';
  let html = await read(file);

  html = html.replace(
    '<div class="loading">Cargando contenido desde el CMS...</div>',
    `<!-- SSG fallback desde CMS: servicios -->\n${servicios.map(renderCollectionServiceCard).join('\n')}`
  );

  html = canonical(html, '/el-menu/');
  await write(file, html);
}

async function patchCasos(casos) {
  const file = 'casos-de-exito/index.html';
  let html = await read(file);

  html = html.replace(
    '<div class="loading">Cargando casos de éxito desde el CMS...</div>',
    `<!-- SSG fallback desde CMS: casos de éxito -->\n${casos.map(renderCaseCard).join('\n')}`
  );

  html = canonical(html, '/casos-de-exito/');
  await write(file, html);
}

async function patchRebotica(posts) {
  if (!posts.length) return;
  const file = 'la-rebotica/index.html';
  let html = await read(file);

  html = html.replace(
    '<div class="rb-posts-status" id="rbPostsStatus" role="status">Cargando artículos desde el CMS...</div>',
    '<div class="rb-posts-status" id="rbPostsStatus" role="status" hidden></div>'
  );

  html = html.replace(
    '<div class="rb-posts-grid" id="rbPosts" data-blog-posts></div>',
    `<div class="rb-posts-grid" id="rbPosts" data-blog-posts>\n<!-- SSG fallback desde CMS: artículos -->\n${posts.map(renderPostCard).join('\n')}\n</div>`
  );

  html = canonical(html, '/la-rebotica/');
  await write(file, html);
}

async function generateSectorDetailPages(sectores) {
  if (!sectores.length) return;
  const template = await read('sectores/detalle/index.html');

  for (const sector of sectores) {
    if (!sector.slug) continue;
    const html = renderSectorDetail(template, sector);
    const target = `sectores/${sector.slug}/index.html`;
    await fs.mkdir(path.dirname(abs(target)), { recursive: true });
    await write(target, html);
  }
}

async function writeRoutesJson(sectores) {
  const exclusions = [
    '/sectores/',
    ...sectores.filter((sector) => sector.slug).map((sector) => `/sectores/${sector.slug}/`),
    ...sectores.filter((sector) => sector.slug).map((sector) => `/sectores/${sector.slug}/*`)
  ];

  const routes = {
    version: 1,
    include: ['/*'],
    exclude: [...new Set(exclusions)]
  };

  await write('_routes.json', `${JSON.stringify(routes, null, 2)}\n`);
}

function renderHomeService(item, index) {
  const a = acf(item);
  return `<article class="service-row">\n  <span class="service-index">${String(index + 1).padStart(2, '0')}</span>\n  <div>\n    <div class="service-meta">${esc(serviceLabel(item))}</div>\n    <h3>${esc(title(item))}</h3>\n  </div>\n  <p>${esc(excerptFrom(item, a))}</p>\n  <a class="editorial-link" href="/el-menu/${esc(item.slug)}/">Ver servicio</a>\n</article>`;
}

function renderHomeSector(item) {
  const a = acf(item);
  return `<article class="sector-card">\n  <span class="tag">${esc(first(a.etiqueta_comercial, sectorLabel(item)))}</span>\n  <h3>${esc(title(item).replace(/^Marketing para\s+/i, ''))}</h3>\n  <p>${esc(excerptFrom(item, a))}</p>\n  <a class="editorial-link" href="/sectores/${esc(item.slug)}/">Ver sector</a>\n</article>`;
}

function renderSectorIndexCard(item) {
  const a = acf(item);
  const kind = sectorKind(item.slug, title(item));
  return `<article class="card sector-card-dynamic sector-card-${esc(kind)}">\n  <span class="tag sector-value-tag">${esc(first(a.etiqueta_comercial, sectorLabel(item)))}</span>\n  <h3>${esc(title(item))}</h3>\n  <p>${esc(excerptFrom(item, a))}</p>\n  <a class="card-link" href="/sectores/${esc(item.slug)}/">Ver estrategia</a>\n</article>`;
}

function renderCollectionServiceCard(item) {
  const a = acf(item);
  return `<article class="card">\n  <span class="tag">${esc(serviceLabel(item))}</span>\n  <h3>${esc(title(item))}</h3>\n  <p>${esc(excerptFrom(item, a))}</p>\n  <a class="card-link" href="/el-menu/${esc(item.slug)}/">Ver servicio</a>\n</article>`;
}

function renderCaseCard(item) {
  const a = acf(item);
  const name = first(a.cliente_nombre, a.nombre_caso, a.cliente, title(item));
  const slug = item.slug || slugify(name);
  return `<article class="card caso-card">\n  <h3>${esc(name)}</h3>\n  <p>${esc(first(a.descripcion_corta, a.resumen, excerpt(item), item.excerpt))}</p>\n  <a class="card-link" href="/casos-de-exito/${esc(slug)}/">Ver caso</a>\n</article>`;
}

function renderPostCard(post, index) {
  const image = featured(post);
  const category = categoryName(post);
  return `<article class="rb-post-card ${index === 0 ? 'rb-post-card--featured' : ''}">\n  ${image ? `<a class="rb-post-card__media" href="/la-rebotica/${esc(post.slug)}/"><img src="${esc(image)}" alt="${esc(title(post))}" loading="${index === 0 ? 'eager' : 'lazy'}"></a>` : ''}\n  <div class="rb-post-card__body">\n    <div class="rb-post-card__meta"><span class="rb-post-card__cat">${esc(category)}</span></div>\n    <h3><a href="/la-rebotica/${esc(post.slug)}/">${esc(title(post))}</a></h3>\n    <p>${esc(excerpt(post))}</p>\n    <a class="rb-post-card__link" href="/la-rebotica/${esc(post.slug)}/">Leer artículo</a>\n  </div>\n</article>`;
}

function renderSectorDetail(template, item) {
  const a = acf(item);
  const pageTitle = first(a.hero_title, a.titulo_hero, a.titular_seo, title(item));
  const intro = first(a.hero_text, a.texto_hero, a.claim, a.meta_description, excerpt(item));
  const label = first(a.etiqueta_comercial, sectorLabel(item));
  const ctaText = first(a.cta_sectorial_texto, 'Pide tu cata digital');
  const ctaUrl = normalizeUrl(first(a.cta_sectorial_url, '/hablamos/'));
  const kind = sectorKind(item.slug, pageTitle);

  const main = `<main data-detail data-type="sector" data-prerendered="ssg-cms">\n  <!-- SSG fallback desde CMS: landing sectorial -->\n  <article class="sector-prerender-detail">\n    <section class="sector-detail-hero sector-kind-${esc(kind)}" aria-labelledby="sector-detail-title">\n      <div class="sector-detail-veil" aria-hidden="true"></div>\n      <div class="sector-detail-gradient" aria-hidden="true"></div>\n      <div class="container sector-detail-hero-inner">\n        <div class="sector-detail-copy">\n          <a class="sector-detail-back" href="/sectores/">Sectores</a>\n          <span class="sector-detail-kicker">${esc(label)}</span>\n          <h1 id="sector-detail-title">${esc(pageTitle)}</h1>\n          ${intro ? `<p>${esc(intro)}</p>` : ''}\n          <div class="sector-detail-actions" aria-label="Acciones principales">\n            <a class="btn btn-primary" href="${esc(ctaUrl)}">${esc(ctaText)}</a>\n            <a class="btn btn-secondary sector-btn-glass" href="#contenido-sector">Ver estrategia</a>\n          </div>\n        </div>\n        <aside class="sector-detail-hero-card" aria-label="Resumen del sector">\n          <span class="sector-card-label">${esc(label)}</span>\n          <h2>${esc(first(a.hero_card_title, a.destacado_titulo, 'Una estrategia digital adaptada a tu sector.'))}</h2>\n          ${listHtml(first(a.hero_card_items, a.destacado_items, defaultHeroItems(kind)))}\n        </aside>\n      </div>\n    </section>\n\n    <section class="sector-content-section" id="contenido-sector">\n      <div class="container sector-content-grid">\n        <article class="sector-main-content">\n          <span class="sector-section-kicker">Estrategia sectorial</span>\n          ${intro ? `<div class="sector-rich-content sector-lead-content"><p>${esc(intro)}</p></div>` : ''}\n          ${textSection('El reto del sector', a.problema_sector)}\n          ${textSection('La solución de Salero Digital', a.solucion_salero)}\n          ${listSection('Servicios recomendados', a.servicios_recomendados)}\n          ${listSection('Beneficios que buscamos', a.beneficios)}\n          ${listSection('Acciones que podemos activar', a.ejemplos_acciones)}\n          ${faqSection(first(a.faqs_repeater, a.faqs))}\n        </article>\n        <aside class="sector-sidebar">\n          <div class="sector-sidebar-card">\n            <span class="sector-section-kicker">Cata digital</span>\n            <h2>${esc(first(a.sidebar_title, 'Qué miramos antes de proponer la receta'))}</h2>\n            ${listHtml(first(a.sidebar_items, ['Cómo apareces en Google y Google Maps', 'Qué transmite tu web', 'Cómo comunicas en redes sociales', 'Qué hace tu competencia directa', 'Dónde se pierden oportunidades']))}\n            <a class="btn btn-primary" href="${esc(ctaUrl)}">${esc(ctaText)}</a>\n          </div>\n        </aside>\n      </div>\n    </section>\n\n    <section class="sector-final-cta">\n      <div class="container sector-final-card">\n        <span class="sector-section-kicker">Con salero y con método</span>\n        <h2>${esc(first(a.cta_final_titulo, 'Tu negocio ya tiene oficio. Ahora toca que se vea como merece.'))}</h2>\n        ${first(a.cta_final_texto_largo, '') ? `<p>${esc(first(a.cta_final_texto_largo))}</p>` : ''}\n        <div class="sector-detail-actions"><a class="btn btn-primary" href="${esc(ctaUrl)}">${esc(ctaText)}</a></div>\n      </div>\n    </section>\n  </article>\n</main>`;

  let html = template.replace(/<main\b[^>]*data-detail[^>]*data-type=["']sector["'][^>]*>[\s\S]*?<\/main>/i, main);
  html = titleTag(html, `${first(a.meta_title, pageTitle)} | Salero Digital`);
  html = metaDescription(html, first(a.meta_description, intro));
  html = canonical(html, `/sectores/${item.slug}/`);
  return html;
}

function textSection(title, value) {
  const text = clean(value);
  return text ? `<section class="content-block"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>` : '';
}

function listSection(title, value) {
  const list = listHtml(value);
  return list ? `<section class="content-block"><h2>${esc(title)}</h2>${list}</section>` : '';
}

function faqSection(value) {
  const rows = parseFaqs(value);
  if (!rows.length) return '';
  return `<section class="content-block content-block-faqs"><h2>Preguntas frecuentes</h2><div class="faq-list">${rows.map((row, index) => `<details ${index === 0 ? 'open' : ''}><summary>${esc(row.question)}</summary><p>${esc(row.answer)}</p></details>`).join('')}</div></section>`;
}

function parseFaqs(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => ({
      question: clean(first(item.pregunta, item.question, item.q, item.titulo, item.title)),
      answer: clean(first(item.respuesta, item.answer, item.a, item.texto, item.content))
    })).filter((item) => item.question && item.answer);
  }
  return [];
}

function listHtml(value) {
  const items = toItems(value);
  return items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '';
}

function toItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => clean(first(item.text, item.label, item.titulo, item.title, item.nombre, item.value, item.item, item.punto, item))).filter(Boolean);
  return clean(value).split(/\r?\n\s*\r?\n|\r?\n|;|\|/).map((item) => item.replace(/^[-•–]\s*/, '').trim()).filter(Boolean);
}

function acf(item) {
  return item.salero_acf || item.acf || {};
}

function title(item) {
  return clean(item.title?.rendered || item.title || '');
}

function excerpt(item) {
  return clean(item.excerpt?.rendered || item.excerpt || '');
}

function excerptFrom(item, fields = {}) {
  return truncate(first(fields.subtitulo_comercial, fields.claim, fields.meta_description, fields.hero_text, fields.titular_seo, excerpt(item)), 190);
}

function first(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const resolved = first(value.rendered, value.title, value.name, value.label, value.text, value.value, value.respuesta, value.answer);
      if (resolved) return resolved;
      continue;
    }
    const text = clean(value);
    if (text) return text;
  }
  return '';
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(', ');
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function truncate(value, max) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max).replace(/[\s,.;:-]+$/g, '')}…` : text;
}

function serviceLabel(item) {
  const value = `${item.slug || ''} ${title(item)}`.toLowerCase();
  if (value.includes('cimientos') || value.includes('web')) return 'Desarrollo web';
  if (value.includes('pregonero') || value.includes('seo')) return 'SEO local';
  if (value.includes('gracia') || value.includes('social')) return 'Redes y contenido';
  if (value.includes('empuj') || value.includes('ads')) return 'Campañas';
  return 'Servicio digital';
}

function sectorKind(slug = '', label = '') {
  const value = `${slug} ${label}`.toLowerCase();
  if (value.includes('hosteler') || value.includes('turismo')) return 'hosteleria';
  if (value.includes('comercio') || value.includes('pyme')) return 'comercio';
  if (value.includes('almazara') || value.includes('aceite') || value.includes('oliva')) return 'aceite';
  return 'generico';
}

function sectorLabel(item) {
  const kind = sectorKind(item.slug, title(item));
  if (kind === 'hosteleria') return 'Reservas, imagen y reputación';
  if (kind === 'comercio') return 'Visibilidad local y ventas';
  if (kind === 'aceite') return 'Origen, producto y marca';
  return 'Estrategia sectorial';
}

function defaultHeroItems(kind) {
  if (kind === 'hosteleria') return ['Google Maps más trabajado', 'Redes con intención comercial', 'Campañas para reservas, llamadas y mensajes'];
  if (kind === 'comercio') return ['Google Maps y búsquedas locales', 'Redes para activar confianza', 'Campañas de cercanía y venta'];
  if (kind === 'aceite') return ['SEO para producto y territorio', 'Contenido de origen y calidad', 'Campañas para venta y captación'];
  return ['Visibilidad local más clara', 'Contenido con intención comercial', 'Medición sencilla y útil'];
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '/hablamos/';
  if (url.includes('webagencia360.com/hablamos')) return '/hablamos/';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/${url.replace(/^\/+|\/+$/g, '')}/`;
}

function featured(item) {
  const media = item._embedded?.['wp:featuredmedia']?.[0];
  return item.featured_image_url || media?.source_url || '';
}

function categoryName(post) {
  const terms = post._embedded?.['wp:term']?.[0] || [];
  const term = terms.find((item) => !['sin-categoria', 'uncategorized'].includes(item.slug));
  return term?.name || 'La Rebotica';
}

function slugify(value) {
  return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleTag(html, value) {
  return /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(value)}</title>`) : html.replace('</head>', `<title>${esc(value)}</title>\n</head>`);
}

function metaDescription(html, value) {
  const description = truncate(value, 155);
  if (!description) return html;
  return /<meta\s+name=["']description["']/i.test(html)
    ? html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*>/i, `<meta name="description" content="${esc(description)}">`)
    : html.replace('</head>', `<meta name="description" content="${esc(description)}">\n</head>`);
}

function canonical(html, route) {
  const href = `${SITE_URL.replace(/\/$/, '')}${route}`;
  return /<link\s+rel=["']canonical["']/i.test(html)
    ? html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*>/i, `<link rel="canonical" href="${esc(href)}">`)
    : html.replace('</head>', `<link rel="canonical" href="${esc(href)}">\n</head>`);
}

async function read(file) {
  return fs.readFile(abs(file), 'utf8');
}

async function write(file, content) {
  await fs.mkdir(path.dirname(abs(file)), { recursive: true });
  await fs.writeFile(abs(file), content, 'utf8');
  console.log(`[SSG CMS] Actualizado ${file}`);
}

function abs(file) {
  return path.join(ROOT, file);
}
