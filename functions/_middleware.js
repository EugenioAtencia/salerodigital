import { renderJsonLd, schemaForPath } from './_shared/schema.js';

const MONTSERRAT_TEST_CSS = '<link rel="stylesheet" href="/assets/css/font-body-montserrat.css?v=1">';

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  if (isBlogArticlePath(requestUrl.pathname)) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const schema = schemaForPath(requestUrl.pathname);
  const html = await response.text();
  let nextHtml = injectMontserratTest(html);

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

function injectMontserratTest(html = '') {
  if (html.includes('/assets/css/font-body-montserrat.css')) return html;
  return html.includes('</head>')
    ? html.replace('</head>', `  ${MONTSERRAT_TEST_CSS}\n</head>`)
    : `${html}\n${MONTSERRAT_TEST_CSS}`;
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
