import { renderJsonLd, schemaForPath } from './_shared/schema.js';

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  if (isBlogArticlePath(requestUrl.pathname)) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const schema = schemaForPath(requestUrl.pathname);
  if (!schema) return response;

  const html = await response.text();
  if (html.includes('id="salero-schema-graph"') || html.includes("id='salero-schema-graph'")) {
    return new Response(html, response);
  }

  const jsonLd = renderJsonLd(schema);
  const nextHtml = html.includes('</head>')
    ? html.replace('</head>', `  ${jsonLd}\n</head>`)
    : `${html}\n${jsonLd}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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
