import { renderJsonLd, schemaForPath } from './_shared/schema.js';

const SITE_ORIGIN = 'https://agenciaconsalero.es';
const LEGACY_ORIGIN = 'https://salero.webagencia360.com';
const LEGACY_HOSTNAMES = new Set(['salero.webagencia360.com']);
const GTM_ID = 'GTM-WSLMDJ8N';

const MONTSERRAT_CSS = '<link rel="stylesheet" href="/assets/css/font-body-montserrat.css?v=3">';
const SERVICE_RELATED_CSS = '<link rel="stylesheet" href="/assets/css/service-related.css?v=1">';
const SERVICE_RELATED_JS = '<script src="/assets/js/service-related.js?v=1" defer></script>';
const SERVICE_HERO_SECTOR_CSS = '<link rel="stylesheet" href="/assets/css/service-hero-sector-style.css?v=4">';
const SERVICE_MOBILE_NAV_CSS = '<link rel="stylesheet" href="/assets/css/service-mobile-nav.css?v=1">';
const NAV_SERVICE_DROPDOWN_JS = '<script src="/assets/js/nav-service-dropdown.js?v=1" defer></script>';
const CASE_RECIPE_FIX_CSS = '<link rel="stylesheet" href="/assets/css/caso-receta-carousel-fix.css?v=3">';
const BLOG_FAQ_TYPOGRAPHY_CSS = '<link rel="stylesheet" href="/assets/css/ba-faq-typography.css?v=2">';
const CONSENT_CSS = '<link rel="stylesheet" href="/assets/css/consent.css?v=3">';
const CONSENT_JS = '<script src="/assets/js/consent.js?v=2" defer></script>';

const REMOVED_MENU_PACKS = new Set([
  '/nuestros-menus/media-racion/',
  '/nuestros-menus/el-pellizco/',
  '/nuestros-menus/menu-degustacion/'
]);
const REMOVED_PAGES = new Set([]);

const SEO_PAGES = {
  '/': {
    title: 'Agencia de marketing digital en Morón - Salero Digital',
    description: 'Web, SEO local, redes sociales y campañas para negocios de Morón, Arahal y comarca. Estrategia senior con cercanía y resultados medibles.',
    canonical: '/'
  },
  '/nuestros-menus/': {
    title: 'Packs de marketing para negocios - Salero Digital',
    description: 'Elige El Pellizco, Media Ración o El Menú Degustación según tu ritmo: presencia, crecimiento o estrategia digital integral.',
    canonical: '/nuestros-menus/'
  },
  '/el-menu/': {
    title: 'Servicios de marketing digital - Salero Digital',
    description: 'Elige desarrollo web, SEO local, redes sociales o campañas digitales para que tu negocio gane visibilidad, contactos y ventas.',
    canonical: '/el-menu/'
  },
  '/el-menu/cimientos-digitales/': {
    title: 'Desarrollo web para negocios locales - Salero Digital',
    description: 'Creamos webs rápidas, seguras y orientadas a conversión para negocios locales que necesitan una presencia digital profesional y rentable.',
    canonical: '/el-menu/cimientos-digitales/'
  },
  '/el-menu/el-pregonero/': {
    title: 'SEO local en Morón y comarca - Salero Digital',
    description: 'Mejoramos tu presencia en Google y Maps para que clientes de Morón, Arahal, Marchena y la comarca encuentren tu negocio.',
    canonical: '/el-menu/el-pregonero/'
  },
  '/el-menu/gracia-y-presencia/': {
    title: 'Gestión de redes sociales - Salero Digital',
    description: 'Creamos estrategia, calendario y contenido para que tu marca tenga presencia real, conecte con su comunidad y genere confianza.',
    canonical: '/el-menu/gracia-y-presencia/'
  },
  '/el-menu/el-empujon/': {
    title: 'Campañas de Google Ads y Meta Ads - Salero Digital',
    description: 'Lanzamos campañas en Google Ads y Meta Ads para captar tráfico, leads y clientes con inversión controlada y medición clara.',
    canonical: '/el-menu/el-empujon/'
  },
  '/sectores/': {
    title: 'Marketing para sectores locales - Salero Digital',
    description: 'Soluciones digitales para hostelería, comercios, pymes y marcas con origen. Marketing local con estrategia, cercanía y foco comercial.',
    canonical: '/sectores/'
  },
  '/sectores/marketing-para-hosteleria-turismo/': {
    title: 'Marketing para hostelería y turismo - Salero Digital',
    description: 'Atrae más reservas y clientes con web, SEO local, contenidos y campañas para bares, restaurantes, alojamientos rurales y turismo local.',
    canonical: '/sectores/marketing-para-hosteleria-turismo/'
  },
  '/sectores/marketing-para-comercios-pymes/': {
    title: 'Marketing para comercios y pymes - Salero Digital',
    description: 'Web, SEO local, redes y campañas para comercios y pymes que quieren atraer más clientes, ganar visibilidad y vender mejor.',
    canonical: '/sectores/marketing-para-comercios-pymes/'
  },
  '/sectores/marketing-para-almazaras-aceite/': {
    title: 'Marketing para almazaras y aceite - Salero Digital',
    description: 'Impulsa tu marca de aceite con web, SEO local, contenidos y campañas pensadas para almazaras de la Sierra Sur y la Campiña.',
    canonical: '/sectores/marketing-para-almazaras-aceite/'
  },
  '/la-receta/': {
    title: 'Agencia digital con experiencia - Salero Digital',
    description: 'Conoce cómo trabaja Salero Digital: estrategia senior, cercanía, oficio y marketing digital con los pies en la tierra.',
    canonical: '/la-receta/'
  },
  '/casos-de-exito/': {
    title: 'Casos de éxito en marketing digital - Salero Digital',
    description: 'Descubre proyectos reales de web, SEO, contenidos y campañas para marcas, negocios locales y organizaciones que confiaron en Salero Digital.',
    canonical: '/casos-de-exito/'
  },
  '/la-rebotica/': {
    title: 'Blog de marketing local - Salero Digital',
    description: 'Guías prácticas sobre SEO local, redes, campañas y web para negocios que quieren ganar visibilidad sin perder su forma de ser.',
    canonical: '/la-rebotica/'
  },
  '/hablamos/': {
    title: 'Contacto y cata digital - Salero Digital',
    description: 'Cuéntanos qué necesita tu negocio y preparamos una cata digital para mejorar tu web, posicionamiento, redes o campañas.',
    canonical: '/hablamos/'
  }
};

const GLOBAL_FOOTER = `<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h2>Salero Digital</h2>
        <p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p>
      </div>
      <div>
        <h3>El Menú</h3>
        <nav class="footer-nav" aria-label="Servicios de Salero Digital">
          <a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a>
          <a href="/el-menu/el-pregonero/">El Pregonero</a>
          <a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a>
          <a href="/el-menu/el-empujon/">El Empujón</a>
        </nav>
      </div>
      <div>
        <h3>Sectores</h3>
        <nav class="footer-nav" aria-label="Sectores de Salero Digital">
          <a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a>
          <a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a>
          <a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a>
        </nav>
      </div>
      <div>
        <h3>¿Hablamos?</h3>
        <p>Morón de la Frontera, Sierra Sur y Campiña.</p>
        <a href="/hablamos/">Pide tu cata digital</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Salero Digital</span>
      <span>Digitalizamos con salero, pero con los pies en la tierra.</span>
    </div>
  </div>
</footer>`;

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  if (LEGACY_HOSTNAMES.has(requestUrl.hostname)) {
    return Response.redirect(`${SITE_ORIGIN}${requestUrl.pathname}${requestUrl.search}`, 301);
  }

  const normalizedPath = normalizePath(requestUrl.pathname);

  if (REMOVED_PAGES.has(normalizedPath)) {
    return renderGoneResponse();
  }

  if (REMOVED_MENU_PACKS.has(normalizedPath)) {
    return Response.redirect(`${SITE_ORIGIN}/nuestros-menus/`, 301);
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const schema = isBlogArticlePath(requestUrl.pathname) ? null : schemaForPath(requestUrl.pathname);
  const html = await response.text();
  let nextHtml = replaceLegacyOrigin(html);
  nextHtml = injectMontserrat(nextHtml);
  nextHtml = injectNavServiceDropdown(nextHtml);
  nextHtml = injectServiceAssets(nextHtml, normalizedPath);
  nextHtml = versionCaseRecipeFix(nextHtml);
  nextHtml = injectBlogFaqTypography(nextHtml, normalizedPath);
  nextHtml = injectConsentAssets(nextHtml);
  nextHtml = normalizeFooter(nextHtml);
  nextHtml = removeLaRecetaLinks(nextHtml);
  nextHtml = optimizeAutoplayVideos(nextHtml);
  nextHtml = injectSeo(nextHtml, SEO_PAGES[normalizedPath]);
  nextHtml = injectGtm(nextHtml);

  if (schema && !nextHtml.includes('id="salero-schema-graph"') && !nextHtml.includes("id='salero-schema-graph'")) {
    const jsonLd = replaceLegacyOrigin(renderJsonLd(schema));
    nextHtml = nextHtml.includes('</head>')
      ? nextHtml.replace('</head>', `  ${jsonLd}\n</head>`)
      : `${nextHtml}\n${jsonLd}`;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function renderGoneResponse() {
  const html = `<!doctype html>
<html lang="es">
<head>
  <title>Página retirada | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_ORIGIN}/">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
</head>
<body>
  <main class="container section">
    <h1>Página retirada temporalmente</h1>
    <p>Esta sección no está disponible en este momento.</p>
    <p><a class="btn btn-primary" href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate'
    }
  });
}

function injectMontserrat(html = '') {
  if (html.includes('/assets/css/font-body-montserrat.css')) return html;
  return injectBefore(html, '</head>', `  ${MONTSERRAT_CSS}\n`);
}

function injectNavServiceDropdown(html = '') {
  if (html.includes('/assets/js/nav-service-dropdown.js')) return html;
  return injectBefore(html, '</body>', `  ${NAV_SERVICE_DROPDOWN_JS}\n`);
}

function injectServiceAssets(html = '', path = '') {
  if (!isServiceDetailPath(path)) return html;
  let next = html;
  if (!next.includes('/assets/css/service-related.css')) next = injectBefore(next, '</head>', `  ${SERVICE_RELATED_CSS}\n`);
  next = injectOrReplaceStylesheet(next, '/assets/css/service-hero-sector-style.css', SERVICE_HERO_SECTOR_CSS);
  next = injectOrReplaceStylesheet(next, '/assets/css/service-mobile-nav.css', SERVICE_MOBILE_NAV_CSS);
  if (!next.includes('/assets/js/service-related.js')) next = injectBefore(next, '</body>', `  ${SERVICE_RELATED_JS}\n`);
  return next;
}

function versionCaseRecipeFix(html = '') {
  return injectOrReplaceStylesheet(html, '/assets/css/caso-receta-carousel-fix.css', CASE_RECIPE_FIX_CSS);
}

function injectBlogFaqTypography(html = '', path = '') {
  if (!isBlogArticlePath(path) && !hasFaqMarkup(html)) return html;
  return injectOrReplaceStylesheet(html, '/assets/css/ba-faq-typography.css', BLOG_FAQ_TYPOGRAPHY_CSS);
}

function injectConsentAssets(html = '') {
  let next = html;
  next = injectOrReplaceStylesheet(next, '/assets/css/consent.css', CONSENT_CSS);
  if (!next.includes('/assets/js/consent.js')) next = injectBefore(next, '</body>', `  ${CONSENT_JS}\n`);
  return next;
}

function hasFaqMarkup(html = '') {
  return /ba-faq|faq|pregunta|preguntas frecuentes|accordion/i.test(html);
}

function injectOrReplaceStylesheet(html = '', hrefPath = '', tag = '') {
  if (html.includes(hrefPath)) return html;
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function injectBefore(html = '', marker = '', fragment = '') {
  return html.includes(marker) ? html.replace(marker, `${fragment}${marker}`) : `${html}\n${fragment}`;
}

function injectGtm(html = '') {
  if (!GTM_ID || html.includes(GTM_ID)) return html;

  const consentDefault = `<!-- Google Consent Mode v2 -->
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  personalization_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
</script>
<!-- End Google Consent Mode v2 -->`;

  const gtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;

  const gtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

  let next = injectBefore(html, '</head>', `  ${consentDefault}\n  ${gtmHead}\n`);
  next = next.replace(/<body([^>]*)>/i, `<body$1>\n  ${gtmBody}`);
  return next;
}

function normalizeFooter(html = '') {
  if (!/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>/i.test(html)) return html;
  return html.replace(/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i, GLOBAL_FOOTER);
}

function removeLaRecetaLinks(html = '') {
  return html;
}

function optimizeAutoplayVideos(html = '') {
  return html;
}

function injectSeo(html = '', data) {
  if (!data) return replaceLegacyOrigin(html);

  let next = replaceOrInsertTitle(html, data.title);
  next = replaceOrInsertMetaDescription(next, data.description);
  next = replaceOrInsertCanonical(next, absoluteUrl(data.canonical));
  return replaceLegacyOrigin(next);
}

function replaceOrInsertTitle(html = '', title = '') {
  if (!title) return html;
  const tag = `<title>${escapeHtml(title)}</title>`;
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, tag);
  }
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function replaceOrInsertMetaDescription(html = '', description = '') {
  if (!description) return html;
  const tag = `<meta name="description" content="${escapeAttr(description)}">`;
  const re = /<meta[^>]+name=["']description["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function replaceOrInsertCanonical(html = '', canonical = '') {
  if (!canonical) return html;
  const tag = `<link rel="canonical" href="${escapeAttr(canonical)}">`;
  const re = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function isBlogArticlePath(pathname = '/') {
  const normalized = normalizePath(pathname);
  return /^\/la-rebotica\/[^/]+\/$/.test(normalized);
}

function isServiceDetailPath(pathname = '/') {
  return /^\/el-menu\/[^/]+\/$/.test(pathname || '');
}

function normalizePath(pathname = '/') {
  const clean = String(pathname || '/').split('?')[0].split('#')[0];
  if (clean === '/') return '/';
  return `/${clean.replace(/^\/+|\/+$/g, '')}/`;
}

function absoluteUrl(value = '/') {
  if (/^https?:\/\//i.test(String(value))) return replaceLegacyOrigin(String(value));
  return `${SITE_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`;
}

function replaceLegacyOrigin(value = '') {
  return String(value || '').replaceAll(LEGACY_ORIGIN, SITE_ORIGIN);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
