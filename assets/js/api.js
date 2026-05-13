function saleroResolveEndpoint(endpoint) {
  if (!endpoint) return endpoint;
  if (endpoint.startsWith('http')) return endpoint;
  if (endpoint.startsWith('salero/')) return endpoint;
  return (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints[endpoint]) ? SALERO_CONFIG.endpoints[endpoint] : endpoint;
}

function saleroEndpointUrl(endpoint) {
  const resolved = saleroResolveEndpoint(endpoint);
  if (resolved.startsWith('http')) return resolved;
  if (resolved.startsWith('salero/')) {
    return `${SALERO_CONFIG.apiBase.replace('/wp/v2', '')}/${resolved}`;
  }
  return `${SALERO_CONFIG.apiBase}/${resolved}`;
}

async function saleroFetch(endpoint, params = {}) {
  const url = new URL(saleroEndpointUrl(endpoint));
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { cache: 'no-store' });

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
