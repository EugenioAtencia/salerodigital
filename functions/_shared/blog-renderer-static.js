const SITE_ORIGIN = 'https://agenciaconsalero.es';

export async function handleBlogPostRequest(context) {
  const slug = sanitizeSlug(context.params.slug || context.params.path || '');
  if (!slug) return htmlResponse(renderErrorPage('Artículo no encontrado', 'No se ha recibido un slug válido para cargar el artículo.'), 404);

  try {
    const post = await fetchPost(slug);
    if (!post) return htmlResponse(renderErrorPage('Artículo no encontrado', `No existe ningún JSON estático para ${escapeHtml(slug)}.`), 404);
    return htmlResponse(renderPostPage(slug, post), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el artículo desde el JSON estático', error && error.message ? error.message : String(error)), 500);
  }
}

async function fetchPost(slug) {
  const url = new URL(`/wp-content/uploads/salero-json/posts/${encodeURIComponent(slug)}.json`, SITE_ORIGIN);
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const text = await response.text();
  const trimmed = text.trim();
  if (!response.ok) throw new Error(`JSON estático HTTP ${response.status}: ${url.toString()}`);
  if (!trimmed.startsWith('{')) throw new Error(`El JSON estático no devolvió JSON: ${trimmed.slice(0, 100).replace(/\s+/g, ' ')}`);

  const json = JSON.parse(trimmed);
  if (!json || json.success !== true || !json.data) throw new Error('El JSON del artículo no contiene success true con data.');
  return json.data;
}

function renderPostPage(slug, post) {
  const title = stripHtml(post?.title?.rendered || 'Artículo de La Rebotica');
  const content = sanitizeContent(post?.content?.rendered || '<p>Contenido pendiente de sincronizar.</p>');
  const excerpt = stripHtml(post?.excerpt?.rendered || '').slice(0, 170);
  const image = post.featured_image_url || '';
  const canonical = `${SITE_ORIGIN}/la-rebotica/${slug}/`;
  const metaDescription = (excerpt || stripHtml(content).slice(0, 155)).slice(0, 155);
  const category = Array.isArray(post.categories_data) && post.categories_data[0] ? post.categories_data[0].name : 'La Rebotica';

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(title)} | La Rebotica | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  ${image ? `<meta property="og:image" content="${escapeAttr(image)}">` : ''}
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/blog-article.css?v=8">
  <link rel="stylesheet" href="/assets/css/blog-article-hero-motion.css?v=1">
</head>
<body class="blog-article-page">
${renderHeader()}
  <main class="ba-page">
    <article class="ba-article">
      <section class="ba-hero ${image ? 'ba-hero--with-image' : ''}">
        ${image ? `<img class="ba-hero-bg-image" src="${escapeAttr(image)}" alt="" aria-hidden="true" loading="eager">` : ''}
        <div class="ba-hero-bg" aria-hidden="true"></div>
        <div class="container ba-hero-grid">
          <div class="ba-hero-copy">
            <a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a>
            <span class="eyebrow">${escapeHtml(category)}</span>
            <h1>${escapeHtml(title)}</h1>
            ${excerpt ? `<p class="lead">${escapeHtml(excerpt)}</p>` : ''}
            <div class="ba-meta"><span>Salero Digital</span></div>
          </div>
          <aside class="ba-hero-card" aria-label="Resumen del artículo"><span>Receta digital</span><p>Un contenido de La Rebotica para tomar decisiones con más criterio y menos ruido.</p></aside>
        </div>
      </section>
      <section class="ba-body-section"><div class="container ba-body-grid"><div class="ba-sidebar"><aside class="ba-side-cta"><span>Cata digital</span><p>¿Quieres saber qué contenidos necesita tu negocio para ganar visibilidad y confianza?</p><a href="/hablamos/">Pedir una cata</a></aside></div><div class="ba-content-wrap"><div class="ba-content">${content}</div></div></div></section>
      <section class="ba-final-cta"><div class="container ba-final-box"><span class="eyebrow">Siguiente paso</span><h2>Que tu negocio no se quede solo leyendo estrategias.</h2><p>Si este artículo te ha hecho ver una oportunidad, podemos revisar tu caso y decirte qué receta digital tendría más sentido para empezar.</p><div class="hero-actions"><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><a class="btn btn-secondary" href="/la-rebotica/">Ver más artículos</a></div></div></section>
    </article>
  </main>
${renderFooter()}
<script src="/assets/js/helpers.js?v=41"></script>
</body>
</html>`;
}

function renderHeader() {
  return `<header class="site-header"><div class="container header-inner"><a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a><nav class="nav" aria-label="Menú principal"></nav><div class="header-actions"><a class="nav-contact" href="/hablamos/">¿Hablamos?</a><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button></div></div></header>`;
}

function renderFooter() {
  return `<footer class="footer"><div class="container"><div class="footer-grid"><div><h2>Salero Digital</h2><p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p></div><div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div><div><h3>Sectores</h3><nav class="footer-nav"><a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a><a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a><a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a></nav></div><div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div></div><div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div></div></footer><a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
}

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container" style="padding:9rem 0"><span class="eyebrow">La Rebotica</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a class="btn btn-primary" href="/la-rebotica/">Volver a La Rebotica</a></p></main>${renderFooter()}<script src="/assets/js/helpers.js?v=41"></script></body></html>`;
}

function sanitizeSlug(value = '') { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); }
function stripHtml(value = '') { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function sanitizeContent(value = '') { return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, ''); }
function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function escapeAttr(value = '') { return escapeHtml(value); }
function htmlResponse(html, status = 200) { return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }); }
