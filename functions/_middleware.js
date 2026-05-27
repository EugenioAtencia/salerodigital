import { renderJsonLd, schemaForPath } from './_shared/schema.js';

const SITE_ORIGIN = 'https://salero.webagencia360.com';
const MONTSERRAT_CSS = '<link rel="stylesheet" href="/assets/css/font-body-montserrat.css?v=2">';
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
