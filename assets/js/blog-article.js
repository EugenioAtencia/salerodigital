(function () {
  const root = document.querySelector('[data-blog-article]');
  if (!root) return;

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

  function slugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const index = parts.indexOf('la-rebotica');
    if (index === -1) return parts[parts.length - 1] || '';
    return parts[index + 1] || '';
  }

  function stripHtml(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = value || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeHtml(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = value || '';
    tmp.querySelectorAll('script, iframe, object, embed, form').forEach((node) => node.remove());
    tmp.querySelectorAll('[style]').forEach((node) => node.removeAttribute('style'));
    tmp.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('javascript:')) link.removeAttribute('href');
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
      }
    });
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

  function readingTime(html) {
    const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  function postCategories(post) {
    const terms = post._embedded && post._embedded['wp:term'];
    if (!Array.isArray(terms)) return [];
    return (terms[0] || []).filter((cat) => cat.slug !== 'sin-categoria' && cat.slug !== 'uncategorized');
  }

  function featuredImage(post) {
    const media = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (!media) return null;
    const sizes = media.media_details && media.media_details.sizes;
    const src = sizes && (sizes.full || sizes.large || sizes.medium_large || sizes.medium);
    return {
      url: (src && src.source_url) || media.source_url,
      alt: media.alt_text || stripHtml(post.title && post.title.rendered) || 'Imagen del artículo'
    };
  }

  function setSeo(post) {
    const title = stripHtml(post.title && post.title.rendered ? post.title.rendered : 'Artículo de La Rebotica');
    const desc = stripHtml(post.excerpt && post.excerpt.rendered ? post.excerpt.rendered : '').slice(0, 155);
    document.title = `${title} | La Rebotica | Salero Digital`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (desc) meta.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/la-rebotica/${post.slug}/`);
  }

  function buildToc(contentEl) {
    const headings = [...contentEl.querySelectorAll('h2, h3')].filter((heading) => stripHtml(heading.innerHTML).length > 0);
    if (headings.length < 3) return '';

    const links = headings.map((heading, index) => {
      const id = heading.id || `apartado-${index + 1}`;
      heading.id = id;
      return `<a class="ba-toc__link ba-toc__link--${heading.tagName.toLowerCase()}" href="#${id}">${stripHtml(heading.innerHTML)}</a>`;
    }).join('');

    return `<aside class="ba-toc" aria-label="Índice del artículo"><span>En esta receta</span>${links}</aside>`;
  }

  async function fetchPost(slug) {
    const url = `${apiBase()}/posts?slug=${encodeURIComponent(slug)}&_embed=1&_t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Estado ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  function renderNotFound() {
    root.innerHTML = `
      <section class="ba-error-section">
        <div class="container">
          <div class="ba-error-card">
            <span class="eyebrow">La Rebotica</span>
            <h1>No hemos encontrado este artículo.</h1>
            <p>Puede que el contenido aún no esté publicado en el CMS o que el enlace haya cambiado.</p>
            <a class="btn btn-primary" href="/la-rebotica/">Volver a La Rebotica</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderPost(post) {
    setSeo(post);

    const title = sanitizeHtml(post.title && post.title.rendered ? post.title.rendered : 'Artículo de La Rebotica');
    const excerpt = stripHtml(post.excerpt && post.excerpt.rendered ? post.excerpt.rendered : '');
    const content = sanitizeHtml(post.content && post.content.rendered ? post.content.rendered : '');
    const image = featuredImage(post);
    const categories = postCategories(post);
    const category = categories[0];
    const date = formatDate(post.date);
    const minutes = readingTime(content);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'ba-content';
    contentWrapper.innerHTML = content;
    const toc = buildToc(contentWrapper);

    root.innerHTML = `
      <article class="ba-article">
        <section class="ba-hero">
          <div class="ba-hero-bg" aria-hidden="true"></div>
          <div class="container ba-hero-grid">
            <div class="ba-hero-copy">
              <a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a>
              <span class="eyebrow">${category ? category.name : 'La Rebotica'}</span>
              <h1>${title}</h1>
              ${excerpt ? `<p class="lead">${excerpt}</p>` : ''}
              <div class="ba-meta">
                ${date ? `<time datetime="${post.date}">${date}</time>` : ''}
                <span>${minutes} min de lectura</span>
                <span>Salero Digital</span>
              </div>
            </div>
            <aside class="ba-hero-card" aria-label="Resumen del artículo">
              <span>Receta digital</span>
              <p>Un contenido de La Rebotica para tomar decisiones con más criterio y menos ruido.</p>
              <div class="ba-hero-tags">
                ${(categories.length ? categories : [{ name: 'Marketing digital' }, { name: 'Estrategia' }]).slice(0, 4).map((cat) => `<strong>${cat.name}</strong>`).join('')}
              </div>
            </aside>
          </div>
        </section>

        ${image ? `
          <section class="ba-featured-section">
            <div class="container">
              <figure class="ba-featured">
                <img src="${image.url}" alt="${image.alt}" loading="eager">
              </figure>
            </div>
          </section>
        ` : ''}

        <section class="ba-body-section">
          <div class="container ba-body-grid">
            <div class="ba-sidebar">
              ${toc}
              <aside class="ba-side-cta">
                <span>Cata digital</span>
                <p>¿Quieres saber qué contenidos necesita tu negocio para ganar visibilidad y confianza?</p>
                <a href="/hablamos/">Pedir una cata</a>
              </aside>
            </div>

            <div class="ba-content-wrap">
              ${contentWrapper.outerHTML}
            </div>
          </div>
        </section>

        <section class="ba-final-cta">
          <div class="container ba-final-box">
            <span class="eyebrow">Siguiente paso</span>
            <h2>Que tu negocio no se quede solo leyendo estrategias.</h2>
            <p>Si este artículo te ha hecho ver una oportunidad, podemos revisar tu caso y decirte qué receta digital tendría más sentido para empezar.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a>
              <a class="btn btn-secondary" href="/la-rebotica/">Ver más artículos</a>
            </div>
          </div>
        </section>
      </article>
    `;
  }

  async function init() {
    const slug = slugFromPath();
    if (!slug || slug === 'detalle') {
      renderNotFound();
      return;
    }

    try {
      const post = await fetchPost(slug);
      if (!post) {
        renderNotFound();
        return;
      }
      renderPost(post);
    } catch (error) {
      root.innerHTML = `
        <section class="ba-error-section">
          <div class="container">
            <div class="ba-error-card">
              <span class="eyebrow">La Rebotica</span>
              <h1>No hemos podido cargar el artículo desde el CMS.</h1>
              <p>Revisa el endpoint de WordPress, CORS o la caché de Cloudflare. ${error.message ? error.message : ''}</p>
              <a class="btn btn-primary" href="/la-rebotica/">Volver a La Rebotica</a>
            </div>
          </div>
        </section>
      `;
    }
  }

  init();
})();
