const SALERO_CASOS_FALLBACK = [
  {
    title: 'Gestamp Digital Summit',
    slug: 'gestamp-digital-summit',
    sector: 'Industria y formación corporativa',
    service: 'Desarrollo web, evento digital y experiencia privada',
    proof: 'Tecnología para un evento corporativo de alta exigencia',
    excerpt: 'Desarrollo de una experiencia digital para centralizar información, acceso a sesiones, contenidos y recursos de un evento corporativo de alta exigencia.',
    visual: 'Evento corporativo',
    accent: 'summit'
  },
  {
    title: 'Fundación ONCE',
    slug: 'fundacion-once',
    sector: 'Formación, eventos e impacto social',
    service: 'Campañas digitales multicanal',
    proof: 'Campañas nacionales con estrategia y segmentación por plataforma',
    excerpt: 'Estrategia y ejecución de campañas para dar visibilidad a eventos, cursos e iniciativas formativas, adaptando mensaje, público y canal según cada objetivo.',
    visual: 'Campañas nacionales',
    accent: 'social'
  },
  {
    title: 'Muebles Sarria',
    slug: 'muebles-sarria',
    sector: 'Retail, decoración y climatización',
    service: 'Google Ads, email, SMS, WhatsApp, contenidos y landings',
    proof: 'Sistema de captación multicanal para retail local',
    excerpt: 'Activación de campañas y contenidos para diferentes líneas de negocio, combinando buscadores, redes sociales, email, SMS, WhatsApp y páginas orientadas a conversión.',
    visual: 'Retail local',
    accent: 'retail'
  },
  {
    title: 'Comercial Vázquez',
    slug: 'comercial-vazquez',
    sector: 'Electrodomésticos, cocinas y comercio local',
    service: 'Contenidos, campañas, estrategia social y posicionamiento',
    proof: 'Comunicación digital para productos y servicios de alto valor',
    excerpt: 'Estrategia de contenidos y comunicación para acercar productos, proyectos de cocina y campañas comerciales a una audiencia local con alta intención de compra.',
    visual: 'Comercio y cocinas',
    accent: 'commerce'
  },
  {
    title: 'Enoro',
    slug: 'enoro',
    sector: 'Aceite de oliva virgen extra y agroalimentación',
    service: 'Web, ecommerce, soporte digital y marca',
    proof: 'Presencia digital para una marca agroalimentaria con producto de origen',
    excerpt: 'Trabajo digital orientado a reforzar la marca, mejorar su presencia online y acompañar el canal comercial de una empresa agroalimentaria con producto propio.',
    visual: 'AOVE y origen',
    accent: 'agro'
  },
  {
    title: 'Museo de la Cal de Morón',
    slug: 'museo-de-la-cal-de-moron',
    sector: 'Cultura, turismo y patrimonio',
    service: 'Web, ecommerce y experiencia digital',
    proof: 'Digitalización de un proyecto cultural con raíz local',
    excerpt: 'Mejora de la presencia digital de un espacio cultural y patrimonial, con una estructura preparada para informar, vender, captar visitas y reforzar su valor turístico.',
    visual: 'Cultura y patrimonio',
    accent: 'culture'
  }
];

function saleroCasoField(item = {}, keys = [], fallback = '') {
  const acf = getAcf(item);
  for (const key of keys) {
    if (acf && acf[key]) return stripHtml(String(acf[key]));
    if (item && item[key]) return stripHtml(String(item[key]));
  }
  return fallback;
}

function saleroCasoTitle(item = {}) {
  if (item.title && item.title.rendered) return stripHtml(item.title.rendered);
  return item.title || '';
}

function saleroCasoExcerpt(item = {}) {
  if (item.excerpt && item.excerpt.rendered) return stripHtml(item.excerpt.rendered);
  return item.excerpt || saleroCasoField(item, ['resumen', 'resumen_del_reto', 'descripcion_corta', 'descripcion'], '');
}

function saleroMediaUrl(media) {
  if (!media) return '';
  if (typeof media === 'string') return media;
  if (media.url) return media.url;
  if (media.source_url) return media.source_url;
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

function saleroCasoImage(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.imagen_caso, acf.imagen_principal, acf.imagen_destacada, acf.imagen_campana, acf.captura_campana, acf.hero_image, acf.cover_image, item.image, item.imagen, featuredImage(item)];
  for (const candidate of candidates) {
    const url = saleroMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function saleroCasoVideo(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.video_principal, acf.video_principal_url, acf.video_caso, acf.video_campana, acf.video, item.video_principal, item.video];
  for (const candidate of candidates) {
    const url = saleroMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function saleroCasoPoster(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.video_poster, acf.poster_video, acf.poster, acf.imagen_principal, acf.imagen_caso, item.video_poster, item.poster, featuredImage(item)];
  for (const candidate of candidates) {
    const url = saleroMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function saleroCasoLogo(item = {}) {
  const acf = getAcf(item);
  const candidates = [acf.logo_cliente, acf.logo_marca, acf.logo, item.logo];
  for (const candidate of candidates) {
    const url = saleroMediaUrl(candidate);
    if (url) return url;
  }
  return '';
}

function saleroCasoInitials(title = '') {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function saleroCasoAccent(item = {}, slug = '') {
  if (item.accent) return item.accent;
  const text = `${slug} ${saleroCasoTitle(item)} ${saleroCasoField(item, ['sector'], '')}`.toLowerCase();
  if (text.includes('gestamp') || text.includes('summit') || text.includes('industria')) return 'summit';
  if (text.includes('once') || text.includes('fundacion') || text.includes('fundación')) return 'social';
  if (text.includes('sarria') || text.includes('mueble') || text.includes('decor')) return 'retail';
  if (text.includes('vazquez') || text.includes('vázquez') || text.includes('electro')) return 'commerce';
  if (text.includes('enoro') || text.includes('aceite') || text.includes('agro')) return 'agro';
  if (text.includes('museo') || text.includes('cal') || text.includes('patrimonio')) return 'culture';
  return 'default';
}

function renderCasoMedia(item = {}, title = '', visualLabel = '') {
  const video = saleroCasoVideo(item);
  const poster = saleroCasoPoster(item);
  const cover = saleroCasoImage(item);

  if (video) {
    return `<video class="caso-media-video" autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${escapeHtml(poster)}"` : ''} aria-label="Vídeo del caso ${escapeHtml(title)}"><source src="${escapeHtml(video)}" type="video/mp4"></video>`;
  }

  if (cover) {
    return `<img src="${escapeHtml(cover)}" alt="Imagen del caso ${escapeHtml(title)}" loading="lazy" decoding="async">`;
  }

  return `<div class="caso-media-fallback" aria-hidden="true"><span>${escapeHtml(visualLabel)}</span></div>`;
}

function renderCasoLogo(item = {}, title = '') {
  const logo = saleroCasoLogo(item);
  if (!logo) return '';
  return `<span class="caso-logo"><img src="${escapeHtml(logo)}" alt="Logo de ${escapeHtml(title)}" loading="lazy" decoding="async"></span>`;
}

function renderCasoCard(item = {}) {
  const title = saleroCasoTitle(item);
  const slug = item.slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sector = saleroCasoField(item, ['sector', 'sector_cliente', 'tipo_de_cliente'], item.sector || 'Caso de éxito');
  const service = saleroCasoField(item, ['servicio_principal', 'servicios', 'servicio'], item.service || 'Estrategia digital');
  const proof = saleroCasoField(item, ['resultado', 'dato_destacado', 'mejora_conseguida'], item.proof || 'Proyecto real de Salero Digital');
  const excerpt = saleroCasoExcerpt(item) || item.excerpt || '';
  const accent = saleroCasoAccent(item, slug);
  const visualLabel = item.visual || saleroCasoField(item, ['visual_label', 'etiqueta_visual', 'cliente'], title);
  const url = `/casos-de-exito/${slug}/`;

  return `<article class="caso-card caso-card-visual caso-accent-${escapeHtml(accent)}">
    <a class="caso-media" href="${url}" aria-label="Ver caso de éxito de ${escapeHtml(title)}">
      ${renderCasoMedia(item, title, visualLabel)}
      <span class="caso-sector-badge">${escapeHtml(sector)}</span>
      <div class="caso-media-overlay" aria-hidden="true"></div>
      ${renderCasoLogo(item, title)}
    </a>
    <div class="caso-content">
      <div class="caso-card-top">
        <span class="caso-content-kicker">${escapeHtml(visualLabel)}<br>${escapeHtml(sector)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p class="caso-excerpt">${escapeHtml(excerpt).slice(0,220)}</p>
      </div>
      <div class="caso-meta">
        <div class="caso-service"><small>Servicio principal</small><strong>${escapeHtml(service)}</strong></div>
        <div class="caso-proof"><small>Qué demuestra</small><strong>${escapeHtml(proof)}</strong></div>
        <a class="caso-link" href="${url}" aria-label="Ver caso de éxito de ${escapeHtml(title)}">Ver caso</a>
      </div>
    </div>
  </article>`;
}

function renderCasosCarousel(items = []) {
  return `<div class="casos-carousel casos-carousel-stage" data-casos-carousel>
    <div class="casos-carousel-viewport" data-casos-viewport aria-live="polite">
      <div class="casos-carousel-track" data-casos-track>${items.map(renderCasoCard).join('')}</div>
    </div>
    <div class="casos-carousel-controls" aria-label="Controles del carrusel de casos de éxito">
      <button class="casos-carousel-btn" type="button" data-casos-prev aria-label="Ver caso anterior">‹</button>
      <div class="casos-carousel-dots" data-casos-dots aria-label="Paginación del carrusel"></div>
      <button class="casos-carousel-btn" type="button" data-casos-next aria-label="Ver caso siguiente">›</button>
    </div>
  </div>`;
}

function getCircularOffset(itemIndex, activeIndex, total) {
  let offset = itemIndex - activeIndex;
  const half = Math.floor(total / 2);
  if (offset > half) offset -= total;
  if (offset < -half) offset += total;
  return offset;
}

function initCasosCarousel(root) {
  const carousel = root.querySelector('[data-casos-carousel]');
  if (!carousel) return;

  const prev = carousel.querySelector('[data-casos-prev]');
  const next = carousel.querySelector('[data-casos-next]');
  const dotsRoot = carousel.querySelector('[data-casos-dots]');
  const cards = [...carousel.querySelectorAll('.caso-card-visual')];
  if (!cards.length) return;

  let index = 0;
  let timer = null;
  const interval = 6000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maxIndex = () => Math.max(0, cards.length - 1);

  const renderDots = () => {
    if (!dotsRoot) return;
    dotsRoot.innerHTML = cards.map((_, i) => `<button class="casos-carousel-dot" type="button" data-casos-dot="${i}" aria-label="Ir al caso ${i + 1}"></button>`).join('');
  };

  const updateDots = () => {
    carousel.querySelectorAll('[data-casos-dot]').forEach(dot => {
      const active = Number(dot.dataset.casosDot) === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const updateCards = () => {
    const total = cards.length;
    cards.forEach((card, i) => {
      const offset = getCircularOffset(i, index, total);
      const abs = Math.abs(offset);
      const clamped = Math.max(-3, Math.min(3, offset));
      card.classList.toggle('is-active', offset === 0);
      card.classList.toggle('is-near', abs === 1);
      card.classList.toggle('is-far', abs === 2);
      card.classList.toggle('is-hidden', abs > 2);
      card.dataset.offset = String(clamped);
      card.style.setProperty('--offset', clamped);
      card.style.setProperty('--abs-offset', Math.min(abs, 3));
      card.style.zIndex = String(20 - abs);
    });
    carousel.classList.toggle('has-single-page', maxIndex() === 0);
    updateDots();
  };

  const goTo = nextIndex => {
    const max = maxIndex();
    if (nextIndex > max) nextIndex = 0;
    if (nextIndex < 0) nextIndex = max;
    index = nextIndex;
    updateCards();
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const start = () => {
    if (reduceMotion || maxIndex() === 0) return;
    stop();
    timer = window.setInterval(() => goTo(index + 1), interval);
  };

  renderDots();
  goTo(0);
  start();

  prev && prev.addEventListener('click', () => { stop(); goTo(index - 1); start(); });
  next && next.addEventListener('click', () => { stop(); goTo(index + 1); start(); });
  dotsRoot && dotsRoot.addEventListener('click', event => {
    const dot = event.target.closest('[data-casos-dot]');
    if (!dot) return;
    stop();
    goTo(Number(dot.dataset.casosDot));
    start();
  });
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
}

async function renderCasosPage() {
  const root = document.querySelector('[data-casos]');
  if (!root) return;
  root.innerHTML = '<div class="loading">Cargando casos de éxito desde el CMS...</div>';
  try {
    const endpoint = (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints.casos) ? 'casos' : 'casos-exito';
    const items = await getCollection(endpoint);
    const validItems = Array.isArray(items) ? items.filter(Boolean) : [];
    root.innerHTML = renderCasosCarousel(validItems.length ? validItems : SALERO_CASOS_FALLBACK);
    initCasosCarousel(root);
  } catch (error) {
    console.warn('No se pudieron cargar los casos desde WordPress. Se usa contenido provisional.', error);
    root.innerHTML = renderCasosCarousel(SALERO_CASOS_FALLBACK);
    initCasosCarousel(root);
  }
}

document.addEventListener('DOMContentLoaded', renderCasosPage);
