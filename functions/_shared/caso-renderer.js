const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://salero.webagencia360.com';

export async function handleCasoRequest(context) {
  const slug = sanitizeSlug(context.params.slug || '');

  if (!slug) {
    return htmlResponse(renderErrorPage('Caso no encontrado', 'No se ha recibido un slug válido para cargar este caso de éxito.'), 404);
  }

  try {
    const item = await fetchCaso(slug);

    if (!item) {
      return htmlResponse(renderErrorPage('Caso no encontrado', `No existe ningún caso publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    return htmlResponse(renderCasoPage(slug, item), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el caso desde WordPress', String(error && error.message ? error.message : error)), 502);
  }
}

async function fetchCaso(slug) {
  const endpoints = ['casos-exito'];

  for (const endpoint of endpoints) {
    const bySlug = new URL(`${CMS_API_BASE}/${endpoint}`);
    bySlug.searchParams.set('slug', slug);
    bySlug.searchParams.set('_embed', '1');
    bySlug.searchParams.set('_t', String(Date.now()));

    const response = await fetch(bySlug.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SaleroDigital-Casos-SSR'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) return data[0];
    }

    const collection = new URL(`${CMS_API_BASE}/${endpoint}`);
    collection.searchParams.set('per_page', '100');
    collection.searchParams.set('_embed', '1');
    collection.searchParams.set('_t', String(Date.now()));

    const collectionResponse = await fetch(collection.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SaleroDigital-Casos-SSR'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    if (collectionResponse.ok) {
      const data = await collectionResponse.json();
      if (Array.isArray(data)) {
        const found = data.find(item => itemSlug(item) === slug || slugify(itemTitle(item)) === slug || slugify(fieldValue(getAcf(item), ['cliente_nombre', 'nombre_caso', 'cliente'])) === slug);
        if (found) return found;
      }
    }
  }

  return null;
}

function renderCasoPage(slug, item) {
  const acf = getAcf(item);
  const title = stripHtml(fieldValue(acf, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], itemTitle(item) || 'Caso de éxito'));
  const visualLabel = stripHtml(fieldValue(acf, ['visual_label', 'etiqueta_visual'], 'Caso de éxito'));
  const sector = stripHtml(fieldValue(acf, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital'));
  const service = stripHtml(fieldValue(acf, ['servicio_principal', 'servicios', 'servicio'], 'Estrategia digital'));
  const proof = stripHtml(fieldValue(acf, ['dato_destacado', 'mejora_conseguida'], 'Proyecto real de Salero Digital'));
  const summary = stripHtml(fieldValue(acf, ['descripcion_corta', 'resumen'], excerpt(item) || proof));
  const metaTitle = stripHtml(fieldValue(acf, ['seo_title', 'meta_title', 'title_seo'], `${title} | Caso de éxito`));
  const metaDescription = stripHtml(fieldValue(acf, ['seo_description', 'meta_description'], summary)).slice(0, 165);
  const canonical = `${SITE_ORIGIN}/casos-de-exito/${slug}/`;

  const videoUrl = mediaUrl(fieldValue(acf, ['video_principal', 'video_principal_url', 'video_caso', 'video_campana', 'video'], ''));
  const posterUrl = mediaUrl(fieldValue(acf, ['video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], featuredImage(item) || ''));
  const imageUrl = mediaUrl(fieldValue(acf, ['imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], featuredImage(item) || ''));
  const logoUrl = mediaUrl(fieldValue(acf, ['logo_cliente', 'logo_marca', 'logo'], ''));

  const reto = htmlValue(fieldValue(acf, ['reto', 'reto_inicial'], ''));
  const solucion = htmlValue(fieldValue(acf, ['solucion', 'estrategia_aplicada', 'acciones_realizadas'], ''));
  const resultado = htmlValue(fieldValue(acf, ['resultado', 'resultados'], ''));
  const aprendizaje = htmlValue(fieldValue(acf, ['aprendizaje', 'que_demuestra'], ''));
  const servicios = fieldList(fieldValue(acf, ['servicios_trabajados', 'servicios_aplicados'], []));
  const herramientas = fieldList(fieldValue(acf, ['herramientas'], []));
  const metricas = Array.isArray(acf.metricas) ? acf.metricas : [];
  const galeria = Array.isArray(acf.galeria_caso) ? acf.galeria_caso : [];

  const ctaText = stripHtml(fieldValue(acf, ['cta_texto'], 'Quiero una estrategia parecida'));
  const ctaUrl = normalizeUrl(fieldValue(acf, ['cta_url'], '/hablamos/'));
  const ctaSecondary = stripHtml(fieldValue(acf, ['cta_secundario'], 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.'));

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
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/caso-de-exito-detalle.css?v=4">
</head>
<body class="caso-detalle-page caso-${escapeAttr(slug)}">
${renderHeader()}
  <main id="caso-detalle-root" class="caso-detalle-root" data-caso-slug="${escapeAttr(slug)}">
    <section class="caso-detail-hero caso-detail-hero-media">
      ${renderHeroBackdrop({ videoUrl, posterUrl, imageUrl, title })}
      <div class="caso-detail-grain" aria-hidden="true"></div>
      <div class="caso-detail-hero-overlay" aria-hidden="true"></div>
      <div class="container caso-detail-hero-inner">
        <nav class="caso-breadcrumb" aria-label="Migas de pan">
          <a href="/">Inicio</a>
          <span aria-hidden="true">/</span>
          <a href="/casos-de-exito/">Casos de éxito</a>
          <span aria-hidden="true">/</span>
          <strong>${escapeHtml(title)}</strong>
        </nav>

        <div class="caso-detail-copy">
          <span class="eyebrow">Caso de éxito</span>
          <h1>${escapeHtml(title)}</h1>
          ${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ''}
          <div class="caso-detail-tags caso-detail-tags-hero" aria-label="Resumen del caso">
            <span class="is-sal">${escapeHtml(visualLabel)}</span>
            <span class="is-lima">${escapeHtml(sector)}</span>
            <span class="is-lima">${escapeHtml(service)}</span>
          </div>
          <div class="caso-detail-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="#caso-receta">Ver la receta</a></div>
        </div>
      </div>
    </section>

    <section class="caso-proof-band" aria-label="Resumen del caso">
      <div class="container caso-proof-grid">
        <article><span>Sector</span><strong>${escapeHtml(sector)}</strong></article>
        <article><span>Servicio principal</span><strong>${escapeHtml(service)}</strong></article>
        <article><span>Qué demuestra</span><strong>${escapeHtml(proof)}</strong></article>
      </div>
    </section>

    <section class="caso-detail-body" id="caso-receta">
      <div class="container caso-detail-body-grid">
        <aside class="caso-detail-sticky">
          <span class="eyebrow">La receta</span>
          <h2>Menos escaparate y más argumento.</h2>
          <div class="caso-detail-summary-card">
            <p>Este caso no va solo de enseñar una web bonita. Va de explicar el contexto, la decisión estratégica y la solución digital que había detrás.</p>
            <dl>
              <div><dt>Proyecto</dt><dd>${escapeHtml(title)}</dd></div>
              <div><dt>Prueba</dt><dd>${escapeHtml(proof)}</dd></div>
            </dl>
          </div>
        </aside>
        <div class="caso-detail-content">
          ${renderSection('El reto', reto, 'reto', '01')}
          ${renderSection('La receta aplicada', solucion, 'solucion', '02')}
          ${renderSection('El resultado', resultado, 'resultado', '03')}
          ${renderSection('Qué demuestra este caso', aprendizaje, 'aprendizaje', '04')}
          ${renderListSection('Servicios trabajados', servicios, 'servicios')}
          ${renderListSection('Herramientas usadas', herramientas, 'herramientas')}
          ${renderMetrics(metricas)}
        </div>
      </div>
    </section>

    ${renderGallery(galeria)}

    <section class="caso-detail-cta">
      <div class="container">
        <div class="caso-detail-cta-card">
          <span class="eyebrow">El siguiente caso puede ser el tuyo</span>
          <h2>¿Quieres una solución digital con este nivel de intención?</h2>
          ${ctaSecondary ? `<p>${escapeHtml(ctaSecondary)}</p>` : ''}
          <div class="hero-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div>
        </div>
      </div>
    </section>
  </main>
${renderFooter()}
  <script src="/assets/js/helpers.js?v=41"></script>
</body>
</html>`;
}

function renderHeroBackdrop({ videoUrl, posterUrl, imageUrl, title }) {
  const media = videoUrl
    ? `<video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''}><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>`
    : imageUrl
      ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" loading="eager">`
      : '';

  return `<div class="caso-hero-backdrop" aria-hidden="true">${media}</div>`;
}

function renderHeroMedia({ videoUrl, posterUrl, imageUrl, logoUrl, title }) {
  const media = videoUrl
    ? `<video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''}><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>`
    : imageUrl
      ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" loading="eager">`
      : `<div class="caso-detail-media-fallback" aria-hidden="true"></div>`;

  return `<div class="caso-detail-media">${media}${logoUrl ? `<span class="caso-detail-logo"><img src="${escapeAttr(logoUrl)}" alt="Logo de ${escapeAttr(title)}"></span>` : ''}</div>`;
}

function renderSection(title, html, modifier = '', number = '') {
  if (!html) return '';
  const mod = modifier ? ` caso-detail-section-${escapeAttr(modifier)}` : '';
  const numberHtml = number ? `<span class="caso-section-number">${escapeHtml(number)}</span>` : '';
  return `<section class="caso-detail-section${mod}">${numberHtml}<h3>${escapeHtml(title)}</h3>${html}</section>`;
}

function renderListSection(title, list, modifier = '') {
  if (!Array.isArray(list) || !list.length) return '';
  const mod = modifier ? ` caso-detail-section-${escapeAttr(modifier)}` : '';
  return `<section class="caso-detail-section caso-detail-list-section${mod}"><h3>${escapeHtml(title)}</h3><ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
}

function renderMetrics(metricas) {
  if (!Array.isArray(metricas) || !metricas.length) return '';
  const html = metricas.map(metric => {
    const label = stripHtml(fieldValue(metric, ['metrica', 'label', 'nombre'], ''));
    const value = stripHtml(fieldValue(metric, ['valor', 'value', 'dato'], ''));
    const desc = stripHtml(fieldValue(metric, ['descripcion', 'description'], ''));
    if (!label && !value && !desc) return '';
    return `<article class="caso-metric"><strong>${escapeHtml(value || label)}</strong>${label && value ? `<span>${escapeHtml(label)}</span>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</article>`;
  }).filter(Boolean).join('');
  return html ? `<section class="caso-detail-section caso-detail-section-metricas"><h3>Métricas destacadas</h3><div class="caso-metrics">${html}</div></section>` : '';
}

function renderGallery(galeria) {
  if (!Array.isArray(galeria) || !galeria.length) return '';
  const html = galeria.map(item => {
    const tipo = stripHtml(fieldValue(item, ['tipo_medio', 'tipo'], 'imagen'));
    const img = mediaUrl(fieldValue(item, ['imagen'], ''));
    const vid = mediaUrl(fieldValue(item, ['video'], ''));
    const url = fieldValue(item, ['url_externa', 'url'], '');
    const title = stripHtml(fieldValue(item, ['titulo', 'title'], ''));
    const desc = stripHtml(fieldValue(item, ['descripcion', 'description'], ''));
    const alt = stripHtml(fieldValue(item, ['alt'], title || 'Recurso del caso'));
    let media = '';
    if (tipo === 'video' && vid) media = `<video controls preload="metadata"><source src="${escapeAttr(vid)}" type="video/mp4"></video>`;
    else if (tipo === 'url' && url) media = `<a class="caso-gallery-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">Ver recurso externo</a>`;
    else if (img) media = `<img src="${escapeAttr(img)}" alt="${escapeAttr(alt)}" loading="lazy">`;
    if (!media) return '';
    return `<article class="caso-gallery-item">${media}${title || desc ? `<div class="caso-gallery-caption">${title ? `<strong>${escapeHtml(title)}</strong>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</div>` : ''}</article>`;
  }).filter(Boolean).join('');
  return html ? `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material del proyecto</span><h2>Una mirada más visual al trabajo realizado</h2></div><div class="caso-gallery-grid">${html}</div></div></section>` : '';
}

function renderHeader() {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a>
      <nav class="nav" aria-label="Menú principal">
        <a href="/el-menu/">El Menú</a>
        <a href="/nuestros-menus/">Nuestros menús</a>
        <a href="/sectores/">Sectores</a>
        <a href="/casos-de-exito/" class="is-active" aria-current="page">Casos de éxito</a>
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
        <div><h2>Salero Digital</h2><p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p></div>
        <div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div>
        <div><h3>Casos de éxito</h3><nav class="footer-nav"><a href="/casos-de-exito/">Ver portfolio</a><a href="/sectores/">Ver sectores</a><a href="/nuestros-menus/">Ver menús</a></nav></div>
        <div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
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

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main><section class="caso-detail-loading"><div class="container"><span class="eyebrow">Casos de éxito</span><h1>${escapeHtml(title)}</h1><p>${message}</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section></main>${renderFooter()}</body></html>`;
}

function getAcf(item) {
  return item && (item.acf || item.salero_acf || item.meta || {}) || {};
}

function itemTitle(item) {
  return stripHtml(fieldValue(item, ['title'], '')) || stripHtml(item && item.title && item.title.rendered ? item.title.rendered : '');
}

function itemSlug(item) {
  const slug = stripHtml(fieldValue(item, ['slug', 'post_name'], ''));
  if (slug && !/^\d+$/.test(slug)) return sanitizeSlug(slug);
  return slugify(fieldValue(getAcf(item), ['cliente_nombre', 'nombre_caso', 'cliente'], itemTitle(item)));
}

function excerpt(item) {
  return item && item.excerpt && item.excerpt.rendered ? stripHtml(item.excerpt.rendered) : '';
}

function featuredImage(item) {
  const embedded = item && item._embedded;
  const media = embedded && embedded['wp:featuredmedia'] && embedded['wp:featuredmedia'][0];
  return mediaUrl(media);
}

function fieldValue(source, keys, fallback = '') {
  if (!source) return fallback;
  for (const key of keys) {
    if (typeof source[key] !== 'undefined' && source[key] !== null && source[key] !== '') return source[key];
  }
  return fallback;
}

function fieldList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => stripHtml(valueToString(item))).filter(Boolean);
  return String(stripHtml(valueToString(value))).split(/\n|,/).map(item => item.trim()).filter(Boolean);
}

function valueToString(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const candidates = [value.rendered, value.raw, value.title, value.name, value.label, value.value, value.text, value.alt, value.url, value.source_url];
    for (const candidate of candidates) {
      const result = valueToString(candidate);
      if (result && result !== '[object Object]') return result;
    }
  }
  return '';
}

function htmlValue(value) {
  if (!value) return '';
  if (typeof value === 'object' && value.rendered) return value.rendered;
  return formatText(valueToString(value));
}

function mediaUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.url) return value.url;
    if (value.source_url) return value.source_url;
    if (value.guid && value.guid.rendered) return value.guid.rendered;
    if (value.sizes) {
      if (value.sizes.large) return value.sizes.large;
      if (value.sizes.medium_large) return value.sizes.medium_large;
      if (value.sizes.full) return value.sizes.full;
    }
    if (value.media_details && value.media_details.sizes) {
      const sizes = value.media_details.sizes;
      if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
      if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
      if (sizes.full && sizes.full.source_url) return sizes.full.source_url;
    }
  }
  return '';
}

function normalizeUrl(url) {
  const value = stripHtml(valueToString(url));
  if (!value) return '/hablamos/';
  if (value.startsWith('http') || value.startsWith('/')) return value;
  return `/${value.replace(/^\/+/, '')}`;
}

function formatText(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (/<[a-z][\s\S]*>/i.test(clean)) return clean;
  return clean.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph.trim())}</p>`).join('');
}

function sanitizeSlug(slug) {
  return String(slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/^-|-$/g, '');
}

function slugify(value) {
  return stripHtml(valueToString(value)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
