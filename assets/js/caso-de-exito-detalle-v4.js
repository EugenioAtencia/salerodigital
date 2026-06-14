(function () {
  const CMS_ORIGIN = 'https://cms.webagencia360.com';
  const root = document.querySelector('[data-caso-detalle]');
  if (!root) return;

  const slug = slugFromPath();

  function slugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return last === 'detalle' ? '' : last;
  }

  function escapeHtml(value = '') {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stripHtml(value = '') {
    const div = document.createElement('div');
    div.innerHTML = String(value || '');
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeSlug(value = '') {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function valueFrom(input) {
    if (input === null || typeof input === 'undefined' || input === false) return '';
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input);
    if (Array.isArray(input)) return input.map(valueFrom).filter(Boolean).join(', ');
    if (typeof input === 'object') return valueFrom(input.rendered || input.raw || input.title || input.name || input.label || input.value || input.text || input.url || input.source_url || '');
    return '';
  }

  function acf(item = {}) {
    return item.salero_acf || item.acf || item.meta || {};
  }

  function rawField(source = {}, keys = [], fallback = '') {
    for (const key of keys) {
      if (source && source[key] !== undefined && source[key] !== null && source[key] !== '' && source[key] !== false) return source[key];
    }
    return fallback;
  }

  function textField(source = {}, keys = [], fallback = '') {
    return stripHtml(valueFrom(rawField(source, keys, fallback))).trim();
  }

  function htmlField(source = {}, keys = []) {
    const raw = rawField(source, keys, '');
    if (!raw) return '';
    if (typeof raw === 'object' && raw.rendered) return raw.rendered;
    if (typeof raw === 'object' && raw.raw) return paragraphs(raw.raw);
    const text = valueFrom(raw).trim();
    if (!text) return '';
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return paragraphs(text);
  }

  function paragraphs(text = '') {
    return String(text || '').split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function mediaUrl(media) {
    if (!media) return '';
    if (typeof media === 'string') {
      const clean = media.trim();
      const match = clean.match(/https?:\/\/[^\s"'<>]+/i);
      if (match) return match[0].replace('http://cms.webagencia360.com', 'https://cms.webagencia360.com');
      if (clean.startsWith('/wp-content/') || clean.startsWith('/uploads/')) return `${CMS_ORIGIN}${clean}`;
      if (clean.startsWith('wp-content/') || clean.startsWith('uploads/')) return `${CMS_ORIGIN}/${clean}`;
      return '';
    }
    if (typeof media === 'object') {
      if (media.url) return mediaUrl(media.url);
      if (media.source_url) return mediaUrl(media.source_url);
      if (media.guid && media.guid.rendered) return mediaUrl(media.guid.rendered);
      if (media.sizes) return mediaUrl(media.sizes.large || media.sizes.medium_large || media.sizes.full || media.sizes.medium || '');
      if (media.media_details && media.media_details.sizes) {
        const sizes = media.media_details.sizes;
        return mediaUrl((sizes.large && sizes.large.source_url) || (sizes.medium_large && sizes.medium_large.source_url) || (sizes.full && sizes.full.source_url) || (sizes.medium && sizes.medium.source_url) || '');
      }
    }
    return '';
  }

  function featuredImage(item = {}) {
    const media = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
    return mediaUrl(media) || mediaUrl(item.featured_image_url || item.salero_featured_image || '');
  }

  function list(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(valueFrom).map(item => item.trim()).filter(Boolean);
    return valueFrom(value).split(/\n|,/).map(item => item.trim()).filter(Boolean);
  }

  function normalizeServices(value) {
    const map = {
      web: 'Web',
      seo: 'SEO',
      ads: 'Publicidad digital',
      redes: 'Redes sociales',
      contenido: 'Contenido',
      email: 'Email marketing',
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      automatizacion: 'Automatización',
      analitica: 'Analítica',
      soporte: 'Soporte técnico',
      streaming: 'Streaming'
    };
    return list(value).map(item => map[item] || item);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    const trimmed = body.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) throw new Error('Respuesta no JSON');
    return JSON.parse(trimmed);
  }

  function normalizeCasePayload(json) {
    if (!json) return null;
    if (json.success === true && json.data) return json.data;
    if (Array.isArray(json)) return json[0] || null;
    return json;
  }

  function caseTitle(item = {}) {
    const source = acf(item);
    return textField(source, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], valueFrom(item.title) || 'Caso de éxito');
  }

  function caseMatches(item = {}) {
    const itemSlug = sanitizeSlug(item.slug || '');
    const titleSlug = sanitizeSlug(caseTitle(item));
    const source = acf(item);
    const altSlug = sanitizeSlug(textField(source, ['slug_publico', 'url_slug', 'slug'], ''));
    return itemSlug === slug || titleSlug === slug || altSlug === slug;
  }

  async function loadCase() {
    const localUrl = `/wp-content/uploads/salero-json/casos/${encodeURIComponent(slug)}.json?_t=${Date.now()}`;
    try {
      const item = normalizeCasePayload(await fetchJson(localUrl));
      if (item) return item;
    } catch (localError) {}

    const ajaxUrl = `${CMS_ORIGIN}/wp-admin/admin-ajax.php?action=salero_case_json&slug=${encodeURIComponent(slug)}&_t=${Date.now()}`;
    try {
      const item = normalizeCasePayload(await fetchJson(ajaxUrl));
      if (item) return item;
    } catch (ajaxError) {}

    const restExactUrl = `${CMS_ORIGIN}/wp-json/wp/v2/casos-exito?slug=${encodeURIComponent(slug)}&_embed=1&_t=${Date.now()}`;
    try {
      const item = normalizeCasePayload(await fetchJson(restExactUrl));
      if (item) return item;
    } catch (restExactError) {}

    const restListUrl = `${CMS_ORIGIN}/wp-json/wp/v2/casos-exito?per_page=100&_embed=1&_t=${Date.now()}`;
    const list = await fetchJson(restListUrl);
    if (Array.isArray(list)) {
      const item = list.find(caseMatches);
      if (item) return item;
    }

    throw new Error(`No se encontró el caso ${slug}`);
  }

  function renderSection(title, html, modifier = '', number = '') {
    if (!html) return '';
    return `<section class="caso-detail-section caso-detail-section-${escapeHtml(modifier)}">${number ? `<span class="caso-section-number">${escapeHtml(number)}</span>` : ''}<h3>${escapeHtml(title)}</h3>${html}</section>`;
  }

  function renderListSection(title, items, modifier = '') {
    if (!Array.isArray(items) || !items.length) return '';
    return `<section class="caso-detail-section caso-detail-list-section caso-detail-section-${escapeHtml(modifier)}"><h3>${escapeHtml(title)}</h3><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
  }

  function renderMetrics(metrics = []) {
    if (!Array.isArray(metrics) || !metrics.length) return '';
    const html = metrics.map(metric => {
      const label = textField(metric, ['metrica', 'label', 'nombre'], '');
      const value = textField(metric, ['valor', 'value', 'dato'], '');
      const desc = textField(metric, ['descripcion', 'description'], '');
      if (!label && !value && !desc) return '';
      return `<article class="caso-metric"><strong>${escapeHtml(value || label)}</strong>${label && value ? `<span>${escapeHtml(label)}</span>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</article>`;
    }).filter(Boolean).join('');
    return html ? `<section class="caso-detail-section caso-detail-section-metricas"><h3>Métricas destacadas</h3><div class="caso-metrics">${html}</div></section>` : '';
  }

  function renderGallery(galleryRows, primary = {}) {
    const rows = Array.isArray(galleryRows) ? [...galleryRows] : [];
    if (primary.videoUrl || primary.imageUrl) rows.unshift({ tipo_medio: primary.videoUrl ? 'video' : 'imagen', video: primary.videoUrl || '', imagen: primary.imageUrl || primary.posterUrl || '', alt: primary.title });

    const seen = new Set();
    const html = rows.map(row => {
      const type = textField(row, ['tipo_medio', 'tipo'], 'imagen');
      const img = mediaUrl(rawField(row, ['imagen'], ''));
      const vid = mediaUrl(rawField(row, ['video'], ''));
      const key = vid || img;
      if (!key || seen.has(key)) return '';
      seen.add(key);
      if (type === 'video' && vid) return `<article class="caso-gallery-item"><video controls preload="metadata"${img ? ` poster="${escapeHtml(img)}"` : ''}><source src="${escapeHtml(vid)}" type="video/mp4"></video></article>`;
      if (img) return `<article class="caso-gallery-item"><img src="${escapeHtml(img)}" alt="${escapeHtml(textField(row, ['alt'], primary.title || 'Imagen del proyecto'))}" loading="lazy"></article>`;
      return '';
    }).filter(Boolean).join('');

    return html ? `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material visual</span><h2>Píldoras de Sal</h2></div><div class="caso-gallery-grid">${html}</div></div></section>` : '';
  }

  function render(item = {}) {
    const source = acf(item);
    const title = caseTitle(item);
    const visualLabel = textField(source, ['visual_label', 'etiqueta_visual'], 'Caso de éxito');
    const sector = textField(source, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital');
    const service = textField(source, ['servicio_principal', 'servicio', 'servicios'], 'Estrategia digital');
    const proof = textField(source, ['dato_destacado', 'mejora_conseguida', 'que_demuestra_resumen', 'resumen_prueba'], 'Proyecto real de Salero Digital');
    const summary = textField(source, ['descripcion_corta', 'resumen'], stripHtml(item.excerpt && item.excerpt.rendered ? item.excerpt.rendered : '') || proof);
    const videoUrl = mediaUrl(rawField(source, ['hero_video', 'video_hero', 'video_fondo', 'fondo_video', 'background_video', 'hero_background_video', 'video_portada', 'portada_video', 'video_principal', 'video_principal_url', 'video_principal_caso', 'video_caso', 'video_campana', 'video'], ''));
    const posterUrl = mediaUrl(rawField(source, ['hero_poster', 'poster_hero', 'video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], ''));
    const imageUrl = mediaUrl(rawField(source, ['hero_image', 'imagen_hero', 'imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], featuredImage(item) || ''));
    const reto = htmlField(source, ['reto', 'reto_inicial', 'el_reto', 'problema', 'contexto', 'situacion_inicial']);
    const solucion = htmlField(source, ['solucion', 'estrategia_aplicada', 'acciones_realizadas', 'receta_aplicada', 'la_receta_aplicada', 'que_hicimos', 'desarrollo']);
    const resultado = htmlField(source, ['resultado', 'resultados', 'el_resultado', 'resultados_obtenidos', 'impacto']);
    const aprendizaje = htmlField(source, ['que_demuestra_este_caso', 'que_demuestra', 'aprendizaje', 'aprendizajes', 'lectura_estrategica', 'conclusion', 'conclusiones']);
    const servicios = normalizeServices(rawField(source, ['servicios_trabajados', 'servicios_implicados', 'servicios_aplicados'], []));
    const herramientas = list(rawField(source, ['herramientas', 'herramientas_usadas'], []));
    const metricas = Array.isArray(source.metricas) ? source.metricas : [];
    const galeria = Array.isArray(source.galeria_caso) ? source.galeria_caso : [];
    const ctaText = textField(source, ['cta_texto'], 'Quiero una estrategia parecida');
    const ctaUrl = textField(source, ['cta_url'], '/hablamos/') || '/hablamos/';
    const ctaSecondary = textField(source, ['cta_secundario'], 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.');
    const heroMedia = videoUrl
      ? `<video autoplay muted loop playsinline preload="metadata"${posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : ''}><source src="${escapeHtml(videoUrl)}" type="video/mp4"></video>`
      : imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="eager">`
        : '<div class="caso-detail-media-fallback" aria-hidden="true"></div>';

    document.body.classList.add(`caso-${sanitizeSlug(slug)}`);
    document.title = `${title} | Caso de éxito | Salero Digital`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && summary) meta.setAttribute('content', summary.slice(0, 160));

    return `<section class="caso-detail-hero caso-detail-hero-media">
      <div class="caso-hero-backdrop" aria-hidden="true">${heroMedia}</div>
      <div class="caso-detail-grain" aria-hidden="true"></div>
      <div class="caso-detail-hero-overlay" aria-hidden="true"></div>
      <div class="container caso-detail-hero-inner">
        <nav class="caso-breadcrumb" aria-label="Migas de pan"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/casos-de-exito/">Casos de éxito</a><span aria-hidden="true">/</span><a href="/casos-de-exito/${escapeHtml(slug)}/" aria-current="page">${escapeHtml(title)}</a></nav>
        <div class="caso-hero-layout"><div class="caso-detail-copy"><div class="caso-detail-tags caso-detail-tags-hero" aria-label="Resumen del caso"><span class="is-sal">${escapeHtml(visualLabel)}</span><span class="is-lima">${escapeHtml(sector)}</span><span class="is-lima">${escapeHtml(service)}</span></div><h1>${escapeHtml(title)}</h1>${summary ? `<p class="lead">${escapeHtml(summary)}</p>` : ''}<div class="caso-detail-actions"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="#caso-receta">Ver la receta</a></div></div></div>
      </div>
    </section>
    <section class="caso-proof-band" aria-label="Resumen del caso"><div class="container caso-proof-grid"><article><span>Sector</span><strong>${escapeHtml(sector)}</strong></article><article><span>Servicio principal</span><strong>${escapeHtml(service)}</strong></article><article><span>Qué demuestra</span><strong>${escapeHtml(proof)}</strong></article></div></section>
    <section class="caso-detail-body" id="caso-receta"><div class="container caso-detail-body-grid"><aside class="caso-detail-sticky"><span class="eyebrow">La receta</span><h2>Menos escaparate y más argumento.</h2><div class="caso-detail-summary-card"><p>Este caso no va solo de enseñar una web bonita. Va de explicar el contexto, la decisión estratégica y la solución digital que había detrás.</p><dl><div><dt>Proyecto</dt><dd>${escapeHtml(title)}</dd></div><div><dt>Prueba</dt><dd>${escapeHtml(proof)}</dd></div></dl></div></aside><div class="caso-detail-content">${renderSection('El reto', reto, 'reto', '01')}${renderSection('La receta aplicada', solucion, 'solucion', '02')}${renderSection('El resultado', resultado, 'resultado', '03')}${renderSection('Qué demuestra este caso', aprendizaje, 'aprendizaje', '04')}${renderListSection('Servicios trabajados', servicios, 'servicios')}${renderListSection('Herramientas usadas', herramientas, 'herramientas')}${renderMetrics(metricas)}</div></div></section>
    ${renderGallery(galeria, { imageUrl, videoUrl, posterUrl, title })}
    <section class="caso-detail-cta"><div class="container"><div class="caso-detail-cta-card"><span class="eyebrow">El siguiente caso puede ser el tuyo</span><h2>¿Quieres una solución digital con este nivel de intención?</h2>${ctaSecondary ? `<p>${escapeHtml(ctaSecondary)}</p>` : ''}<div class="hero-actions"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div></div></div></section>`;
  }

  function runCarouselEnhancement() {
    const previous = document.querySelector('script[data-case-carousel-refresh]');
    if (previous) previous.remove();
    const script = document.createElement('script');
    script.src = `/assets/js/caso-receta-carousel.js?v=3&t=${Date.now()}`;
    script.defer = true;
    script.dataset.caseCarouselRefresh = 'true';
    document.body.appendChild(script);
  }

  async function load() {
    if (!slug) {
      root.innerHTML = '<section class="caso-detail-loading"><div class="container"><h1>No se ha indicado ningún caso.</h1><p><a href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>';
      return;
    }

    try {
      const item = await loadCase();
      if (!item) throw new Error(`No se encontró el caso ${slug}`);
      root.innerHTML = render(item);
      runCarouselEnhancement();
    } catch (error) {
      console.warn(error);
      root.innerHTML = `<section class="caso-detail-loading"><div class="container"><span class="eyebrow">Caso de éxito</span><h1>No hemos podido cargar este caso.</h1><p>${escapeHtml(error.message || 'Revisa que el caso esté publicado en el CMS y que el slug sea correcto.')}</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>`;
    }
  }

  load();
})();
