const SITE = 'https://agenciaconsalero.es';
// Established, indexable static URLs. Editorial detail URLs always use the CMS slug,
// including numeric slugs such as /casos-de-exito/140/ (the canonical Gestamp URL).
const STATIC_PATHS = ['/', '/el-menu/', '/el-menu/cimientos-digitales/', '/el-menu/el-pregonero/',
  '/el-menu/gracia-y-presencia/', '/el-menu/el-empujon/', '/nuestros-menus/', '/sectores/',
  '/sectores/marketing-para-hosteleria-turismo/', '/sectores/marketing-para-comercios-pymes/',
  '/sectores/marketing-para-almazaras-aceite/', '/casos-de-exito/', '/la-receta/', '/la-rebotica/', '/hablamos/'];
export function editorialSitemap(collections, totalBlogPages) {
  const paths = new Set(STATIC_PATHS);
  for (const [endpoint, base] of [['casos-exito', 'casos-de-exito'], ['posts', 'la-rebotica']]) {
    for (const item of collections[endpoint]) paths.add(`/${base}/${item.slug}/`);
  }
  for (let page = 2; page <= totalBlogPages; page++) paths.add(`/la-rebotica/page/${page}/`);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + [...paths].map(path => `  <url><loc>${SITE}${path}</loc></url>`).join('\n') + '\n</urlset>\n';
}
