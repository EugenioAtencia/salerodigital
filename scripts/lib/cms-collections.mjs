export const API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
export const ENDPOINTS = ['servicios', 'sectores', 'casos-exito', 'posts'];

function totalHeader(response, name) {
  const value = response.headers.get(name);
  if (value === null || !/^\d+$/.test(value)) throw new Error(`Missing or invalid ${name}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${name}`);
  return number;
}

export function validateItem(item, endpoint) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${endpoint}: invalid record`);
  if (!Number.isSafeInteger(item.id) || item.id <= 0) throw new Error(`${endpoint}: missing id`);
  // WordPress also supports percent-encoded non-ASCII slugs. Preserve, never rewrite them.
  if (typeof item.slug !== 'string' || !/^(?:[a-z0-9_-]|%[a-f0-9]{2})+$/i.test(item.slug) || /^(detalle|page|index)$/i.test(item.slug)) throw new Error(`${endpoint}: invalid slug`);
  if (typeof item.title?.rendered !== 'string' || !item.title.rendered.replace(/<[^>]*>/g, '').trim()) throw new Error(`${endpoint}: missing title`);
  if (typeof item.excerpt?.rendered !== 'string') throw new Error(`${endpoint}: missing excerpt`);
  if (item.status !== 'publish') throw new Error(`${endpoint}: non-public record`);
  if (endpoint === 'posts' && (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(item.date) || !Number.isFinite(Date.parse(item.date)))) throw new Error(`${endpoint}: invalid date`);
  for (const key of ['acf', 'salero_acf']) {
    if (item[key] !== undefined && item[key] !== false && (!item[key] || typeof item[key] !== 'object' || Array.isArray(item[key]))) throw new Error(`${endpoint}: invalid ${key}`);
  }
  return item;
}

export async function fetchCollection(endpoint, { apiBase = API_BASE, fetchImpl = fetch, timeoutMs = 15000, perPage = 100 } = {}) {
  const items = [], slugs = new Set(), ids = new Set();
  let expectedTotal, expectedPages;
  for (let page = 1; page <= (expectedPages ?? 1); page++) {
    const url = new URL(`${apiBase.replace(/\/$/, '')}/${endpoint}`);
    Object.entries({ per_page: perPage, page, _embed: 1, status: 'publish', orderby: 'date', order: 'desc' }).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response, data;
    try {
      response = await fetchImpl(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`${endpoint} page ${page}: HTTP ${response.status}`);
      if (!/^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw new Error(`${endpoint}: non-JSON Content-Type`);
      data = await response.json();
    } finally { clearTimeout(timer); }
    if (!Array.isArray(data)) throw new Error(`${endpoint}: expected array`);
    const total = totalHeader(response, 'X-WP-Total');
    const pages = totalHeader(response, 'X-WP-TotalPages');
    if (pages !== Math.ceil(total / perPage)) throw new Error(`${endpoint}: inconsistent pagination totals`);
    if (page === 1) { expectedTotal = total; expectedPages = pages; }
    if (total !== expectedTotal || pages !== expectedPages) throw new Error(`${endpoint}: collection changed during pagination`);
    const expectedLength = Math.min(perPage, Math.max(0, total - (page - 1) * perPage));
    if (data.length !== expectedLength) throw new Error(`${endpoint}: partial page ${page}`);
    for (const item of data) {
      validateItem(item, endpoint);
      const key = decodeURIComponent(item.slug).toLowerCase();
      if (slugs.has(key) || ids.has(item.id)) throw new Error(`${endpoint}: duplicate slug or id`);
      slugs.add(key); ids.add(item.id); items.push(item);
    }
  }
  if (items.length !== expectedTotal) throw new Error(`${endpoint}: incomplete collection`);
  return items;
}

export async function fetchCollections(options = {}) {
  const collections = {};
  for (const endpoint of ENDPOINTS) collections[endpoint] = await fetchCollection(endpoint, options);
  return collections;
}
