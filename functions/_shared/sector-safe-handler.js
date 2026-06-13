import { handleSectorStoryRequest } from './sector-story-transformer.js';

const PRODUCTION_ORIGIN = 'https://agenciaconsalero.es';
const LEGACY_ORIGIN = 'https://salero.webagencia360.com';
const SECTOR_TIMEOUT_MS = 4500;

export async function handleSafeSectorRequest(context) {
  try {
    const response = await Promise.race([
      handleSectorStoryRequest(context),
      timeoutResponse(SECTOR_TIMEOUT_MS)
    ]);

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');

    return new Response(rewriteLegacyOrigin(html), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    return renderSafeError();
  }
}

function timeoutResponse(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(renderSafeError()), ms);
  });
}

function renderSafeError() {
  return new Response(`<!doctype html>
<html lang="es">
<head>
  <title>Sector temporalmente no disponible | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
</head>
<body>
  <main class="container section">
    <h1>Sector temporalmente no disponible</h1>
    <p>La landing dinámica no ha podido cargarse desde WordPress en este momento. La página existe, pero el CMS no ha respondido a tiempo.</p>
    <p><a class="btn btn-primary" href="/sectores/">Volver a sectores</a></p>
  </main>
</body>
</html>`, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate'
    }
  });
}

function rewriteLegacyOrigin(html) {
  return String(html || '').split(LEGACY_ORIGIN).join(PRODUCTION_ORIGIN);
}
