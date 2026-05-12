async function saleroFetch(endpoint, params = {}) {
  const url = new URL(`${SALERO_CONFIG.apiBase}/${endpoint}`);
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`No se pudo cargar ${endpoint}`);
  return res.json();
}
async function getCollection(endpoint, params = {}) { return saleroFetch(endpoint, { per_page:100, _embed:1, ...params }); }
async function getBySlug(endpoint, slug) { const data = await saleroFetch(endpoint, { slug, _embed:1 }); return Array.isArray(data) && data.length ? data[0] : null; }
