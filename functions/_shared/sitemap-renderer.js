const CMS_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE = 'https://agenciaconsalero.es';
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function renderSitemap(context) {
  let source;
  const fallback = () => source || context.next();
  try {
    source = await context.next();
    if (!source.ok) return source;
    const original = await source.clone().text();
    const baseUrls = [...original.matchAll(/<url>\s*<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    if (!baseUrls.length) return source;

    // The CMS determines which individual articles/cases are currently public.
    const links = new Map(baseUrls.filter(url => !/^https:\/\/agenciaconsalero\.es\/(?:la-rebotica|casos-de-exito)\/[^/]+\/$/.test(url)).map(url => [url, '']));
    for (const [endpoint, directory] of [['posts', 'la-rebotica'], ['casos-exito', 'casos-de-exito']]) {
      for (let page = 1; page <= 20; page++) {
        const url = new URL(`${CMS_BASE}/${endpoint}`);
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
          const loc = SITE + '/' + directory + '/' + post.slug + '/';
          const date = post.modified_gmt || post.modified;
          const lastmod = /^\d{4}-\d{2}-\d{2}/.test(date || '') ? date.slice(0, 10) : '';
          links.set(loc, lastmod);
        }
        if (posts.length < 100) break;
        if (page === 20) throw new Error('Sitemap pagination limit reached');
      }
    }
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      [...links.entries()].map(([loc, lastmod]) => '  <url><loc>' + esc(loc) + '</loc>' + (lastmod ? '<lastmod>' + esc(lastmod) + '</lastmod>' : '') + '</url>').join('\n') +
      '\n</urlset>';
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
  } catch (error) {
    return fallback();
  }
}
