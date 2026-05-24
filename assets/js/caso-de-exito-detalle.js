function casoPlainValue(value = '') {
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string' || typeof value === 'number') return stripHtml(String(value));
  if (Array.isArray(value)) return value.map(casoPlainValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const candidates = [value.rendered, value.raw, value.title, value.name, value.label, value.value, value.text, value.alt, value.url, value.source_url];
    for (const candidate of candidates) {
      const result = casoPlainValue(candidate);
      if (result && result !== '[object Object]') return result;
    }
  }
  return '';
}

function casoHtmlValue(value = '') {
  if (!value) return '';
  if (typeof value === 'object' && value.rendered) return value.rendered;
  if (typeof value === 'object' && value.raw) return formatText(value.raw);
  return formatText(casoPlainValue(value));
}

function casoSlugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  if (last === 'detalle') return '';
  return last;
}

function casoSlugify(value = '') {
  return casoPlainValue(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function casoMediaUrl(media) {
  if (!media) return '';
  if (typeof media === 'string') return media;
  if (media.url) return media.url;
  if (media.source_url) return media.source_url;
  if (media.guid && media.guid.rendered) return media.guid.rendered;
  if (media.sizes && media.sizes.large) return media.sizes.large;
  if (media.sizes && media.sizes.medium_large) return media.sizes.medium_large;
  if (media.sizes && media.sizes.full) return media.sizes.full;
  if (media.media_details && media.media_details.sizes) {
    const sizes = media.media_details.sizes;
    if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
    if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
    if (sizes.full && sizes.full.source_url) return sizes.full.source_url;
  }
  return '';
}

function casoField(item = {}, keys = [], fallback = '') {
  const acf = getAcf(item);
  for (const key of keys) {
    const fromAcf = casoPlainValue(acf && acf[key]);
    if (fromAcf) return fromAcf;
    const fromItem = casoPlainValue(item && item[key]);
    if (fromItem) return fromItem;
  }
  return casoPlainValue(fallback);
}

function casoTitle(item = {}) {
  return casoField(item, ['cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente'], '') || itemTitle(item) || 'Caso de éxito';
}

function casoVideo(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.video_principal, acf.video_principal_url, acf.video_caso, acf.video_campana, acf.video, item.video_principal, item.video];
  for (const candidate of candidates) {
    const url = casoMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function casoPoster(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.video_poster, acf.poster_video, acf.poster, acf.imagen_principal, acf.imagen_caso, item.video_poster, item.poster, featuredImage(item)];
  for (const candidate of candidates) {
    const url = casoMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function casoImage(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.imagen_caso, acf.imagen_principal, acf.imagen_destacada, acf.imagen_campana, acf.captura_campana, acf.hero_image, acf.cover_image, item.image, item.imagen, featuredImage(item)];
  for (const candidate of candidates) {
    const url = casoMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function casoLogo(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.logo_cliente, acf.logo_marca, acf.logo, item.logo];
  for (const candidate of candidates) {
    const url = casoMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function renderCasoHeroMedia(item = {}) {
  const title = casoTitle(item);
  const video = casoVideo(item);
  const poster = casoPoster(item);
  const image = casoImage(item);
  const logo = casoLogo(item);
  const media = video
    ? `<video autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${escapeHtml(poster)}"` : ''}><source src="${escapeHtml(video)}" type="video/mp4"></video>`
    : image
      ? `<img src="${escapeHtml(image)}" alt="Imagen del caso ${escapeHtml(title)}">`
      : `<div class="caso-detail-media-fallback" aria-hidden="true"></div>`;
  return `<div class="caso-detail-media">${media}${logo ? `<span class="caso-detail-logo"><img src="${escapeHtml(logo)}" alt="Logo de ${escapeHtml(title)}"></span>` : ''}</div>`;
}

function renderCasoSection(title = '', html = '') {
  if (!html) return '';
  return `<section class="caso-detail-section"><h3>${escapeHtml(title)}</h3>${html}</section>`;
}

function renderMetricas(metricas = []) {
  if (!Array.isArray(metricas) || !metricas.length) return '';
  const items = metricas.map(metric => {
    const label = casoPlainValue(metric.metrica || metric.label || metric.nombre);
    const value = casoPlainValue(metric.valor || metric.value || metric.dato);
    const desc = casoPlainValue(metric.descripcion || metric.description || '');
    if (!label && !value && !desc) return '';
    return `<article class="caso-metric"><strong>${escapeHtml(value || label)}</strong>${label && value ? `<span>${escapeHtml(label)}</span>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</article>`;
  }).filter(Boolean).join('');
  if (!items) return '';
  return `<section class="caso-detail-section"><h3>Métricas destacadas</h3><div class="caso-metrics">${items}</div></section>`;
}

function renderServicios(servicios) {
  if (!servicios) return '';
  const list = Array.isArray(servicios) ? servicios.map(casoPlainValue).filter(Boolean) : casoPlainValue(servicios).split(/\n|,/).map(x => x.trim()).filter(Boolean);
  if (!list.length) return '';
  return `<section class="caso-detail-section"><h3>Servicios trabajados</h3><ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
}

function renderGaleria(galeria = []) {
  if (!Array.isArray(galeria) || !galeria.length) return '';
  const items = galeria.map(item => {
    const tipo = casoPlainValue(item.tipo_medio || item.tipo || 'imagen');
    const img = casoMediaUrl(item.imagen);
    const vid = casoMediaUrl(item.video);
    const url = casoPlainValue(item.url_externa || item.url);
    const title = casoPlainValue(item.titulo || item.title);
    const desc = casoPlainValue(item.descripcion || item.description);
    const alt = casoPlainValue(item.alt || title || 'Recurso del caso');
    let media = '';
    if (tipo === 'video' && vid) media = `<video controls preload="metadata"><source src="${escapeHtml(vid)}" type="video/mp4"></video>`;
    else if (tipo === 'url' && url) media = `<a class="caso-gallery-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Ver recurso externo</a>`;
    else if (img) media = `<img src="${escapeHtml(img)}" alt="${escapeHtml(alt)}" loading="lazy">`;
    if (!media) return '';
    return `<article class="caso-gallery-item">${media}${(title || desc) ? `<div class="caso-gallery-caption">${title ? `<strong>${escapeHtml(title)}</strong>` : ''}${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</div>` : ''}</article>`;
  }).filter(Boolean).join('');
  if (!items) return '';
  return `<section class="caso-gallery-section"><div class="container"><div class="caso-gallery-heading"><span class="eyebrow">Material del proyecto</span><h2>Una mirada más visual al trabajo realizado</h2></div><div class="caso-gallery-grid">${items}</div></div></section>`;
}

function renderCasoDetalle(item = {}) {
  const acf = getAcf(item);
  const title = casoTitle(item);
  const visualLabel = casoField(item, ['visual_label', 'etiqueta_visual'], 'Caso de éxito');
  const sector = casoField(item, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Proyecto digital');
  const service = casoField(item, ['servicio_principal', 'servicios', 'servicio'], 'Estrategia digital');
  const proof = casoField(item, ['dato_destacado', 'mejora_conseguida'], 'Proyecto real de Salero Digital');
  const excerpt = casoField(item, ['descripcion_corta', 'resumen'], excerpt(item));
  const reto = casoHtmlValue(acf.reto || acf.reto_inicial);
  const solucion = casoHtmlValue(acf.solucion || acf.estrategia_aplicada || acf.acciones_realizadas);
  const resultado = casoHtmlValue(acf.resultado || acf.resultados);
  const aprendizaje = casoHtmlValue(acf.aprendizaje || acf.que_demuestra);
  const herramientas = casoPlainValue(acf.herramientas);
  const ctaText = casoPlainValue(acf.cta_texto) || 'Quiero una estrategia parecida';
  const ctaUrl = casoPlainValue(acf.cta_url) || '/hablamos/';
  const ctaSecondary = casoPlainValue(acf.cta_secundario) || 'Cuéntanos tu punto de partida y vemos cómo convertirlo en una experiencia digital con intención, estructura y salero.';

  document.title = `${title} | Caso de éxito | Salero Digital`;
  const meta = document.querySelector('meta[name="description"]');
  const metaDesc = casoPlainValue(acf.seo_description || acf.meta_description || excerpt);
  if (meta && metaDesc) meta.setAttribute('content', metaDesc.slice(0, 160));

  return `<section class="caso-detail-hero">
    <div class="container caso-detail-hero-grid">
      <div class="caso-detail-copy">
        <span class="eyebrow">Caso de éxito</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(excerpt)}</p>
        <div class="caso-detail-tags"><span>${escapeHtml(visualLabel)}</span><span>${escapeHtml(sector)}</span></div>
      </div>
      ${renderCasoHeroMedia(item)}
    </div>
  </section>

  <section class="caso-detail-body">
    <div class="container caso-detail-body-grid">
      <aside class="caso-detail-sticky">
        <span class="eyebrow">La receta</span>
        <h2>Qué hicimos y por qué importa</h2>
        <div class="caso-detail-summary-card">
          <dl>
            <div><dt>Sector</dt><dd>${escapeHtml(sector)}</dd></div>
            <div><dt>Servicio principal</dt><dd>${escapeHtml(service)}</dd></div>
            <div><dt>Qué demuestra</dt><dd>${escapeHtml(proof)}</dd></div>
          </dl>
        </div>
      </aside>
      <div class="caso-detail-content">
        ${renderCasoSection('El reto', reto)}
        ${renderCasoSection('La receta aplicada', solucion)}
        ${renderCasoSection('El resultado', resultado)}
        ${renderCasoSection('Qué demuestra este caso', aprendizaje)}
        ${renderServicios(acf.servicios_trabajados)}
        ${herramientas ? renderCasoSection('Herramientas usadas', formatList(herramientas)) : ''}
        ${renderMetricas(acf.metricas)}
      </div>
    </div>
  </section>

  ${renderGaleria(acf.galeria_caso)}

  <section class="caso-detail-cta">
    <div class="container">
      <div class="caso-detail-cta-card">
        <span class="eyebrow">El siguiente caso puede ser el tuyo</span>
        <h2>¿Quieres una solución digital con este nivel de intención?</h2>
        <p>${escapeHtml(ctaSecondary)}</p>
        <div class="hero-actions"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaText)}</a><a class="btn btn-secondary" href="/casos-de-exito/">Ver más casos</a></div>
      </div>
    </div>
  </section>`;
}

async function loadCasoDetalle() {
  const root = document.querySelector('[data-caso-detalle]');
  if (!root) return;
  const slug = casoSlugFromPath();
  if (!slug) {
    root.innerHTML = '<section class="caso-detail-loading"><div class="container"><h1>No se ha indicado ningún caso.</h1><p><a href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>';
    return;
  }

  try {
    const endpoint = (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints.casos) ? 'casos' : 'casos-exito';
    let item = await getBySlug(endpoint, slug);
    if (!item) {
      const items = await getCollection(endpoint);
      item = Array.isArray(items) ? items.find(entry => casoSlugify(casoTitle(entry)) === slug || casoSlugify(entry.slug) === slug) : null;
    }
    if (!item) throw new Error(`No se encontró el caso ${slug}`);
    root.innerHTML = renderCasoDetalle(item);
  } catch (error) {
    console.warn(error);
    root.innerHTML = `<section class="caso-detail-loading"><div class="container"><span class="eyebrow">Caso de éxito</span><h1>No hemos podido cargar este caso.</h1><p>Revisa que el caso esté publicado en el CMS y que el slug sea correcto.</p><p><a class="btn btn-primary" href="/casos-de-exito/">Volver a casos de éxito</a></p></div></section>`;
  }
}

document.addEventListener('DOMContentLoaded', loadCasoDetalle);
