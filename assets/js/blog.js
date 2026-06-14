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
    if (Array.isArray(terms)) return (terms[0] || []).map((cat) => ({ id: String(cat.id), name: cat.name, slug: cat.slug }));
    if (Array.isArray(post.categories_data)) return post.categories_data.map((cat) => ({ id: String(cat.id || cat.slug || cat.name), name: cat.name || cat.label || cat.slug, slug: cat.slug || cat.name }));
    return [];
  }

  function featuredImage(post) {
    const direct = post.featured_image_url || post.salero_featured_image || '';
    if (direct) return { url: direct, alt: stripHtml(post.title && post.title.rendered) || 'Imagen del artículo' };

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

  async function fetchPosts() {
    if (typeof getCollection === 'function') {
      const data = await getCollection('posts', {
        orderby: 'date',
        order: 'desc',
        status: 'publish'
      });
      return Array.isArray(data) ? data : [];
    }
    throw new Error('No está disponible getCollection para cargar artículos estáticos.');
  }

  async function loadPosts() {
    if (state.loading) return;
    state.loading = true;
    setStatus('Cargando artículos...');
    if (loadMoreBtn) loadMoreBtn.hidden = true;

    try {
      const posts = await fetchPosts();
      state.posts = posts;
      state.totalPages = 1;
      renderFilters();
      renderPosts();
      setStatus('');
    } catch (error) {
      postsRoot.innerHTML = `
        <div class="rb-error">
          <strong>No hemos podido cargar los artículos.</strong><br>
          Revisa si existe el JSON estático de La Rebotica. ${error.message ? `<span>${error.message}</span>` : ''}
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
    loadMoreBtn.addEventListener('click', () => loadPosts());
  }

  loadPosts();
})();
