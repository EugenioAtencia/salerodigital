const CMS_URL = 'https://cms.webagencia360.com/wp-json/wp/v2/posts';
const SITE = 'https://agenciaconsalero.es';
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function renderSitemap(context) {
  const fallback = () => context.next();
  try {
    const source = await fallback();
    if (!source.ok) return source;
    const original = await source.text();
    const baseUrls = [...original.matchAll(/<url>\s*<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    if (!baseUrls.length) return source;

    const links = new Map(baseUrls.map(url => [url, '']));
    for (let page = 1; page <= 20; page++) {
      const url = new URL(CMS_URL);
      url.searchParams.set('status', 'publish');
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      url.searchParams.set('_fields', 'slug,modified_gmt,modified');
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('CMS response ' + response.status);
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error('Unexpected CMS response');
      for (const post of posts) {
        if (!/^[a-z0-9-]+$/.test(post.slug || '')) continue;
        const loc = SITE + '/la-rebotica/' + post.slug + '/';
        const date = post.modified_gmt || post.modified;
        const lastmod = /^\d{4}-\d{2}-\d{2}/.test(date || '') ? date.slice(0, 10) : '';
        links.set(loc, lastmod);
      }
      if (posts.length < 100) break;
      if (page === 20) throw new Error('Sitemap pagination limit reached');
    }
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      [...links.entries()].map(([loc, lastmod]) => '  <url><loc>' + esc(loc) + '</loc>' + (lastmod ? '<lastmod>' + esc(lastmod) + '</lastmod>' : '') + '</url>').join('\n') +
      '\n</urlset>';
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
  } catch (error) {
    return fallback();
  }
}
