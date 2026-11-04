// Snapshot builds serve only pages certified in their own deployment receipt.
// Legacy deployments retain their previous handler for rollback.
export async function snapshotPage(context, directory, legacy) {
  const response = await context.env.ASSETS.fetch(new Request(new URL('/salero-build.json', context.request.url), { headers: { Accept: 'application/json' } }));
  if (response.status === 404) return legacy(context);
  if (response.status !== 200 || !/application\/json/i.test(response.headers.get('content-type') || '')) return unavailable();
  let receipt; try { receipt = await response.json(); } catch { return unavailable(); }
  if (receipt.mode !== 'snapshot-coordinated') return legacy(context);
  if (receipt.buildSuccess !== true || receipt.snapshotConsistent !== true || receipt.tests !== 'passed' || !receipt.pages) return unavailable();
  const raw = context.params.slug || context.params.path || '';
  const slug = String(Array.isArray(raw) ? raw[0] : raw).replace(/^\/+|\/+$/g, '');
  if (!/^(?:[a-z0-9_-]|%[a-f0-9]{2})+$/i.test(slug) || ['detalle','page','index'].includes(slug.toLowerCase())) return missing();
  return certifiedFile(context, receipt, `${directory}/${slug}/index.html`);
}
// Used only by generated isolated staging middleware, including listing and sitemap.
export async function snapshotFile(context, file) {
  const response = await context.env.ASSETS.fetch(new Request(new URL('/salero-build.json', context.request.url)));
  if (response.status !== 200) return unavailable();
  let receipt; try { receipt = await response.json(); } catch { return unavailable(); }
  if (receipt.mode !== 'snapshot-coordinated' || receipt.scope !== 'rebotica' || receipt.buildSuccess !== true || receipt.snapshotConsistent !== true || receipt.tests !== 'passed') return unavailable();
  return certifiedFile(context, receipt, file);
}
async function certifiedFile(context, receipt, file) {
  const xml = file === 'sitemap.xml';
  const expected = xml ? receipt.sitemapSha256 : receipt.pages?.[file];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) return missing();
  const asset = await context.env.ASSETS.fetch(new Request(new URL(`/${file}`, context.request.url), { headers: { Accept: xml ? 'application/xml' : 'text/html' } }));
  if (asset.status !== 200 || (!xml && !/text\/html/i.test(asset.headers.get('content-type') || ''))) return unavailable();
  const bytes = await asset.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
  if (hash !== expected) return unavailable();
  return new Response(bytes, { status: 200, headers: { 'Content-Type': xml ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'x-salero-render': 'snapshot-asset' } });
}
const unavailable = () => new Response('Publicación no verificable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
const missing = () => new Response('Contenido no publicado.', { status: 404, headers: { 'Cache-Control': 'no-store' } });

// One editorial delivery path for coordinated staging and future production artifacts.
// A legacy deployment without the coordinated receipt keeps its existing behavior.
export async function snapshotEditorialRequest(context, normalizedPath) {
  if (normalizedPath !== '/sitemap.xml/' && !normalizedPath.startsWith('/la-rebotica/')) return null;
  const response = await context.env.ASSETS.fetch(new Request(new URL('/salero-build.json', context.request.url), {headers: {Accept: 'application/json'}}));
  if (response.status === 404) return null;
  if (response.status !== 200 || !/application\/json/i.test(response.headers.get('content-type') || '')) return unavailable();
  let receipt; try { receipt = await response.json(); } catch { return unavailable(); }
  if (receipt.mode !== 'snapshot-coordinated') return null;
  if (receipt.scope !== 'rebotica' || receipt.buildSuccess !== true || receipt.snapshotConsistent !== true || receipt.tests !== 'passed' || !receipt.pages) return unavailable();
  const file = normalizedPath === '/sitemap.xml/' ? 'sitemap.xml' : normalizedPath.slice(1) + 'index.html';
  return certifiedFile(context, receipt, file);
}
