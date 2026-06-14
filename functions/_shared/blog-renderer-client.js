const SITE_ORIGIN = 'https://agenciaconsalero.es';

export async function handleBlogPostRequest(context) {
  const slug = sanitizeSlug(context.params.slug || context.params.path || '');
  if (!slug) return htmlResponse(renderErrorPage('Artículo no encontrado', 'No se ha recibido un slug válido para cargar el artículo.'), 404);
  return htmlResponse(renderShell(slug), 200);
}

function renderShell(slug) {
  return `<!doctype html>
<html lang="es">
<head>
  <title>La Rebotica | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Artículo de La Rebotica de Salero Digital.">
  <link rel="canonical" href="${SITE_ORIGIN}/la-rebotica/${escapeAttr(slug)}/">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/blog-article.css?v=8">
  <link rel="stylesheet" href="/assets/css/blog-article-hero-motion.css?v=1">
</head>
<body class="blog-article-page" data-post-slug="${escapeAttr(slug)}">
${renderHeader()}
<main class="ba-page" data-blog-article-root>
  <section class="ba-hero">
    <div class="ba-hero-bg" aria-hidden="true"></div>
    <div class="container ba-hero-grid">
      <div class="ba-hero-copy">
        <a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a>
        <span class="eyebrow">La Rebotica</span>
        <h1>Cargando artículo...</h1>
        <p class="lead">Estamos cargando el contenido desde el CMS.</p>
      </div>
    </div>
  </section>
</main>
${renderFooter()}
<script src="/assets/js/helpers.js?v=50"></script>
<script src="/assets/js/blog-article-client.js?v=1"></script>
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
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container" style="padding:9rem 0"><span class="eyebrow">La Rebotica</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a class="btn btn-primary" href="/la-rebotica/">Volver a La Rebotica</a></p></main>${renderFooter()}<script src="/assets/js/helpers.js?v=50"></script></body></html>`;
}

function sanitizeSlug(value = '') { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); }
function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function escapeAttr(value = '') { return escapeHtml(value); }
function htmlResponse(html, status = 200) { return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }); }
