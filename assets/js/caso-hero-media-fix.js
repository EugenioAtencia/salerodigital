(() => {
  const mediaCache = new Map();

  function slugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  function getAcf(item = {}) {
    return item.acf || item.salero_acf || item.meta || {};
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
    const url = `${base.replace(/\/$/, '')}/media/${id}?_t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return null;

    const media = await response.json();
    mediaCache.set(id, media);
    return media;
  }

  async function resolveMedia(value) {
    const directUrl = mediaUrl(value);
    if (directUrl) return directUrl;

    const id = mediaId(value);
    if (!id) return '';

    const media = await fetchMediaById(id);
    return mediaUrl(media);
  }

  function featuredImage(item = {}) {
    const media = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
    return mediaUrl(media);
  }

  async function firstResolvedMedia(item = {}, keys = [], fallback = '') {
    const acf = getAcf(item);
    for (const key of keys) {
      const resolved = await resolveMedia(acf[key] || item[key]);
      if (resolved) return resolved;
    }
    return fallback || '';
  }

  async function fetchCase(slug) {
    if (typeof getBySlug === 'function') {
      const item = await getBySlug('casos', slug);
      if (item) return item;
    }

    const base = (window.SALERO_CONFIG && SALERO_CONFIG.apiBase) || 'https://cms.webagencia360.com/wp-json/wp/v2';
    const endpoint = (window.SALERO_CONFIG && SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints.casos) || 'casos-exito';
    const url = `${base.replace(/\/$/, '')}/${endpoint}?slug=${encodeURIComponent(slug)}&_embed=1&_t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return null;

    const data = await response.json();
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  function renderHeroMedia({ video, image, poster, title }) {
    if (video) {
      return `<video autoplay muted loop playsinline preload="metadata"${poster ? ` poster="${escapeAttr(poster)}"` : ''}><source src="${escapeAttr(video)}" type="video/mp4"></video>`;
    }

    if (image) {
      return `<img src="${escapeAttr(image)}" alt="${escapeAttr(title || 'Imagen del caso')}" loading="eager">`;
    }

    return '';
  }

  function escapeAttr(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function applyHeroMedia() {
    const root = document.querySelector('#caso-detalle-root');
    const grid = document.querySelector('.caso-detail-hero-grid');
    if (!root || !grid || grid.dataset.heroMediaFixed === 'true') return false;

    const slug = slugFromPath();
    if (!slug) return false;

    const item = await fetchCase(slug);
    if (!item) return false;

    const acf = getAcf(item);
    const title = acf.cliente_nombre || acf.nombre_caso || acf.nombre_cliente || acf.cliente || (item.title && item.title.rendered) || 'Caso de éxito';
    const featured = featuredImage(item);
    const video = await firstResolvedMedia(item, ['video_principal', 'video_principal_url', 'video_caso', 'video_campana', 'video']);
    const image = await firstResolvedMedia(item, ['imagen_principal', 'imagen_caso', 'imagen_destacada', 'imagen_campana', 'cover_image'], featured);
    const poster = await firstResolvedMedia(item, ['video_poster', 'poster_video', 'poster', 'imagen_principal', 'imagen_caso'], image || featured);
    const html = renderHeroMedia({ video, image, poster, title });

    if (!html) return false;

    let mediaCard = grid.querySelector('.caso-detail-media');
    if (!mediaCard) {
      mediaCard = document.createElement('div');
      mediaCard.className = 'caso-detail-media';
      grid.appendChild(mediaCard);
    }

    mediaCard.innerHTML = html;
    mediaCard.dataset.heroMediaResolved = 'true';
    grid.classList.remove('is-no-media');
    grid.dataset.heroMediaFixed = 'true';
    return true;
  }

  function start() {
    applyHeroMedia().catch(console.warn);

    const root = document.querySelector('#caso-detalle-root');
    if (!root) return;

    const observer = new MutationObserver(() => {
      applyHeroMedia().then((done) => {
        if (done) observer.disconnect();
      }).catch(console.warn);
    });

    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
