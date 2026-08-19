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

const SALERO_JSON_SAMPLE_LIMIT = 240;
const SALERO_SENSITIVE_QUERY_KEYS = /^(access_token|api[_-]?key|auth|authorization|code|key|password|secret|token)$/i;

function saleroSafeUrlForError(input) {
  const fallback = String(input || '')
    .replace(/([?&](?:access_token|api[_-]?key|auth|authorization|code|key|password|secret|token)=)[^&]*/gi, '$1[redacted]')
    .slice(0, 500);
  try {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://agenciaconsalero.es';
    const url = new URL(String(input), origin);
    url.searchParams.forEach((value, key) => {
      if (SALERO_SENSITIVE_QUERY_KEYS.test(key)) url.searchParams.set(key, '[redacted]');
    });
    return url.toString();
  } catch (error) {
    return fallback;
  }
}

async function saleroReadBodySample(response) {
  const text = await response.text();
  return text.slice(0, SALERO_JSON_SAMPLE_LIMIT).replace(/\s+/g, ' ').trim();
}

function saleroUnexpectedResponseType(contentType, sample) {
  if (/^\s*<!doctype html/i.test(sample) || /^\s*<html[\s>]/i.test(sample) || /<body[\s>]/i.test(sample)) return 'HTML';
  if (!contentType) return 'sin Content-Type JSON';
  return 'Content-Type no JSON';
}

function saleroJsonFetchError(message, details) {
  const error = new Error(message);
  error.name = 'SaleroJsonFetchError';
  Object.assign(error, details);
  return error;
}

async function fetchJson(url, options = {}) {
  const fetchOptions = options && typeof options === 'object' ? { ...options } : options;
  const onResponse = fetchOptions && fetchOptions.onResponse;
  if (fetchOptions && Object.prototype.hasOwnProperty.call(fetchOptions, 'onResponse')) delete fetchOptions.onResponse;

  const response = await fetch(url, fetchOptions);
  if (typeof onResponse === 'function') onResponse(response);

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const safeUrl = saleroSafeUrlForError(url);
  const statusText = response.statusText || '';

  if (!response.ok) {
    if (!isJson) {
      const sample = await saleroReadBodySample(response);
      const responseType = saleroUnexpectedResponseType(contentType, sample);
      throw saleroJsonFetchError(`JSON inválido en ${safeUrl}: estado ${response.status} ${statusText || ''}, Content-Type "${contentType || 'sin definir'}", respuesta inesperada ${responseType}.`, {
        url: safeUrl,
        status: response.status,
        statusText,
        contentType,
        responseType,
        bodySample: sample
      });
    }

    throw saleroJsonFetchError(`No se pudo cargar JSON desde ${safeUrl}: estado ${response.status} ${statusText || ''}, Content-Type "${contentType || 'sin definir'}".`, {
      url: safeUrl,
      status: response.status,
      statusText,
      contentType,
      responseType: 'JSON'
    });
  }

  if (!isJson) {
    const sample = await saleroReadBodySample(response);
    const responseType = saleroUnexpectedResponseType(contentType, sample);
    throw saleroJsonFetchError(`JSON inválido en ${safeUrl}: estado ${response.status} ${statusText || ''}, Content-Type "${contentType || 'sin definir'}", respuesta inesperada ${responseType}.`, {
      url: safeUrl,
      status: response.status,
      statusText,
      contentType,
      responseType,
      bodySample: sample
    });
  }

  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (parseError) {
    throw saleroJsonFetchError(`JSON malformado en ${safeUrl}: estado ${response.status} ${statusText || ''}, Content-Type "${contentType || 'sin definir'}".`, {
      url: safeUrl,
      status: response.status,
      statusText,
      contentType,
      responseType: 'JSON malformado',
      cause: parseError
    });
  }
}

if (typeof window !== 'undefined') {
  window.fetchJson = window.fetchJson || fetchJson;
  window.saleroFetchJson = fetchJson;
}

async function saleroFetch(endpoint, params = {}) {
  const url = new URL(saleroEndpointUrl(endpoint), window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  url.searchParams.set('_t', String(Date.now()));

  return fetchJson(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  });
}

async function getCollection(endpoint, params = {}) {
  return saleroFetch(endpoint, { per_page: 100, _embed: 1, ...params });
}

async function getBySlug(endpoint, slug) {
  const data = await saleroFetch(endpoint, { slug, _embed: 1 });
  return Array.isArray(data) && data.length ? data[0] : null;
}
