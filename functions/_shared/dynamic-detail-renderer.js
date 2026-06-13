const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://agenciaconsalero.es';
const WHATSAPP_URL = 'https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital.';

const TYPE_CONFIG = {
  servicio: {
    endpoint: 'servicios',
    basePath: '/el-menu',
    bodyClass: 'service-detail-page',
    titleFallback: 'Servicio digital',
    typeLabel: 'El Menú',
    loadingLabel: 'Cargando servicio desde el CMS...',
    styles: [
      '/assets/css/main.css?v=50',
      '/assets/css/service-header-scroll.css?v=2',
      '/assets/css/service-detail-sector-hero.css?v=7',
      '/assets/css/service-menu-accordion.css?v=4',
      '/assets/css/service-fullwidth-sections.css?v=2'
    ],
    sections: [
      ['problema_que_resuelve', 'El problema que resolvemos', 'text'],
      ['descripcion_principal', 'Cómo lo trabajamos', 'text'],
      ['que_incluye', 'Qué incluye', 'list'],
      ['beneficios', 'Beneficios', 'list'],
      ['proceso_trabajo', 'Proceso de trabajo', 'text'],
      ['faqs', 'Preguntas frecuentes', 'faqs']
    ],
    ctaTextKeys: ['cta_final_texto', 'cta_texto', 'cta_label', 'boton_texto'],
    ctaUrlKeys: ['cta_final_url', 'cta_url', 'boton_url'],
    detailScript: '/assets/js/detail.js?v=4'
  },
  menu: {
    endpoint: 'menu-packs',
    basePath: '/nuestros-menus',
    bodyClass: 'menu-detail-page',
    titleFallback: 'Menú comercial',
    typeLabel: 'Nuestros menús',
    loadingLabel: 'Cargando menú desde el CMS...',
    styles: [
      '/assets/css/main.css?v=50',
      '/assets/css/nuestros-menus.css?v=7'
    ],
    sections: [
      ['ideal_para', 'Ideal para', 'text'],
      ['que_incluye', 'Qué incluye', 'list'],
      ['beneficios', 'Beneficios', 'list'],
      ['para_quien', 'Para quién está pensado', 'text'],
      ['faqs', 'Preguntas frecuentes', 'faqs']
    ],
    ctaTextKeys: ['cta_principal_texto', 'cta_texto', 'cta_label', 'boton_texto'],
    ctaUrlKeys: ['cta_principal_url', 'cta_url', 'boton_url'],
    detailScript: '/assets/js/detail.js?v=4'
  },
  caso: {
    endpoint: 'casos-exito',
    basePath: '/casos-de-exito',
    bodyClass: 'caso-detalle-page',
    titleFallback: 'Caso de éxito',
    typeLabel: 'Casos de éxito',
    loadingLabel: 'Cargando caso...',
    styles: [
      '/assets/css/main.css?v=50',
      '/assets/css/caso-de-exito-detalle.css?v=1'
    ],
    sections: [
      ['cliente', 'Cliente', 'text'],
      ['sector_cliente', 'Sector', 'text'],
      ['reto_inicial', 'Reto inicial', 'text'],
      ['servicios_aplicados', 'Servicios aplicados', 'list'],
      ['estrategia_aplicada', 'Estrategia aplicada', 'text'],
      ['acciones_realizadas', 'Acciones realizadas', 'list'],
      ['resultados', 'Resultados', 'text'],
      ['metricas_destacadas', 'Métricas destacadas', 'list'],
      ['testimonio', 'Testimonio', 'text']
    ],
    ctaTextKeys: ['cta_texto', 'cta_label', 'boton_texto'],
    ctaUrlKeys: ['cta_url', 'boton_url'],
    detailScript: '/assets/js/caso-de-exito-detalle.js?v=1',
    rootAttrs: 'id="caso-detalle-root" data-caso-detalle'
  }
};

export async function handleDynamicDetailRequest(context, type) {
  const config = TYPE_CONFIG[type];
  if (!config) {
    return htmlResponse(renderErrorPage('Tipo de contenido no configurado', `No existe configuración SSR para ${escapeHtml(type)}.`), 500);
  }

  const slug = sanitizeSlug(context.params.slug || '');
  if (!slug) {
    return htmlResponse(renderErrorPage(`${config.titleFallback} no encontrado`, 'No se ha recibido un slug válido para cargar esta landing dinámica.'), 404);
  }

  try {
    const item = await fetchItem(config.endpoint, slug);
    if (!item) {
      return htmlResponse(renderErrorPage('Contenido no encontrado', `No existe ningún contenido publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    return htmlResponse(renderDynamicPage({ type, slug, item, config }), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el contenido desde WordPress', String(error && error.message ? error.message : error)), 502);
  }
}

async function fetchItem(endpoint, slug) {
  const url = new URL(`${CMS_API_BASE}/${endpoint}`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_embed', '1');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaleroDigital-Cloudflare-SSR'
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false
    }
  });

  if (!response.ok) {
    throw new Error(`WordPress respondió con estado ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data.length ? data[0] : null;
}

function renderDynamicPage({ type, slug, item, config }) {
  const acf = getAcf(item);
  const title = stripHtml(fieldValue(acf, ['hero_title', 'titulo_hero', 'titulo_principal', 'nombre_creativo', 'titular_seo'], itemTitle(item) || config.titleFallback));
  const excerptText = stripHtml(fieldValue(acf, ['hero_text', 'texto_hero', 'subtitulo_hero', 'claim', 'subtitulo_comercial', 'meta_description'], excerpt(item) || ''));
  const metaTitle = stripHtml(fieldValue(acf, ['meta_title', 'og_title'], title));
  const metaDescription = stripHtml(fieldValue(acf, ['meta_description', 'og_description'], excerptText || excerpt(item) || `${config.titleFallback} de Salero Digital.`)).slice(0, 165);
  const canonical = `${SITE_ORIGIN}${config.basePath}/${slug}/`;
  const ctaLabel = stripHtml(fieldValue(acf, config.ctaTextKeys, 'Pide tu cata digital'));
  const ctaUrl = normalizeUrl(fieldValue(acf, config.ctaUrlKeys, '/hablamos/'));
  const heroVideo = fieldUrl(fieldValue(acf, ['hero_video', 'video_hero', 'video'], ''));
  const heroPoster = fieldUrl(fieldValue(acf, ['hero_poster', 'poster_hero', 'imagen_hero', 'hero_image'], featuredImage(item) || ''));
  const contentHtml = renderMainContent(item, excerptText);
  const sectionsHtml = renderSections(acf, config.sections);
  const rootAttrs = config.rootAttrs || `data-detail data-type="${escapeAttr(type)}" data-slug="${escapeAttr(slug)}"`;

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(metaTitle)} | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  ${config.styles.map(href => `<link rel="stylesheet" href="${escapeAttr(href)}">`).join('\n  ')}
</head>
<body class="${escapeAttr(config.bodyClass)}">
${renderHeader(config)}
  <main ${rootAttrs}>
    ${renderHero({ config, title, excerptText, heroVideo, heroPoster, ctaLabel, ctaUrl })}
    <section class="section detail-content-section" id="contenido-detalle">
      <div class="container">
        <article class="content-card detail-content-card">
          <span class="eyebrow">${escapeHtml(config.typeLabel)}</span>
          <h2>${escapeHtml(title)}</h2>
          <div class="rich-content">${contentHtml}</div>
          ${sectionsHtml}
          <div class="detail-final-actions">
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaLabel)}</a>
            <a class="btn btn-secondary" href="${escapeAttr(WHATSAPP_URL)}" target="_blank" rel="noopener">Hablar por WhatsApp</a>
          </div>
        </article>
      </div>
    </section>
  </main>
${renderFooter()}

  <script src="/assets/js/config.js?v=7" defer></script>
  <script src="/assets/js/api.js?v=4" defer></script>
  <script src="/assets/js/helpers.js?v=41" defer></script>
  <script src="${escapeAttr(config.detailScript)}" defer></script>
</body>
</html>`;
}

function renderHero({ config, title, excerptText, heroVideo, heroPoster, ctaLabel, ctaUrl }) {
  const media = heroVideo
    ? `<video class="detail-hero-video sector-detail-hero-video" autoplay muted loop playsinline preload="metadata" ${heroPoster ? `poster="${escapeAttr(heroPoster)}"` : ''} aria-hidden="true"><source src="${escapeAttr(heroVideo)}" type="video/mp4"></video>`
    : heroPoster
      ? `<img class="detail-hero-image sector-detail-hero-image" src="${escapeAttr(heroPoster)}" alt="${escapeAttr(title)}" loading="eager">`
      : '';

  return `<section class="sector-detail-hero dynamic-detail-hero" aria-labelledby="detail-title">
      ${media}
      <div class="sector-detail-veil" aria-hidden="true"></div>
      <div class="sector-detail-gradient" aria-hidden="true"></div>
      <div class="container sector-detail-hero-inner">
        <div class="sector-detail-copy">
          <a class="sector-detail-back" href="${escapeAttr(config.basePath)}/">${escapeHtml(config.typeLabel)}</a>
          <span class="sector-detail-kicker">${escapeHtml(config.typeLabel)}</span>
          <h1 id="detail-title">${escapeHtml(title)}</h1>
          ${excerptText ? `<p>${escapeHtml(excerptText)}</p>` : ''}
          <div class="sector-detail-actions" aria-label="Acciones principales">
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaLabel)}</a>
            <a class="btn btn-secondary sector-btn-glass" href="#contenido-detalle">Ver contenido</a>
          </div>
        </div>
      </div>
    </section>`;
}

function renderSections(acf, sections = []) {
  return sections.map(([key, title, format]) => {
    const value = acf[key];
    if (!value) return '';
    const content = format === 'list' ? formatList(value) : format === 'faqs' ? formatFaqs(value) : formatText(value);
    if (!content) return '';
    return `<section class="content-block content-block-${escapeAttr(key)} content-block-${escapeAttr(format)}"><h2>${escapeHtml(title)}</h2>${content}</section>`;
  }).filter(Boolean).join('\n');
}

function renderMainContent(item, fallbackText = '') {
  const wpContent = item.content && item.content.rendered ? String(item.content.rendered).trim() : '';
  if (wpContent) return wpContent;
  if (fallbackText) return formatText(fallbackText);
  return '<p>Contenido pendiente de ampliar desde WordPress.</p>';
}

function renderHeader(config) {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a>
      <nav class="nav" aria-label="Menú principal">
        <a href="/el-menu/"${config.basePath === '/el-menu' ? ' class="is-active" aria-current="page"' : ''}>El Menú</a>
        <a href="/nuestros-menus/"${config.basePath === '/nuestros-menus' ? ' class="is-active" aria-current="page"' : ''}>Nuestros menús</a>
        <a href="/sectores/">Sectores</a>
        <a href="/la-receta/">La Receta</a>
        <a href="/la-rebotica/">La Rebotica</a>
        <a class="nav-mobile-contact" href="/hablamos/">¿Hablamos?</a>
        <a class="nav-mobile-cta" href="/hablamos/">Pide tu cata digital</a>
      </nav>
      <div class="header-actions">
        <a class="nav-contact" href="/hablamos/">¿Hablamos?</a>
        <a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a>
        <button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div><h2>Salero Digital</h2><p>Agencia de aquí, para los de aquí. Estrategia, web, SEO, redes y campañas para negocios que quieren dejar de estar sosos en internet.</p></div>
        <div><h3>Secciones</h3><nav class="footer-nav"><a href="/nuestros-menus/">Nuestros menús</a><a href="/el-menu/">El Menú</a><a href="/sectores/">Sectores</a><a href="/la-rebotica/">La Rebotica</a></nav></div>
        <div><h3>Contacto</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="/hablamos/">¿Te hace un café y hablamos?</a>`;
}

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Salero Digital</title><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body><main class="container section"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a class="btn btn-primary" href="/">Volver al inicio</a></p></main></body></html>`;
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate'
    }
  });
}

function getAcf(item = {}) {
  return item.salero_acf || item.acf || {};
}

function fieldValue(a = {}, keys = [], fallback = '') {
  for (const key of keys) {
    const v = a[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length) return v;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) return v;
    if (typeof v !== 'object' && String(v).trim() !== '') return v;
  }
  return fallback;
}

function fieldUrl(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return '';
  if (Array.isArray(v)) return fieldUrl(v[0]);
  if (typeof v === 'object') return v.url || v.source_url || v.guid?.rendered || v.sizes?.large || v.sizes?.full || v.sizes?.medium_large || '';
  return '';
}

function formatList(v) {
  const items = fieldList(v);
  return items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

function fieldList(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === 'string') return stripHtml(item).trim();
      if (item && typeof item === 'object') return stripHtml(item.text || item.label || item.titulo || item.title || item.nombre || item.value || item.item || item.punto || '').trim();
      return '';
    }).filter(Boolean);
  }
  const text = stripHtml(String(v)).trim();
  if (!text) return [];
  return text.split(/\n+|;|\|/).map(x => x.replace(/^[-•–]\s*/, '').trim()).filter(Boolean);
}

function formatFaqs(v) {
  if (!v) return '';
  const rows = Array.isArray(v) ? v : String(v).split(/\n{2,}/).map(row => row.trim()).filter(Boolean);
  const items = rows.map(row => {
    if (typeof row === 'object') {
      const q = stripHtml(row.pregunta || row.question || row.titulo || row.title || '');
      const a = stripHtml(row.respuesta || row.answer || row.texto || row.content || '');
      return q && a ? { q, a } : null;
    }
    const text = stripHtml(String(row));
    const [q, ...rest] = text.split('?');
    const question = q ? `${q.trim()}?` : '';
    const answer = rest.join('?').trim();
    return question && answer ? { q: question, a: answer } : null;
  }).filter(Boolean);

  return items.length ? `<div class="faq-list">${items.map((item, index) => `<details ${index === 0 ? 'open' : ''}><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('')}</div>` : '';
}

function formatText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return formatList(value);
  if (typeof value === 'object') return formatText(value.rendered || value.text || value.value || '');
  const text = String(value).trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

function itemTitle(item = {}) {
  return stripHtml(item.title?.rendered || item.title || '');
}

function excerpt(item = {}) {
  return stripHtml(item.excerpt?.rendered || '');
}

function featuredImage(item = {}) {
  return item._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
}

function normalizeUrl(value = '') {
  const url = fieldUrl(value) || String(value || '').trim();
  if (!url) return '/hablamos/';
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('#')) return url;
  return `/${url.replace(/^\/+/, '')}`;
}

function sanitizeSlug(value = '') {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '').split('/')[0];
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}
