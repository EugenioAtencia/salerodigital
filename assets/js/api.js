function saleroResolveEndpoint(endpoint) {
  if (!endpoint) return endpoint;
  if (endpoint.startsWith('http')) return endpoint;
  if (endpoint.startsWith('salero/')) return endpoint;
  return (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints[endpoint]) ? SALERO_CONFIG.endpoints[endpoint] : endpoint;
}

function saleroStaticFolder(endpoint) {
  const resolved = saleroResolveEndpoint(endpoint);
  const map = {
    pages: 'wp-content/uploads/salero-json/pages',
    posts: 'wp-content/uploads/salero-json/posts',
    servicios: 'wp-content/uploads/salero-json/servicios',
    sectores: 'wp-content/uploads/salero-json/sectores',
    'menu-packs': 'wp-content/uploads/salero-json/menu-packs',
    'casos-exito': 'wp-content/uploads/salero-json/casos'
  };
  return map[resolved] || '';
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

async function saleroFetchJson(url) {
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en ${url.toString()}`);
  }

  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(`Respuesta no JSON en ${url.toString()}`);
  }

  return JSON.parse(trimmed);
}

function saleroNormalizePayload(payload) {
  if (payload && typeof payload === 'object' && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
}

async function saleroFetchStatic(endpoint, params = {}) {
  const folder = saleroStaticFolder(endpoint);
  if (!folder) throw new Error(`Sin carpeta estática para ${endpoint}`);

  const slug = params.slug ? String(params.slug).replace(/^\/+|\/+$/g, '') : '';
  const path = slug ? `/${folder}/${encodeURIComponent(slug)}.json` : `/${folder}/index.json`;
  const url = new URL(path, window.location.origin);
  url.searchParams.set('_t', String(Date.now()));

  const payload = await saleroFetchJson(url);
  return saleroNormalizePayload(payload);
}

async function saleroFetchCms(endpoint, params = {}) {
  const url = new URL(saleroEndpointUrl(endpoint), window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  url.searchParams.set('_t', String(Date.now()));
  return saleroFetchJson(url);
}

async function saleroFetch(endpoint, params = {}) {
  try {
    return await saleroFetchStatic(endpoint, params);
  } catch (staticError) {
    try {
      return await saleroFetchCms(endpoint, params);
    } catch (cmsError) {
      throw new Error(`No se pudo cargar ${endpoint}. Primero se intentó JSON estático y después CMS. Error estático: ${staticError.message}. Error CMS: ${cmsError.message}`);
    }
  }
}

async function getCollection(endpoint, params = {}) {
  return saleroFetch(endpoint, { per_page: 100, _embed: 1, ...params });
}

async function getBySlug(endpoint, slug) {
  const data = await saleroFetch(endpoint, { slug, _embed: 1 });
  if (Array.isArray(data)) return data.length ? data[0] : null;
  return data || null;
}
