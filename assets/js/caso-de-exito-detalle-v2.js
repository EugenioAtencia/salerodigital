(function () {
  function plain(value = '') {
    if (value === null || typeof value === 'undefined') return '';
    if (typeof value === 'string' || typeof value === 'number') return strip(String(value));
    if (Array.isArray(value)) return value.map(plain).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      const candidates = [value.rendered, value.raw, value.title, value.name, value.label, value.value, value.text, value.alt, value.url, value.source_url];
      for (const candidate of candidates) {
        const result = plain(candidate);
        if (result && result !== '[object Object]') return result;
      }
    }
    return '';
  }

  function strip(value = '') {
    return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escape(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatText(value = '') {
    const clean = strip(value).trim();
    if (!clean) return '';
    return clean.split(/\n{2,}/).map(paragraph => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function slugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return last === 'detalle' ? '' : last;
  }

  function slugify(value = '') {
    return plain(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function acf(item = {}) {
    return item.acf || item.salero_acf || item.meta || {};
  }

  function field(item = {}, keys = [], fallback = '') {
    const source = acf(item);
    for (const key of keys) {
      const fromAcf = plain(source[key]);
      if (fromAcf) return fromAcf;
      const fromItem = plain(item[key]);
      if (fromItem) return fromItem;
    }
    return plain(fallback);
  }

  function htmlField(value = '') {
    if (!value) return '';
    if (typeof value === 'object' && value.rendered) return value.rendered;
    if (typeof value === 'object' && value.raw) return formatText(value.raw);
    return formatText(plain(value));
  }

  function itemTitle(item = {}) {
    return field(item, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], '') || plain(item.title) || 'Caso de éxito';
  }

  function itemExcerpt(item = {}) {
    return item.excerpt && item.excerpt.rendered ? plain(item.excerpt.rendered) : '';
  }

  function mediaUrl(media) {
    if (!media) return '';
    if (typeof media === 'string' && /^https?:\/\//i.test(media)) return media;
    if (typeof media === 'object') {
      if (media.url) return media.url;
      if (media.source_url) return media.source_url;
      if (media.guid && media.guid.rendered) return media.guid.rendered;
      if (media.sizes) {
        if (typeof media.sizes.large === 'string') return media.sizes.large;
        if (typeof media.sizes.medium_large === 'string') return media.sizes.medium_large;
        if (typeof media.sizes.full === 'string') return media.sizes.full;
      }
      if (media.media_details && media.media_details.sizes) {
        const sizes = media.media_details.sizes;
        if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
        if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
        if (sizes.full && sizes.full.source_url) return sizes.full.source_url;
      }
    }
    return '';
  }

  function featuredImage(item = {}) {
    const media = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
    return mediaUrl(media);
  }

  function firstMedia(item = {}, keys = []) {
    const source = acf(item);
    for (const key of keys) {
      const url = mediaUrl(source[key] || item[key]);
      if (url) return url;
    }
    return '';
  }

  function list(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(plain).filter(Boolean);
    return plain(value).split(/\n|,/).map(item => item.trim()).filter(Boolean);
  }

  function renderList(title, items) {
    if (!Array.isArray(items) || !items.length) return '';
    return `<section class="caso-detail-section"><h3>${escape(title)}</h3><ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>`;
  }

  function renderSection(title, html) {
    if (!html) return '';
    return `<section class="caso-detail-section"><h3>${escape(title)}</h3>${html}</section>`;
  }

  function renderMetrics(metrics = []) {
    if (!Array.isArray(metrics) || !metrics.length) return '';
    const cards = metrics.map(metric => {
      const label = plain(metric.metrica || metric.label || metric.nombre);
      const value = plain(metric.valor || metric.value || metric.dato);
      const description = plain(metric.descripcion || metric.description);
      if (!label && !value && !description) return '';
      return `<article class="caso-metric"><strong>${escape(value || label)}</strong>${label && value ? `<span>${escape(label)}</span>` : ''}${description ? `<p>${escape(description)}</p>` : ''}</article>`;
    }).filter(Boolean).join('');
    return cards ? `<section class="caso-detail-section"><h3>Métricas destacadas</h3><div class="caso-metrics">${cards}</div></section>` : '';
  }

  function renderGallery(item = {}, image = '', video = '') {
    const rows = Array.isArray(acf(item).galeria_caso) ? [...acf(item).galeria_caso] : [];
    if (video || image) rows.unshift({ tipo_medio: video ? 'video' : 'imagen', video, imagen: image, alt: itemTitle(item) });
    const seen = new Set();
    const html = rows.map(row => {
      const type = plain(row.tipo_medio || row.tipo || 'imagen');
      const img = mediaUrl(row.imagen);
      const vid = mediaUrl(row.video);
      const key = vid || img;
      if (!key || seen.has(key)) return '';
      seen.add(key);
      if (type === 'video' && vid) return `<article class="caso-gallery-item"><video controls preload="metadata"${img ? ` poster="${escape(img)}"` : ''}><source src="${escape(vid)}" type="video/mp4"></video></article>`;
      return `<article class="caso-gallery-item"><img src="${escape(img)}" alt="${escape(plain(row.alt) || itemTitle(item))}" loading="lazy"></article>`;
    }).filter(Boolean).join('');
    return html ? `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material del proyecto</span><h2>Una mirada más visual al trabajo realizado</h2></div><div class="caso-gallery-grid">${html}</div></div></section>` : '';
  }

  function render(item = {}) {
    const source = acf(item);
    const title = itemTitle(item);
    const visualLabel = field(item, ['visual_label', 'etiqueta_visual'], 'Caso de éxito');
    const sector = field(item, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital');
    const service = field(item, ['servicio_principal', 'servicios', 'servicio'], 'Estrategia digital');
    const proof = field(item, ['dato_destacado', 'mejora_conseguida'], 'Proyecto real de Salero Digital');
    const summary = field(item, ['descripcion_corta', 'resumen'], itemExcerpt(item) || proof);
    const reto = htmlField(source.reto || source.reto_inicial);
    const solucion = htmlField(source.solucion || source.estrategia_aplicada || source.acciones_realizadas);
    const resultado = htmlField(source.resultado || source.resultados);
    const aprendizaje = htmlField(source.aprendizaje || source.que_demuestra);
    const servicios = list(source.servicios_trabajados || source.servicios_aplicados);
    const herramientas = list(source.herramientas);
    const image = firstMedia(item, ['imagen_caso', 'imagen_principal', 'imagen_destacada', 'imagen_campana', 'cover_image']) || featuredImage(item);
    const video = firstMedia(item, ['video_principal', 'video_principal_url', 'video_caso', 'video_campana', 'video']);
    const poster = firstMedia(item, ['video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso']) || image;
    const ctaText = field(item, ['cta_texto'], 'Quiero una estrategia parecida');
    const ctaUrl = field(item, ['cta_url'], '/hablamos/');
    const ctaSecondary = field(item, ['cta_secundario'], 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.');
    const media = video
      ? `<video autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${escape(poster)}"` : ''}><source src="${escape(video)}" type="video/mp4"></video>`
      : image
        ? `<img src="${escape(image)}" alt="Imagen del caso ${escape(title)}">`
        : `<div class="caso-detail-media-fallback" aria-hidden="true"></div>`;

    document.title = `${title} | Caso de éxito | Salero Digital`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && summary) meta.setAttribute('content', summary.slice(0, 160));

    return `<section class="caso-detail-hero">
      <div class="container caso-detail-hero-grid">
        <div class="caso-detail-copy">
          <span class="eyebrow">Caso de éxito</span>
          <h1>${escape(title)}</h1>
          ${summary ? `<p class="lead">${escape(summary)}</p>` : ''}
          <div class="caso-detail-tags"><span>${escape(visualLabel)}</span><span>${escape(sector)}</span></div>
        </div>
        <div class="caso-detail-media">${media}</div>
      </div>
    </section>

    <section class="caso-detail-body">
      <div class="container caso-detail-body-grid">
        <aside class="caso-detail-sticky">
          <span class="eyebrow">La receta</span>
          <h2>Qué hicimos y por qué importa</h2>
          <div class="caso-detail-summary-card">
            <dl>
              <div><dt>Sector</dt><dd>${escape(sector)}</dd></div>
              <div><dt>Servicio principal</dt><dd>${escape(service)}</dd></div>
              <div><dt>Qué demuestra</dt><dd>${escape(proof)}</dd></div>
            </dl>
          </div>
        </aside>
        <div class="caso-detail-content">
          ${renderSection('El reto', reto)}
          ${renderSection('La receta aplicada', solucion)}
          ${renderSection('El resultado', resultado)}
          ${renderSection('Qué demuestra este caso', aprendizaje)}
          ${renderList('Servicios trabajados', servicios)}
          ${renderList('Herramientas usadas', herramientas)}
          ${renderMetrics(source.metricas)}
        </div>
      </div>
    </section>

    ${renderGallery(item, image, video)}

    <section class="caso-detail-cta">
      <div class="container">
        <div class="caso-detail-cta-card">
          <span class="eyebrow">El siguiente caso puede ser el tuyo</span>
          <h2>¿Quieres una solución digital con este nivel de intención?</h2>
          ${ctaSecondary ? `<p>${escape(ctaSecondary)}</p>` : ''}
          <div class="hero-actions"><a class="btn btn-primary" href="${escape(ctaUrl)}">${escape(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div>
        </div>
      </div>
    </section>`;
  }

  async function load() {
    const root = document.querySelector('[data-caso-detalle]');
    if (!root) return;
    const slug = slugFromPath();
    if (!slug) {
      root.innerHTML = '<section class="caso-detail-loading"><div class="container"><h1>No se ha indicado ningún caso.</h1><p><a href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>';
      return;
    }

    try {
      const endpoint = 'casos';
      let item = await getBySlug(endpoint, slug);
      if (!item) {
        const items = await getCollection(endpoint);
        item = Array.isArray(items) ? items.find(entry => slugify(itemTitle(entry)) === slug || slugify(entry.slug) === slug) : null;
      }
      if (!item) throw new Error(`No se encontró el caso ${slug}`);
      root.innerHTML = render(item);
    } catch (error) {
      console.warn(error);
      root.innerHTML = `<section class="caso-detail-loading"><div class="container"><span class="eyebrow">Caso de éxito</span><h1>No hemos podido cargar este caso.</h1><p>Revisa que el caso esté publicado en el CMS y que el slug sea correcto.</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>`;
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
