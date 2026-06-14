(function () {
  var root = document.querySelector('[data-blog-article-root]');
  if (!root) return;

  var slug = document.body.dataset.postSlug || window.location.pathname.split('/').filter(Boolean).pop();
  var CMS = 'https://cms.webagencia360.com/wp-json/wp/v2';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function strip(value) {
    var div = document.createElement('div');
    div.innerHTML = value || '';
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function cleanHtml(value) {
    var div = document.createElement('div');
    div.innerHTML = value || '';
    div.querySelectorAll('script, iframe, object, embed').forEach(function (node) { node.remove(); });
    return div.innerHTML;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function featuredImage(post) {
    var media = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (!media) return '';
    var sizes = media.media_details && media.media_details.sizes;
    var chosen = sizes && (sizes.large || sizes.medium_large || sizes.full || sizes.medium);
    return (chosen && chosen.source_url) || media.source_url || '';
  }

  function categories(post) {
    var terms = post._embedded && post._embedded['wp:term'];
    if (!Array.isArray(terms)) return [];
    return (terms[0] || []).map(function (cat) { return cat.name; }).filter(Boolean);
  }

  async function fetchPost() {
    var url = CMS + '/posts?slug=' + encodeURIComponent(slug) + '&_embed=1&_t=' + Date.now();
    var response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('WordPress respondió con estado ' + response.status);
    var text = await response.text();
    var trimmed = text.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) throw new Error('WordPress no devolvió JSON válido.');
    var data = JSON.parse(trimmed);
    var post = Array.isArray(data) ? data[0] : data;
    if (!post) throw new Error('No existe ningún artículo publicado con este slug.');
    return post;
  }

  function render(post) {
    var title = strip(post.title && post.title.rendered ? post.title.rendered : 'Artículo de La Rebotica');
    var content = cleanHtml(post.content && post.content.rendered ? post.content.rendered : '<p>Contenido pendiente.</p>');
    var excerpt = strip(post.excerpt && post.excerpt.rendered ? post.excerpt.rendered : '').slice(0, 180);
    var image = featuredImage(post);
    var cats = categories(post);
    var primary = cats[0] || 'La Rebotica';
    var date = formatDate(post.date);

    document.title = title + ' | La Rebotica | Salero Digital';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', (excerpt || strip(content).slice(0, 155)).slice(0, 155));

    root.innerHTML = '<article class="ba-article">' +
      '<section class="ba-hero ' + (image ? 'ba-hero--with-image' : '') + '">' +
        (image ? '<img class="ba-hero-bg-image" src="' + esc(image) + '" alt="" aria-hidden="true" loading="eager">' : '') +
        '<div class="ba-hero-bg" aria-hidden="true"></div>' +
        '<div class="container ba-hero-grid"><div class="ba-hero-copy">' +
          '<a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a>' +
          '<span class="eyebrow">' + esc(primary) + '</span>' +
          '<h1>' + esc(title) + '</h1>' +
          (excerpt ? '<p class="lead">' + esc(excerpt) + '</p>' : '') +
          '<div class="ba-meta">' + (date ? '<time datetime="' + esc(post.date) + '">' + esc(date) + '</time>' : '') + '<span>Salero Digital</span></div>' +
        '</div><aside class="ba-hero-card"><span>Receta digital</span><p>Un contenido de La Rebotica para tomar decisiones con más criterio y menos ruido.</p></aside></div>' +
      '</section>' +
      '<section class="ba-body-section"><div class="container ba-body-grid"><div class="ba-sidebar"><aside class="ba-side-cta"><span>Cata digital</span><p>¿Quieres saber qué contenidos necesita tu negocio para ganar visibilidad y confianza?</p><a href="/hablamos/">Pedir una cata</a></aside></div><div class="ba-content-wrap"><div class="ba-content">' + content + '</div></div></div></section>' +
      '<section class="ba-final-cta"><div class="container ba-final-box"><span class="eyebrow">Siguiente paso</span><h2>Que tu negocio no se quede solo leyendo estrategias.</h2><p>Si este artículo te ha hecho ver una oportunidad, podemos revisar tu caso y decirte qué receta digital tendría más sentido para empezar.</p><div class="hero-actions"><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><a class="btn btn-secondary" href="/la-rebotica/">Ver más artículos</a></div></div></section>' +
    '</article>';
  }

  fetchPost().then(render).catch(function (error) {
    root.innerHTML = '<section class="ba-hero"><div class="container ba-hero-grid"><div class="ba-hero-copy"><a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a><span class="eyebrow">La Rebotica</span><h1>No hemos podido cargar el artículo</h1><p class="lead">' + esc(error.message || error) + '</p></div></div></section>';
  });
})();
