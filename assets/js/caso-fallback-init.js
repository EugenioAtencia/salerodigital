(() => {
  const root = document.querySelector('#caso-detalle-root');
  if (!root) return;

  const mediaCache = new Map();

  function normalize(value = '') {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function getAcf(item = {}) {
    return item.acf || item.salero_acf || item.meta || {};
  }

  function mediaUrl(media) {
    if (!media) return '';
    if (typeof media === 'string' && /^https?:\/\//i.test(media)) return media;
    if (media && typeof media === 'object') {
      if (media.url) return media.url;
      if (media.source_url) return media.source_url;
      if (media.guid && media.guid.rendered) return media.guid.rendered;
      if (media.media_details && media.media_details.sizes) {
        const sizes = media.media_details.sizes;
        if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
        if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
        if (sizes.full && sizes.full.source_url) return sizes.full.source_url;
      }
    }
    return '';
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
    if (mediaCache.has(id)) return mediaCache.get(id);
    const base = (window.SALERO_CONFIG && SALERO_CONFIG.apiBase) || 'https://cms.webagencia360.com/wp-json/wp/v2';
    const response = await fetch(`${base.replace(/\/$/, '')}/media/${id}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const media = await response.json();
    mediaCache.set(id, media);
    return media;
  }

  async function resolveMedia(value) {
    const direct = mediaUrl(value);
    if (direct) return direct;
    const id = mediaId(value);
    if (!id) return '';
    return mediaUrl(await fetchMediaById(id));
  }

  async function firstMedia(item, keys, fallback = '') {
    const acf = getAcf(item);
    for (const key of keys) {
      const resolved = await resolveMedia(acf[key] || item[key]);
      if (resolved) return resolved;
    }
    return fallback;
  }

  function featuredImage(item = {}) {
    const media = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
    return mediaUrl(media);
  }

  async function resolveHeroMedia() {
    const grid = document.querySelector('.caso-detail-hero-grid');
    if (!grid || grid.dataset.heroMediaResolved === 'true') return;
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    if (!slug || typeof getBySlug !== 'function') return;

    const item = await getBySlug('casos', slug);
    if (!item) return;

    const acf = getAcf(item);
    const title = acf.cliente_nombre || acf.nombre_caso || acf.cliente || 'Caso de éxito';
    const featured = featuredImage(item);
    const image = await firstMedia(item, ['imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], featured);
    const video = await firstMedia(item, ['video_principal', 'video_principal_url', 'video_caso', 'video_campana', 'video']);
    const poster = await firstMedia(item, ['video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], image || featured);

    if (!image && !video) return;

    let mediaCard = grid.querySelector('.caso-detail-media');
    if (!mediaCard) {
      mediaCard = document.createElement('div');
      mediaCard.className = 'caso-detail-media';
      grid.appendChild(mediaCard);
    }

    mediaCard.innerHTML = video
      ? `<video autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${poster}"` : ''}><source src="${video}" type="video/mp4"></video>`
      : `<img src="${image}" alt="${String(title).replace(/"/g, '&quot;')}" loading="eager">`;

    grid.classList.remove('is-no-media');
    grid.dataset.heroMediaResolved = 'true';
  }

  function prepareFallbackLayout() {
    const content = document.querySelector('.caso-detail-content');
    if (!content || content.dataset.fallbackPrepared === 'true') return false;

    const sections = Array.from(content.querySelectorAll(':scope > .caso-detail-section'));
    if (!sections.length) return false;

    sections.forEach((section, index) => {
      const title = normalize(section.querySelector('h3')?.textContent || '');

      if (index < 4 && !section.querySelector('.caso-section-number')) {
        const number = document.createElement('span');
        number.className = 'caso-section-number';
        number.textContent = `0${index + 1}`;
        section.prepend(number);
      }

      if (title.includes('servicios trabajados')) {
        section.classList.add('caso-detail-list-section', 'caso-detail-section-servicios');
      }

      if (title.includes('herramientas usadas')) {
        section.classList.add('caso-detail-list-section', 'caso-detail-section-herramientas');
      }
    });

    const fallbackMedia = document.querySelector('.caso-detail-media .caso-detail-media-fallback');
    if (fallbackMedia) {
      const mediaCard = fallbackMedia.closest('.caso-detail-media');
      const heroGrid = fallbackMedia.closest('.caso-detail-hero-grid');
      if (mediaCard) mediaCard.remove();
      if (heroGrid) heroGrid.classList.add('is-no-media');
    }

    resolveHeroMedia().catch(console.warn);
    content.dataset.fallbackPrepared = 'true';
    loadRecipeCarousel();
    return true;
  }

  function loadRecipeCarousel() {
    if (document.querySelector('script[data-fallback-recipe-carousel]')) return;
    const script = document.createElement('script');
    script.src = '/assets/js/caso-receta-carousel.js?v=9';
    script.defer = true;
    script.dataset.fallbackRecipeCarousel = 'true';
    document.body.appendChild(script);
  }

  if (prepareFallbackLayout()) return;

  const observer = new MutationObserver(() => {
    if (prepareFallbackLayout()) observer.disconnect();
  });

  observer.observe(root, { childList: true, subtree: true });
})();
