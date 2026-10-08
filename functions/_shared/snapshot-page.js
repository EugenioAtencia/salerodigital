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
  const file = `${directory}/${slug}/index.html`, expected = receipt.pages[file];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) return missing();
  const asset = await context.env.ASSETS.fetch(new Request(new URL(`/${file}`, context.request.url), { headers: { Accept: 'text/html' } }));
  if (asset.status !== 200 || !/text\/html/i.test(asset.headers.get('content-type') || '')) return unavailable();
  const bytes = await asset.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
  if (hash !== expected) return unavailable();
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'x-salero-render': 'snapshot-asset' } });
}
const unavailable = () => new Response('Publicación no verificable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
const missing = () => new Response('Contenido no publicado.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
