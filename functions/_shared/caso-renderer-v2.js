const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://agenciaconsalero.es';
const CMS_ORIGIN = 'https://cms.webagencia360.com';
const MEDIA_CACHE = new Map();

export async function handleCasoRequest(context) {
  const slug = sanitizeSlug(String(context.params.slug || context.params.path || '').split('/')[0] || '');

  if (!slug) {
    return htmlResponse(renderErrorPage('Caso no encontrado', 'No se ha recibido un slug válido para cargar este caso de éxito.'), 404);
  }

  try {
    const item = await fetchCaso(slug);
    if (!item) {
      return htmlResponse(renderErrorPage('Caso no encontrado', `No existe ningún caso publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    const hydrated = await hydrateCasoMedia(item);
    return htmlResponse(renderCasoPage(slug, hydrated), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el caso desde WordPress', String(error && error.message ? error.message : error)), 500);
  }
}

async function fetchCaso(slug) {
  const url = new URL(`${CMS_API_BASE}/casos-exito`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_embed', '1');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': 'SaleroDigital-Casos-SSR-v2' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data) && data.length) return data[0];
  }

  const collectionUrl = new URL(`${CMS_API_BASE}/casos-exito`);
  collectionUrl.searchParams.set('per_page', '100');
  collectionUrl.searchParams.set('_embed', '1');
  collectionUrl.searchParams.set('_t', String(Date.now()));

  const collectionResponse = await fetch(collectionUrl.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': 'SaleroDigital-Casos-SSR-v2' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (!collectionResponse.ok) return null;
  const data = await collectionResponse.json();
  if (!Array.isArray(data)) return null;

  return data.find(item => sanitizeSlug(item.slug) === slug || slugify(itemTitle(item)) === slug || slugify(textField(getAcf(item), ['cliente_nombre', 'nombre_caso', 'cliente'])) === slug) || null;
}

async function hydrateCasoMedia(item) {
  const acf = getAcf(item);
  const keys = [
    'hero_video', 'video_hero', 'video_fondo', 'fondo_video', 'background_video', 'hero_background_video',
    'video_portada', 'portada_video', 'video_principal', 'video_principal_url', 'video_principal_caso', 'video_caso', 'video_campana', 'video',
    'hero_poster', 'poster_hero', 'video_poster', 'poster_video', 'poster',
    'hero_image', 'imagen_hero', 'imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image',
    'logo_cliente', 'logo_marca', 'logo'
  ];

  await Promise.all(keys.map(async key => {
    if (!acf || typeof acf[key] === 'undefined') return;
    const resolved = await resolveMaybeMedia(acf[key]);
    if (resolved) acf[key] = resolved;
  }));

  if (Array.isArray(acf.galeria_caso)) {
    await Promise.all(acf.galeria_caso.map(async row => {
      if (!row || typeof row !== 'object') return;
      if (typeof row.imagen !== 'undefined') {
        const resolvedImage = await resolveMaybeMedia(row.imagen);
        if (resolvedImage) row.imagen = resolvedImage;
      }
      if (typeof row.video !== 'undefined') {
        const resolvedVideo = await resolveMaybeMedia(row.video);
        if (resolvedVideo) row.video = resolvedVideo;
      }
    }));
  }

  return item;
}

async function resolveMaybeMedia(value) {
  if (!value) return null;
  if (mediaUrl(value)) return value;

  const id = mediaId(value);
  if (!id) return null;
  return fetchMediaById(id);
}

function mediaId(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  if (value && typeof value === 'object') {
    const candidate = value.ID || value.id || value.attachment_id || value.media_id;
    if (candidate && /^\d+$/.test(String(candidate))) return Number(candidate);
  }
  return 0;
}

async function fetchMediaById(id) {
  if (!id) return null;
  if (MEDIA_CACHE.has(id)) return MEDIA_CACHE.get(id);

  const response = await fetch(`${CMS_API_BASE}/media/${id}?_t=${Date.now()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'SaleroDigital-Casos-SSR-v2' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (!response.ok) return null;
  const media = await response.json();
  MEDIA_CACHE.set(id, media);
  return media;
}

function renderCasoPage(slug, item) {
  const acf = getAcf(item);
  const title = textField(acf, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], itemTitle(item) || 'Caso de éxito');
  const visualLabel = textField(acf, ['visual_label', 'etiqueta_visual'], 'Caso de éxito');
  const sector = textField(acf, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital');
  const service = textField(acf, ['servicio_principal', 'servicio', 'servicios'], 'Estrategia digital');
  const proof = textField(acf, ['dato_destacado', 'mejora_conseguida', 'que_demuestra_resumen', 'resumen_prueba'], 'Proyecto real de Salero Digital');
  const summary = textField(acf, ['descripcion_corta', 'resumen'], excerpt(item) || proof);
  const metaTitle = textField(acf, ['seo_title', 'meta_title', 'title_seo'], `${title} | Caso de éxito`);
  const metaDescription = textField(acf, ['seo_description', 'meta_description'], summary).slice(0, 165);
  const canonical = `${SITE_ORIGIN}/casos-de-exito/${slug}/`;

  const fallbackMueblesVideo = slug === 'muebles-sarria' ? 'https://cms.webagencia360.com/wp-content/uploads/2026/05/AQMPbTuJE7wCMpXcqX-P7dl5D-RhLpg4GyGgG7iH0g9ozcAoIfFUNl6vouwcoKqbFsL_TVojBz9xFlNS76ujCIAe.mp4' : '';
  const videoUrl = mediaUrl(valueField(acf, ['hero_video', 'video_hero', 'video_fondo', 'fondo_video', 'background_video', 'hero_background_video', 'video_portada', 'portada_video', 'video_principal', 'video_principal_url', 'video_principal_caso', 'video_caso', 'video_campana', 'video'], fallbackMueblesVideo));
  const posterUrl = mediaUrl(valueField(acf, ['hero_poster', 'poster_hero', 'video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], featuredImage(item) || ''));
  const imageUrl = mediaUrl(valueField(acf, ['hero_image', 'imagen_hero', 'imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], featuredImage(item) || ''));

  const reto = htmlField(acf, ['reto', 'reto_inicial']);
  const solucion = htmlField(acf, ['solucion', 'estrategia_aplicada', 'acciones_realizadas', 'receta_aplicada']);
  const resultado = htmlField(acf, ['resultado', 'resultados']);
  const aprendizaje = htmlField(acf, ['que_demuestra_este_caso', 'que_demuestra', 'aprendizaje', 'lectura_estrategica']);
  const servicios = fieldList(valueField(acf, ['servicios_trabajados', 'servicios_implicados', 'servicios_aplicados'], []));
  const herramientas = fieldList(valueField(acf, ['herramientas', 'herramientas_usadas'], []));
  const metricas = Array.isArray(acf.metricas) ? acf.metricas : [];
  const galeria = Array.isArray(acf.galeria_caso) ? acf.galeria_caso : [];

  const ctaText = textField(acf, ['cta_texto'], 'Quiero una estrategia parecida');
  const ctaUrl = normalizeUrl(textField(acf, ['cta_url'], '/hablamos/'));
  const ctaSecondary = textField(acf, ['cta_secundario'], 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.');

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
  <link rel="stylesheet" href="/assets/css/caso-de-exito-detalle.css?v=20">
  <link rel="stylesheet" href="/assets/css/caso-receta-carousel.css?v=8">
  <link rel="stylesheet" href="/assets/css/caso-receta-carousel-fix.css?v=2">
</head>
<body class="caso-detalle-page caso-${escapeAttr(slug)}">
${renderHeader()}
  <main id="caso-detalle-root" class="caso-detalle-root" data-caso-slug="${escapeAttr(slug)}">
    <section class="caso-detail-hero caso-detail-hero-media">
      ${renderHeroBackdrop({ videoUrl, posterUrl, imageUrl, title })}
      <div class="caso-detail-grain" aria-hidden="true"></div>
      <div class="caso-detail-hero-overlay" aria-hidden="true"></div>
      <div class="container caso-detail-hero-inner">
        <nav class="caso-breadcrumb" aria-label="Migas de pan"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/casos-de-exito/">Casos de éxito</a><span aria-hidden="true">/</span><a href="${escapeAttr(canonical)}" aria-current="page">${escapeHtml(title)}</a></nav>
        <div class="caso-hero-layout"><div class="caso-detail-copy"><div class="caso-detail-tags caso-detail-tags-hero" aria-label="Resumen del caso"><span class="is-sal">${escapeHtml(visualLabel)}</span><span class="is-lima">${escapeHtml(sector)}</span><span class="is-lima">${escapeHtml(service)}</span></div><h1>${escapeHtml(title)}</h1>${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ''}<div class="caso-detail-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="#caso-receta">Ver la receta</a></div></div></div>
      </div>
    </section>
    <section class="caso-proof-band" aria-label="Resumen del caso"><div class="container caso-proof-grid"><article><span>Sector</span><strong>${escapeHtml(sector)}</strong></article><article><span>Servicio principal</span><strong>${escapeHtml(service)}</strong></article><article><span>Qué demuestra</span><strong>${escapeHtml(proof)}</strong></article></div></section>
    <section class="caso-detail-body" id="caso-receta"><div class="container caso-detail-body-grid"><aside class="caso-detail-sticky"><span class="eyebrow">La receta</span><h2>Menos escaparate y más argumento.</h2><div class="caso-detail-summary-card"><p>Este caso no va solo de enseñar una web bonita. Va de explicar el contexto, la decisión estratégica y la solución digital que había detrás.</p><dl><div><dt>Proyecto</dt><dd>${escapeHtml(title)}</dd></div><div><dt>Prueba</dt><dd>${escapeHtml(proof)}</dd></div></dl></div></aside><div class="caso-detail-content" aria-label="Secuencia de la receta aplicada">${renderSection('El reto', reto, 'reto', '01')}${renderSection('La receta aplicada', solucion, 'solucion', '02')}${renderSection('El resultado', resultado, 'resultado', '03')}${renderSection('Qué demuestra este caso', aprendizaje, 'aprendizaje', '04')}${renderListSection('Servicios trabajados', servicios, 'servicios')}${renderListSection('Herramientas usadas', herramientas, 'herramientas')}${renderMetrics(metricas)}</div></div></section>
    ${renderGallery(galeria, { imageUrl, videoUrl, posterUrl, title })}
    <section class="caso-detail-cta"><div class="container"><div class="caso-detail-cta-card"><span class="eyebrow">El siguiente caso puede ser el tuyo</span><h2>¿Quieres una solución digital con este nivel de intención?</h2>${ctaSecondary ? `<p>${escapeHtml(ctaSecondary)}</p>` : ''}<div class="hero-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div></div></div></section>
  </main>
${renderFooter()}
  <script src="/assets/js/helpers.js?v=41"></script>
  <script src="/assets/js/caso-receta-carousel.js?v=2"></script>
</body>
</html>`;
}

function renderHeroBackdrop({ videoUrl, posterUrl, imageUrl, title }) {
  const media = videoUrl ? `<video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''}><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>` : imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" loading="eager">` : '';
  return `<div class="caso-hero-backdrop" aria-hidden="true">${media}</div>`;
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
    const label = textField(metric, ['metrica', 'label', 'nombre'], '');
    const value = textField(metric, ['valor', 'value', 'dato'], '');
    const desc = textField(metric, ['descripcion', 'description'], '');
    if (!label && !value && !desc) return '';
    return `<article class="caso-metric"><strong>${escapeHtml(value || label)}</strong>${label && value ? `<span>${escapeHtml(label)}</span>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</article>`;
  }).filter(Boolean).join('');
  return html ? `<section class="caso-detail-section caso-detail-section-metricas"><h3>Métricas destacadas</h3><div class="caso-metrics">${html}</div></section>` : '';
}

function renderGallery(galeria, primary = {}) {
  const galleryItems = Array.isArray(galeria) ? [...galeria] : [];
  if (primary.videoUrl || primary.imageUrl) galleryItems.unshift({ tipo_medio: primary.videoUrl ? 'video' : 'imagen', video: primary.videoUrl || '', imagen: primary.imageUrl || primary.posterUrl || '', alt: primary.title || 'Imagen principal del proyecto' });
  const seen = new Set();
  const html = galleryItems.map(item => {
    const tipo = textField(item, ['tipo_medio', 'tipo'], 'imagen');
    const img = mediaUrl(valueField(item, ['imagen'], ''));
    const vid = mediaUrl(valueField(item, ['video'], ''));
    const alt = textField(item, ['alt'], primary.title || 'Imagen del proyecto');
    const key = vid || img;
    if (!key || seen.has(key)) return '';
    seen.add(key);
    if (tipo === 'video' && vid) return `<article class="caso-gallery-item"><video controls preload="metadata" ${img ? `poster="${escapeAttr(img)}"` : ''}><source src="${escapeAttr(vid)}" type="video/mp4"></video></article>`;
    if (img) return `<article class="caso-gallery-item"><img src="${escapeAttr(img)}" alt="${escapeAttr(alt)}" loading="lazy"></article>`;
    return '';
  }).filter(Boolean).join('');
  return html ? `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material visual</span><h2>Píldoras de Sal</h2></div><div class="caso-gallery-grid">${html}</div></div></section>` : '';
}

function renderHeader() {
  return `  <header class="site-header"><div class="container header-inner"><a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a><nav class="nav" aria-label="Menú principal"><a href="/el-menu/">El Menú</a><a href="/nuestros-menus/">Nuestros menús</a><a href="/sectores/">Sectores</a><a href="/casos-de-exito/" class="is-active" aria-current="page">Casos de éxito</a><a href="/la-rebotica/">La Rebotica</a><a class="nav-mobile-contact" href="/hablamos/">¿Hablamos?</a><a class="nav-mobile-cta" href="/hablamos/">Pide tu cata digital</a></nav><div class="header-actions"><a class="nav-contact" href="/hablamos/">¿Hablamos?</a><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button></div></div></header>`;
}

function renderFooter() {
  return `  <footer class="footer"><div class="container"><div class="footer-grid"><div><h2>Salero Digital</h2><p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p></div><div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div><div><h3>Sectores</h3><nav class="footer-nav"><a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a><a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a><a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a></nav></div><div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div></div><div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div></div></footer><a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
}

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container" style="padding:9rem 0"><span class="eyebrow">Caso de éxito</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></main>${renderFooter()}</body></html>`;
}

function getAcf(item = {}) { return item.salero_acf || item.acf || item.meta || {}; }
function itemTitle(item = {}) { return textFromValue(item.title); }
function excerpt(item = {}) { return textFromValue(item.excerpt); }
function sanitizeSlug(value = '') { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); }
function slugify(value = '') { return sanitizeSlug(textFromValue(value)); }

function valueField(source = {}, keys = [], fallback = '') {
  for (const key of keys) {
    if (source && typeof source[key] !== 'undefined' && source[key] !== null && source[key] !== '') return source[key];
  }
  return fallback;
}

function textField(source = {}, keys = [], fallback = '') { return stripHtml(textFromValue(valueField(source, keys, fallback))).trim(); }
function htmlField(source = {}, keys = []) { return htmlFromValue(valueField(source, keys, '')); }

function textFromValue(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textFromValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return textFromValue(value.rendered || value.raw || value.title || value.name || value.label || value.value || value.text || value.url || value.source_url || '');
  return '';
}

function htmlFromValue(value) {
  if (!value) return '';
  if (typeof value === 'object' && value.rendered) return value.rendered;
  const text = textFromValue(value).trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function fieldList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(textFromValue).map(item => item.trim()).filter(Boolean);
  return textFromValue(value).split(/\n|,/).map(item => item.trim()).filter(Boolean);
}

function mediaUrl(media) {
  if (!media) return '';
  if (typeof media === 'string') {
    const clean = media.trim();
    const absoluteMatch = clean.match(/https?:\/\/[^\s"'<>]+/i);
    if (absoluteMatch) return absoluteMatch[0];
    if (clean.startsWith('/wp-content/') || clean.startsWith('/uploads/')) return `${CMS_ORIGIN}${clean}`;
    if (clean.startsWith('wp-content/') || clean.startsWith('uploads/')) return `${CMS_ORIGIN}/${clean}`;
    return '';
  }
  if (typeof media === 'object') {
    if (media.url) return mediaUrl(media.url);
    if (media.source_url) return mediaUrl(media.source_url);
    if (media.guid && media.guid.rendered) return mediaUrl(media.guid.rendered);
    if (media.media_details && media.media_details.sizes) {
      const sizes = media.media_details.sizes;
      if (sizes.large && sizes.large.source_url) return mediaUrl(sizes.large.source_url);
      if (sizes.medium_large && sizes.medium_large.source_url) return mediaUrl(sizes.medium_large.source_url);
      if (sizes.full && sizes.full.source_url) return mediaUrl(sizes.full.source_url);
    }
  }
  return '';
}

function featuredImage(item = {}) {
  const media = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
  return mediaUrl(media);
}

function normalizeUrl(value = '') { const clean = textFromValue(value).trim(); return clean || '/hablamos/'; }
function stripHtml(value = '') { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '); }
function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function escapeAttr(value = '') { return escapeHtml(value); }
function htmlResponse(html, status = 200) { return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }); }
