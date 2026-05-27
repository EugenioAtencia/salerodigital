(function () {
  const postsRoot = document.querySelector('[data-blog-posts]');
  if (!postsRoot) return;

  const statusEl = document.getElementById('rbPostsStatus');
  const filterbar = document.getElementById('rbFilterbar');
  const loadMoreBtn = document.getElementById('rbLoadMore');

  const state = {
    page: 1,
    perPage: 12,
    totalPages: 1,
    posts: [],
    activeCategory: 'all',
    loading: false
  };

  function apiBase() {
    const candidates = [
      window.SALERO_API_BASE,
      window.SALERO_CONFIG && window.SALERO_CONFIG.apiBase,
      window.SALERO_CONFIG && window.SALERO_CONFIG.apiBaseUrl,
      window.SALERO_CONFIG && window.SALERO_CONFIG.wpApiBase,
      window.SALERO_CMS && window.SALERO_CMS.apiBase
    ].filter(Boolean);

    let base = (candidates[0] || 'https://cms.webagencia360.com/wp-json/wp/v2').replace(/\/$/, '');

    if (base.endsWith('/wp-json')) base += '/wp/v2';
    if (!base.endsWith('/wp/v2')) base += '/wp-json/wp/v2';

    return base;
  }

  function stripHtml(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = value || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeHtml(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = value || '';
    tmp.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove());
    return tmp.innerHTML;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function postCategories(post) {
    const terms = post._embedded && post._embedded['wp:term'];
    if (!Array.isArray(terms)) return [];
    return (terms[0] || []).map((cat) => ({ id: String(cat.id), name: cat.name, slug: cat.slug }));
  }

  function featuredImage(post) {
    const media = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (!media) return null;
    const sizes = media.media_details && media.media_details.sizes;
    const src = sizes && (sizes.large || sizes.medium_large || sizes.medium || sizes.full);
    return {
      url: (src && src.source_url) || media.source_url,
      alt: media.alt_text || stripHtml(post.title && post.title.rendered) || 'Imagen del artículo'
    };
  }

  function primaryCategory(post) {
    const cats = postCategories(post).filter((cat) => cat.slug !== 'sin-categoria' && cat.slug !== 'uncategorized');
    return cats[0] || null;
  }

  function articleUrl(post) {
    return `/la-rebotica/${post.slug}/`;
  }

  function cardTemplate(post, index) {
    const title = sanitizeHtml(post.title && post.title.rendered ? post.title.rendered : 'Artículo sin título');
    const excerpt = stripHtml(post.excerpt && post.excerpt.rendered ? post.excerpt.rendered : '').slice(0, 170);
    const image = featuredImage(post);
    const cat = primaryCategory(post);
    const isFeatured = index === 0 && state.activeCategory === 'all';
    const cats = postCategories(post).map((item) => item.id).join(' ');
    const date = formatDate(post.date);

    return `
      <article class="rb-post-card ${isFeatured ? 'rb-post-card--featured' : ''}" data-categories="${cats}">
        <a class="rb-post-card__media" href="${articleUrl(post)}" aria-label="Leer ${stripHtml(title)}">
          ${image ? `<img src="${image.url}" alt="${image.alt}" loading="${isFeatured ? 'eager' : 'lazy'}">` : `<span class="rb-post-card__fallback" aria-hidden="true">SD</span>`}
        </a>
        <div class="rb-post-card__body">
          <div class="rb-post-card__meta">
            ${cat ? `<span class="rb-post-card__cat">${cat.name}</span>` : '<span class="rb-post-card__cat">La Rebotica</span>'}
            ${date ? `<time datetime="${post.date}">${date}</time>` : ''}
          </div>
          <h3><a href="${articleUrl(post)}">${title}</a></h3>
          ${excerpt ? `<p>${excerpt}${excerpt.length >= 170 ? '...' : ''}</p>` : ''}
          <a class="rb-post-card__link" href="${articleUrl(post)}">Leer artículo</a>
        </div>
      </article>
    `;
  }

  function renderFilters() {
    if (!filterbar) return;

    const categories = new Map();
    state.posts.forEach((post) => {
      postCategories(post).forEach((cat) => {
        if (cat.slug !== 'sin-categoria' && cat.slug !== 'uncategorized') categories.set(cat.id, cat.name);
      });
    });

    const buttons = ['<button class="rb-filter is-active" type="button" data-category="all">Todos</button>'];
    categories.forEach((name, id) => {
      buttons.push(`<button class="rb-filter" type="button" data-category="${id}">${name}</button>`);
    });

    filterbar.innerHTML = buttons.join('');
  }

  function filteredPosts() {
    if (state.activeCategory === 'all') return state.posts;
    return state.posts.filter((post) => postCategories(post).some((cat) => String(cat.id) === state.activeCategory));
  }

  function renderPosts() {
    const posts = filteredPosts();

    if (!posts.length) {
      postsRoot.innerHTML = `
        <div class="rb-empty">
          <strong>Aún estamos cocinando esta categoría.</strong><br>
          Prueba con otra temática o vuelve pronto para ver nuevas recetas digitales.
        </div>
      `;
      return;
    }

    postsRoot.innerHTML = posts.map(cardTemplate).join('');
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('rb-error', Boolean(isError));
    statusEl.hidden = !message;
  }

  async function fetchPosts(page) {
    const params = new URLSearchParams({
      _embed: '1',
      per_page: String(state.perPage),
      page: String(page),
      orderby: 'date',
      order: 'desc',
      status: 'publish',
      _t: String(Date.now())
    });

    const url = `${apiBase()}/posts?${params.toString()}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`No se pudieron cargar los artículos. Estado ${response.status}`);
    }

    state.totalPages = Number(response.headers.get('X-WP-TotalPages')) || page;
    return response.json();
  }

  async function loadPosts() {
    if (state.loading) return;
    state.loading = true;
    setStatus(state.page === 1 ? 'Cargando artículos desde el CMS...' : 'Cargando más artículos...');
    if (loadMoreBtn) loadMoreBtn.hidden = true;

    try {
      const posts = await fetchPosts(state.page);
      state.posts = state.posts.concat(posts);
      renderFilters();
      renderPosts();
      setStatus('');

      if (loadMoreBtn) {
        loadMoreBtn.hidden = state.page >= state.totalPages;
      }
    } catch (error) {
      postsRoot.innerHTML = `
        <div class="rb-error">
          <strong>No hemos podido cargar los artículos desde el CMS.</strong><br>
          Revisa el endpoint de WordPress, CORS o la caché de Cloudflare. ${error.message ? `<span>${error.message}</span>` : ''}
        </div>
      `;
      setStatus('', true);
    } finally {
      state.loading = false;
    }
  }

  if (filterbar) {
    filterbar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;

      state.activeCategory = button.dataset.category;
      filterbar.querySelectorAll('.rb-filter').forEach((item) => item.classList.toggle('is-active', item === button));
      renderPosts();
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (state.page < state.totalPages) {
        state.page += 1;
        loadPosts();
      }
    });
  }

  loadPosts();
})();