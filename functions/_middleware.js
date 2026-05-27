import { renderJsonLd, schemaForPath } from './_shared/schema.js';

export async function onRequest(context) {
  const response = await context.next();
  const requestUrl = new URL(context.request.url);
  const schema = schemaForPath(requestUrl.pathname);

  if (!schema) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

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
