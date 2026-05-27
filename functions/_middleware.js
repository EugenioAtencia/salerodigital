import { renderJsonLd, schemaForPath } from './_shared/schema.js';

const SITE_ORIGIN = 'https://salero.webagencia360.com';
const MONTSERRAT_CSS = '<link rel="stylesheet" href="/assets/css/font-body-montserrat.css?v=3">';
const SERVICE_RELATED_CSS = '<link rel="stylesheet" href="/assets/css/service-related.css?v=1">';
const SERVICE_RELATED_JS = '<script src="/assets/js/service-related.js?v=1" defer></script>';
const SERVICE_HERO_SECTOR_CSS = '<link rel="stylesheet" href="/assets/css/service-hero-sector-style.css?v=4">';
const SERVICE_MOBILE_NAV_CSS = '<link rel="stylesheet" href="/assets/css/service-mobile-nav.css?v=1">';
const NAV_SERVICE_DROPDOWN_JS = '<script src="/assets/js/nav-service-dropdown.js?v=1" defer></script>';
const CASE_RECIPE_FIX_CSS = '<link rel="stylesheet" href="/assets/css/caso-receta-carousel-fix.css?v=3">';
const BLOG_FAQ_TYPOGRAPHY_CSS = '<link rel="stylesheet" href="/assets/css/ba-faq-typography.css?v=1">';
const REMOVED_MENU_PACKS = new Set([
  '/nuestros-menus/media-racion/',
  '/nuestros-menus/el-pellizco/',
  '/nuestros-menus/menu-degustacion/'
]);

const SEO_PAGES = {
  '/sectores/': {
    title: 'Marketing para sectores locales | Salero Digital',
    description: 'Estrategias digitales para hostelería, comercios, pymes y marcas con origen. Marketing local con criterio, cercanía y salero.',
    canonical: '/sectores/'
  },
  '/nuestros-menus/': {
    title: 'Packs de marketing digital | Salero Digital',
    description: 'Elige el menú digital que necesita tu negocio: presencia, crecimiento o estrategia integral con web, SEO, redes y campañas.',
    canonical: '/nuestros-menus/'
  },
  '/el-menu/': {
    title: 'Servicios de marketing digital | Salero Digital',
    description: 'Desarrollo web, SEO local, redes sociales y campañas digitales para negocios que quieren dejar de estar sosos en internet.',
    canonical: '/el-menu/'
  },
  '/hablamos/': {
    title: 'Hablemos de tu estrategia digital | Salero Digital',
    description: 'Cuéntanos qué necesita tu negocio y preparamos una cata digital para mejorar tu web, visibilidad, redes o campañas.',
    canonical: '/hablamos/'
  },
  '/la-receta/': {
    title: 'La receta de Salero Digital | Agencia con salero',
    description: 'Conoce la forma de trabajar de Salero Digital: estrategia, cercanía, oficio y marketing digital con los pies en la tierra.',
    canonical: '/la-receta/'
  },
  '/casos-de-exito/': {
    title: 'Casos de éxito de marketing digital | Salero Digital',
    description: 'Proyectos reales de estrategia, desarrollo web, contenidos y campañas para marcas, negocios locales y organizaciones.',
    canonical: '/casos-de-exito/'
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
  const normalizedPath = normalizePath(requestUrl.pathname);

  if (REMOVED_MENU_PACKS.has(normalizedPath)) {
    return Response.redirect(`${SITE_ORIGIN}/nuestros-menus/`, 301);
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const schema = isBlogArticlePath(requestUrl.pathname) ? null : schemaForPath(requestUrl.pathname);
  const html = await response.text();
  let nextHtml = injectMontserrat(html);
  nextHtml = injectNavServiceDropdown(nextHtml);
  nextHtml = injectServiceAssets(nextHtml, normalizedPath);
  nextHtml = versionCaseRecipeFix(nextHtml);
  nextHtml = injectBlogFaqTypography(nextHtml, normalizedPath);
  nextHtml = normalizeFooter(nextHtml);
  nextHtml = injectSeo(nextHtml, SEO_PAGES[normalizedPath]);

  if (schema && !nextHtml.includes('id="salero-schema-graph"') && !nextHtml.includes("id='salero-schema-graph'")) {
    const jsonLd = renderJsonLd(schema);
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

function injectMontserrat(html = '') {
  if (html.includes('/assets/css/font-body-montserrat.css')) return html;
  return html.includes('</head>')
    ? html.replace('</head>', `  ${MONTSERRAT_CSS}\n</head>`)
    : `${html}\n${MONTSERRAT_CSS}`;
}

function injectNavServiceDropdown(html = '') {
  if (html.includes('/assets/js/nav-service-dropdown.js')) return html;
  return html.includes('</body>')
    ? html.replace('</body>', `  ${NAV_SERVICE_DROPDOWN_JS}\n</body>`)
    : `${html}\n${NAV_SERVICE_DROPDOWN_JS}`;
}

function injectServiceAssets(html = '', path = '') {
  if (!isServiceDetailPath(path)) return html;
  let next = html;
  if (!next.includes('/assets/css/service-related.css')) {
    next = next.includes('</head>') ? next.replace('</head>', `  ${SERVICE_RELATED_CSS}\n</head>`) : `${next}\n${SERVICE_RELATED_CSS}`;
  }
  next = injectOrReplaceStylesheet(next, '/assets/css/service-hero-sector-style.css', SERVICE_HERO_SECTOR_CSS);
  next = injectOrReplaceStylesheet(next, '/assets/css/service-mobile-nav.css', SERVICE_MOBILE_NAV_CSS);
  if (!next.includes('/assets/js/service-related.js')) {
    next = next.includes('</body>') ? next.replace('</body>', `  ${SERVICE_RELATED_JS}\n</body>`) : `${next}\n${SERVICE_RELATED_JS}`;
  }
  return next;
}

function versionCaseRecipeFix(html = '') {
  return injectOrReplaceStylesheet(html, '/assets/css/caso-receta-carousel-fix.css', CASE_RECIPE_FIX_CSS);
}

function injectBlogFaqTypography(html = '', path = '') {
  if (!isBlogArticlePath(path) && !html.includes('ba-faq')) return html;
  return injectOrReplaceStylesheet(html, '/assets/css/ba-faq-typography.css', BLOG_FAQ_TYPOGRAPHY_CSS);
}

function injectOrReplaceStylesheet(html = '', hrefPath = '', tag = '') {
  const escaped = hrefPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<link[^>]+href=["']${escaped}(?:\\?v=[^"']*)?["'][^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${html}\n${tag}`;
}

function normalizeFooter(html = '') {
  if (!/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>/i.test(html)) return html;
  return html.replace(/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i, GLOBAL_FOOTER);
}

function injectSeo(html = '', data) {
  if (!data) return html;

  let next = replaceOrInsertTitle(html, data.title);
  next = replaceOrInsertMetaDescription(next, data.description);
  next = replaceOrInsertCanonical(next, absoluteUrl(data.canonical));
  return next;
}

function replaceOrInsertTitle(html = '', title = '') {
  if (!title) return html;
  const tag = `<title>${escapeHtml(title)}</title>`;
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, tag);
  }
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${tag}\n${html}`;
}

function replaceOrInsertMetaDescription(html = '', description = '') {
  if (!description) return html;
  const tag = `<meta name="description" content="${escapeAttr(description)}">`;
  const re = /<meta[^>]+name=["']description["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${tag}\n${html}`;
}

function replaceOrInsertCanonical(html = '', canonical = '') {
  if (!canonical) return html;
  const tag = `<link rel="canonical" href="${escapeAttr(canonical)}">`;
  const re = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${tag}\n${html}`;
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
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return `${SITE_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`;
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
