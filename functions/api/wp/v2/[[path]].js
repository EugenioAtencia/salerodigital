const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';

export async function onRequest(context) {
  const { request, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  const pathParam = params.path || '';
  const path = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam || '');
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${CMS_API_BASE}/${path}`);

  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false
      }
    });

    const headers = new Headers(upstream.headers);
    Object.entries(corsHeaders()).forEach(([key, value]) => headers.set(key, value));
    headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    headers.delete('set-cookie');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  } catch (error) {
    return Response.json({
      error: 'No se pudo conectar con WordPress',
      detail: String(error && error.message ? error.message : error)
    }, {
      status: 502,
      headers: {
        ...corsHeaders(),
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
