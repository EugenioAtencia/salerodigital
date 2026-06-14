const CMS_ORIGIN = 'https://cms.webagencia360.com';
const SITE_ORIGIN = 'https://agenciaconsalero.es';

export async function handleCasoRequest(context) {
  const slug = getSlug(context);
  if (!slug) return response(errorPage('Caso no encontrado', 'No se ha recibido un slug válido.'), 404);

  try {
    const item = await fetchCase(slug);
    if (!item) return response(errorPage('Caso no encontrado', `No existe un JSON estático para ${escapeHtml(slug)}.`), 404);
    return response(renderPage(slug, item), 200);
  } catch (error) {
    return response(errorPage('No se pudo cargar el caso desde el JSON estático', error && error.message ? error.message : String(error)), 500);
  }
}

function getSlug(context) {
  const raw = context.params && (context.params.slug || context.params.path || '');
  const value = Array.isArray(raw) ? raw[0] : String(raw || '').split('/')[0];
  return sanitizeSlug(value);
}

async function fetchCase(slug) {
  const url = `${CMS_ORIGIN}/wp-content/uploads/salero-json/casos/${encodeURIComponent(slug)}.json?_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'SaleroDigital-StaticCaseSSR' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  const body = await res.text();
  const trimmed = body.trim();
  if (!res.ok) throw new Error(`JSON estático HTTP ${res.status}: ${url}`);
  if (!trimmed.startsWith('{')) throw new Error(`El JSON estático no devolvió JSON: ${trimmed.slice(0, 120).replace(/\s+/g, ' ')}`);
  const json = JSON.parse(trimmed);
  if (!json || json.success !== true || !json.data) throw new Error('El JSON estático no contiene success true con data.');
  return json.data;
}

function renderPage(slug, item) {
  const acf = item.salero_acf || {};
  const title = text(acf, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], textValue(item.title) || 'Caso de éxito');
  const visualLabel = text(acf, ['visual_label', 'etiqueta_visual'], 'Caso de éxito');
  const sector = text(acf, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital');
  const service = text(acf, ['servicio_principal', 'servicio', 'servicios'], 'Estrategia digital');
  const proof = text(acf, ['dato_destacado', 'mejora_conseguida', 'que_demuestra_resumen', 'resumen_prueba'], 'Proyecto real de Salero Digital');
  const summary = text(acf, ['descripcion_corta', 'resumen'], proof);
  const metaTitle = text(acf, ['seo_title', 'meta_title', 'title_seo'], `${title} | Caso de éxito`);
  const metaDescription = text(acf, ['seo_description', 'meta_description'], summary).slice(0, 165);
  const canonical = `${SITE_ORIGIN}/casos-de-exito/${slug}/`;

  const videoUrl = media(field(acf, ['hero_video', 'video_hero', 'video_fondo', 'fondo_video', 'background_video', 'hero_background_video', 'video_portada', 'portada_video', 'video_principal', 'video_principal_url', 'video_principal_caso', 'video_caso', 'video_campana', 'video'], ''));
  const posterUrl = media(field(acf, ['hero_poster', 'poster_hero', 'video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], ''));
  const imageUrl = media(field(acf, ['hero_image', 'imagen_hero', 'imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], item.featured_image_url || ''));

  const reto = html(acf, ['reto', 'reto_inicial']);
  const solucion = html(acf, ['solucion', 'estrategia_aplicada', 'acciones_realizadas', 'receta_aplicada']);
  const resultado = html(acf, ['resultado', 'resultados']);
  const aprendizaje = html(acf, ['que_demuestra_este_caso', 'que_demuestra', 'aprendizaje', 'lectura_estrategica']);
  const servicios = normalizeServices(field(acf, ['servicios_trabajados', 'servicios_implicados', 'servicios_aplicados'], []));
  const herramientas = list(field(acf, ['herramientas', 'herramientas_usadas'], []));
  const metricas = Array.isArray(acf.metricas) ? acf.metricas : [];
  const galeria = Array.isArray(acf.galeria_caso) ? acf.galeria_caso : [];
  const ctaText = text(acf, ['cta_texto'], 'Quiero una estrategia parecida');
  const ctaUrl = text(acf, ['cta_url'], '/hablamos/') || '/hablamos/';
  const ctaSecondary = text(acf, ['cta_secundario'], 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.');

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
${header()}
<main id="caso-detalle-root" class="caso-detalle-root" data-caso-slug="${escapeAttr(slug)}">
  <section class="caso-detail-hero caso-detail-hero-media">
    ${heroMedia(videoUrl, posterUrl, imageUrl, title)}
    <div class="caso-detail-grain" aria-hidden="true"></div>
    <div class="caso-detail-hero-overlay" aria-hidden="true"></div>
    <div class="container caso-detail-hero-inner">
      <nav class="caso-breadcrumb" aria-label="Migas de pan"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/casos-de-exito/">Casos de éxito</a><span aria-hidden="true">/</span><a href="${escapeAttr(canonical)}" aria-current="page">${escapeHtml(title)}</a></nav>
      <div class="caso-hero-layout"><div class="caso-detail-copy"><div class="caso-detail-tags caso-detail-tags-hero"><span class="is-sal">${escapeHtml(visualLabel)}</span><span class="is-lima">${escapeHtml(sector)}</span><span class="is-lima">${escapeHtml(service)}</span></div><h1>${escapeHtml(title)}</h1>${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ''}<div class="caso-detail-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="#caso-receta">Ver la receta</a></div></div></div>
    </div>
  </section>
  <section class="caso-proof-band"><div class="container caso-proof-grid"><article><span>Sector</span><strong>${escapeHtml(sector)}</strong></article><article><span>Servicio principal</span><strong>${escapeHtml(service)}</strong></article><article><span>Qué demuestra</span><strong>${escapeHtml(proof)}</strong></article></div></section>
  <section class="caso-detail-body" id="caso-receta"><div class="container caso-detail-body-grid"><aside class="caso-detail-sticky"><span class="eyebrow">La receta</span><h2>Menos escaparate y más argumento.</h2><div class="caso-detail-summary-card"><p>Este caso no va solo de enseñar una web bonita. Va de explicar el contexto, la decisión estratégica y la solución digital que había detrás.</p><dl><div><dt>Proyecto</dt><dd>${escapeHtml(title)}</dd></div><div><dt>Prueba</dt><dd>${escapeHtml(proof)}</dd></div></dl></div></aside><div class="caso-detail-content">${section('El reto', reto, 'reto', '01')}${section('La receta aplicada', solucion, 'solucion', '02')}${section('El resultado', resultado, 'resultado', '03')}${section('Qué demuestra este caso', aprendizaje, 'aprendizaje', '04')}${listSection('Servicios trabajados', servicios, 'servicios')}${listSection('Herramientas usadas', herramientas, 'herramientas')}${metrics(metricas)}</div></div></section>
  ${gallery(galeria, { imageUrl, videoUrl, posterUrl, title })}
  <section class="caso-detail-cta"><div class="container"><div class="caso-detail-cta-card"><span class="eyebrow">El siguiente caso puede ser el tuyo</span><h2>¿Quieres una solución digital con este nivel de intención?</h2>${ctaSecondary ? `<p>${escapeHtml(ctaSecondary)}</p>` : ''}<div class="hero-actions"><a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div></div></div></section>
</main>
${footer()}
<script src="/assets/js/helpers.js?v=41"></script>
<script src="/assets/js/caso-receta-carousel.js?v=2"></script>
</body>
</html>`;
}

function heroMedia(videoUrl, posterUrl, imageUrl, title) {
  const mediaHtml = videoUrl
    ? `<video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''}><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>`
    : imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" loading="eager">` : '';
  return `<div class="caso-hero-backdrop" aria-hidden="true">${mediaHtml}</div>`;
}

function section(title, content, mod, num) { return content ? `<section class="caso-detail-section caso-detail-section-${escapeAttr(mod)}"><span class="caso-section-number">${escapeHtml(num)}</span><h3>${escapeHtml(title)}</h3>${content}</section>` : ''; }
function listSection(title, items, mod) { return items.length ? `<section class="caso-detail-section caso-detail-list-section caso-detail-section-${escapeAttr(mod)}"><h3>${escapeHtml(title)}</h3><ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul></section>` : ''; }
function metrics(items) { if (!items.length) return ''; const out = items.map(m => { const label = text(m, ['metrica', 'label', 'nombre'], ''); const value = text(m, ['valor', 'value', 'dato'], ''); const desc = text(m, ['descripcion', 'description'], ''); return label || value || desc ? `<article class="caso-metric"><strong>${escapeHtml(value || label)}</strong>${label && value ? `<span>${escapeHtml(label)}</span>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</article>` : ''; }).join(''); return out ? `<section class="caso-detail-section caso-detail-section-metricas"><h3>Métricas destacadas</h3><div class="caso-metrics">${out}</div></section>` : ''; }
function gallery(items, primary) { const all = [...(Array.isArray(items) ? items : [])]; if (primary.videoUrl || primary.imageUrl) all.unshift({ tipo_medio: primary.videoUrl ? 'video' : 'imagen', video: primary.videoUrl, imagen: primary.imageUrl || primary.posterUrl, alt: primary.title }); const seen = new Set(); const out = all.map(i => { const vid = media(field(i, ['video'], '')); const img = media(field(i, ['imagen'], '')); const key = vid || img; if (!key || seen.has(key)) return ''; seen.add(key); return vid ? `<article class="caso-gallery-item"><video controls preload="metadata" ${img ? `poster="${escapeAttr(img)}"` : ''}><source src="${escapeAttr(vid)}" type="video/mp4"></video></article>` : `<article class="caso-gallery-item"><img src="${escapeAttr(img)}" alt="${escapeAttr(text(i, ['alt'], primary.title))}" loading="lazy"></article>`; }).join(''); return out ? `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material visual</span><h2>Píldoras de Sal</h2></div><div class="caso-gallery-grid">${out}</div></div></section>` : ''; }

function header() { return `<header class="site-header"><div class="container header-inner"><a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a><nav class="nav" aria-label="Menú principal"></nav><div class="header-actions"><a class="nav-contact" href="/hablamos/">¿Hablamos?</a><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button></div></div></header>`; }
function footer() { return `<footer class="footer"><div class="container"><div class="footer-grid"><div><h2>Salero Digital</h2><p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p></div><div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div><div><h3>Sectores</h3><nav class="footer-nav"><a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a><a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a><a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a></nav></div><div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div></div><div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div></div></footer><a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`; }
function errorPage(title, msg) { return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${header()}<main class="container" style="padding:9rem 0"><span class="eyebrow">Caso de éxito</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(msg)}</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></main>${footer()}<script src="/assets/js/helpers.js?v=41"></script></body></html>`; }

function field(src, keys, fallback = '') { for (const k of keys) if (src && src[k] !== undefined && src[k] !== null && src[k] !== '' && src[k] !== false) return src[k]; return fallback; }
function text(src, keys, fallback = '') { return strip(textValue(field(src, keys, fallback))).trim(); }
function html(src, keys) { const v = field(src, keys, ''); if (!v) return ''; const t = textValue(v).trim(); if (!t) return ''; return /<[a-z][\s\S]*>/i.test(t) ? t : t.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function textValue(v) { if (v === null || v === undefined || v === false) return ''; if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v); if (Array.isArray(v)) return v.map(textValue).filter(Boolean).join(', '); if (typeof v === 'object') return textValue(v.rendered || v.raw || v.title || v.name || v.label || v.value || v.text || v.url || v.source_url || ''); return ''; }
function list(v) { if (!v) return []; if (Array.isArray(v)) return v.map(textValue).map(x => x.trim()).filter(Boolean); return textValue(v).split(/\n|,/).map(x => x.trim()).filter(Boolean); }
function normalizeServices(v) { const map = { web: 'Web', seo: 'SEO', ads: 'Publicidad digital', redes: 'Redes sociales', contenido: 'Contenido', email: 'Email marketing', sms: 'SMS', whatsapp: 'WhatsApp', automatizacion: 'Automatización', analitica: 'Analítica', soporte: 'Soporte técnico', streaming: 'Streaming' }; return list(v).map(x => map[x] || x); }
function media(v) { if (!v) return ''; if (typeof v === 'string') { const m = v.trim().match(/https?:\/\/[^\s"'<>]+/i); return m ? m[0].replace('http://cms.webagencia360.com', 'https://cms.webagencia360.com') : ''; } if (typeof v === 'object') return media(v.url || v.source_url || (v.sizes && (v.sizes.large || v.sizes.full || v.sizes.medium)) || ''); return ''; }
function sanitizeSlug(v = '') { return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); }
function strip(v = '') { return String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '); }
function escapeHtml(v = '') { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function escapeAttr(v = '') { return escapeHtml(v); }
function response(html, status = 200) { return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }); }
