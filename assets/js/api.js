function saleroResolveEndpoint(endpoint) {
  if (!endpoint) return endpoint;
  if (endpoint.startsWith('http')) return endpoint;
  if (endpoint.startsWith('salero/')) return endpoint;
  return (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints[endpoint]) ? SALERO_CONFIG.endpoints[endpoint] : endpoint;
}

function saleroEndpointUrl(endpoint) {
  const resolved = saleroResolveEndpoint(endpoint);
  const base = SALERO_CONFIG.apiBase || 'https://cms.webagencia360.com/wp-json/wp/v2';

  if (resolved.startsWith('http')) return resolved;

  if (resolved.startsWith('salero/')) {
    const cmsBase = SALERO_CONFIG.cmsApiBase || base;
    return `${cmsBase.replace('/wp/v2', '')}/${resolved}`;
  }

  return `${base.replace(/\/$/, '')}/${resolved}`;
}

async function saleroFetch(endpoint, params = {}) {
  const url = new URL(saleroEndpointUrl(endpoint), window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  url.searchParams.set('_t', String(Date.now()));

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`No se pudo cargar ${endpoint}. Endpoint real: ${saleroResolveEndpoint(endpoint)}. Estado: ${res.status}`);
  }

  return res.json();
}

async function getCollection(endpoint, params = {}) {
  return saleroFetch(endpoint, { per_page: 100, _embed: 1, ...params });
}

async function getBySlug(endpoint, slug) {
  const data = await saleroFetch(endpoint, { slug, _embed: 1 });
  return Array.isArray(data) && data.length ? data[0] : null;
}
