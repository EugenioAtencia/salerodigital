import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { onRequest } = await import('../functions/casos-de-exito/[slug].js');

const realCases = {
  'muebles-sarria': makeCase(166, 'muebles-sarria', 'Muebles Sarria', 'Muebles Sarria | Caso de Ã©xito en marketing para retail local'),
  enoro: makeCase(157, 'enoro', 'Enoro', 'Enoro | Caso de Ã©xito en contenido para marca de AOVE'),
  'fundacion-once': makeCase(147, 'fundacion-once', 'FundaciÃ³n ONCE', 'FundaciÃ³n ONCE | Caso de Ã©xito en campaÃ±as digitales'),
  140: makeCase(140, '140', 'Gestamp Digital Summit', 'Caso de Ã©xito Gestamp Digital Summit')
};

const allCases = Object.values(realCases);
const allowedSchemaSlugs = ['muebles-sarria', 'enoro', 'fundacion-once', '140'];
const removedSlugs = ['comercial-vazquez', 'museo-de-la-cal-de-moron'];
const redirectsFile = readFileSync(new URL('../_redirects', import.meta.url), 'utf8');

assert.doesNotMatch(
  redirectsFile,
  /^\/casos-de-exito\/\* /m,
  'case study dynamic routes are not rewritten away from Pages Functions'
);
assert.match(redirectsFile, /^\/el-menu\/\* /m, 'menu rewrite remains untouched');

function makeCase(id, slug, title, seoTitle) {
  return {
    id,
    type: 'caso_exito',
    slug,
    status: 'publish',
    link: `https://cms.webagencia360.com/casos-de-exito/${slug}/`,
    date: '2026-05-24T12:00:00',
    modified: '2026-06-01T19:00:00',
    title: { rendered: title },
    excerpt: { rendered: '' },
    salero_acf: {
      cliente_nombre: title,
      visual_label: 'Caso real',
      sector: 'Sector de prueba',
      servicio_principal: 'Estrategia digital',
      dato_destacado: `Prueba destacada de ${title}`,
      descripcion_corta: `Descripcion corta especifica de ${title}`,
      reto: `<p>Reto completo de ${title}</p>`,
      solucion: `<p>Solucion completa de ${title}</p>`,
      resultado: `<p>Resultado completo de ${title}</p>`,
      aprendizaje: `<p>Aprendizaje completo de ${title}</p>`,
      servicios_trabajados: ['web', 'seo'],
      herramientas: 'WordPress\nCloudflare',
      metricas: [{ metrica: 'Impacto', valor: '100%', descripcion: 'Metrica de prueba' }],
      cta_texto: 'Quiero una estrategia parecida',
      cta_url: 'https://agenciaconsalero.es/hablamos/',
      cta_secundario: 'CTA secundaria de prueba',
      seo_title: seoTitle,
      seo_description: `Meta description especifica de ${title}`,
      imagen_principal: { url: `https://cms.webagencia360.com/wp-content/uploads/${slug}.jpg` },
      video_principal: false,
      video_poster: false,
      galeria_caso: []
    }
  };
}

function contextFor(slug) {
  return {
    params: { slug },
    request: new Request(`https://agenciaconsalero.es/casos-de-exito/${slug}/`)
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' }
  });
}

function htmlResponse(body = '<!doctype html><html><body>Error</body></html>', status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function installCmsFetch(mode = 'ok') {
  globalThis.fetch = async (input, options = {}) => {
    if (mode === 'timeout') {
      return new Promise((resolve, reject) => {
        const signal = options.signal;
        if (signal?.aborted) reject(new Error('timeout'));
        signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      });
    }

    if (mode === 'html') return htmlResponse();
    if (mode === '500') return jsonResponse({ code: 'server_error' }, 500);

    const url = new URL(String(input));
    const isRestRoute = url.searchParams.get('rest_route') === '/wp/v2/casos-exito';
    const isCasesEndpoint = url.pathname.endsWith('/wp-json/wp/v2/casos-exito') || isRestRoute;
    if (!isCasesEndpoint) return jsonResponsYJßJNÂ‚ˆÛÛœİÛYÈH\›œÙX\˜Ú\˜[\Ë™Ù]
	ÜÛYÉÊNÂˆYˆ
ÛYÊH™]\›ˆœÛÛ”™\ÜÛœÙJ™X[Ø\Ù\ÖÜÛY×HÈÜ™X[Ø\Ù\ÖÜÛY×WHˆ×JNÂˆ™]\›ˆœÛÛ”™\ÜÛœÙJ[Ø\Ù\ÊNÂˆNÂŸB‚™[˜İ[Ûˆ^™]ÙY[Š[™JHÂˆÛÛœİX]ÚH[›X]Ú
™JNÂˆ™]\›ˆX]ÚÈX]ÚÌWKœ™\XÙJ×ÊËÙË	È	ÊKš[J
Hˆ	ÉÎÂŸB‚˜\Ş[˜È[˜İ[Ûˆ™XY™\ÜÛœÙJ™\ÜÛœÙJHÂˆÛÛœİ[H]ØZ]™\ÜÛœÙK^

NÂˆ™]\›ˆÂˆİ]\Îˆ™\ÜÛœÙKœİ]\Ëˆ[ˆ]Nˆ^™]ÙY[Š[Ï]V×—JŠ×××JÊOİ]O‹ÚJKˆØ[›ÛšXØ[ˆ^™]ÙY[Š[Ï[šÖ×—JÜ™[VÈ‰×XØ[›ÛšXØ[È‰×V×—JÚ™YVÈ‰×J×ˆ‰×JÊVÈ‰×KÚJKˆNˆ^™]ÙY[Š[ÏV×—JŠ×××JÊOÚO‹ÚJKˆ\ØÜš\[Ûˆ^™]ÙY[Š[ÏY]V×—JÛ˜[YOVÈ‰×Y\ØÜš\[Û–È‰×V×—JØÛÛ[VÈ‰×J×ˆ‰×JÊVÈ‰×KÚJKˆ›Ú[™^ˆÏY]V×—JÛ˜[YOVÈ‰×\›Ø›İÖÈ‰×V×—JØÛÛ[VÈ‰×[›Ú[™^Ê™›ÛİÖÈ‰×KÚK\İ
[
BˆNÂŸB‚˜\Ş[˜È[˜İ[Ûˆ\ÜÙ\^\İ[™ÊÛYË^XİY]K^XİYØ[›ÛšXØ[ÛYÈHÛYÊHÂˆ[œİ[Û\Ñ™]Ú
	ÛÚÉÊNÂˆÛÛœİ™\İ[H]ØZ]™XY™\ÜÛœÙJ]ØZ]Û”™\]Y\İ
ÛÛ^›ÜŠÛYÊJJNÂˆ\ÜÙ\™\]X[
™\İ[œİ]\ËŒ	ÜÛYßH™]\›œÈŒ
NÂˆ\ÜÙ\™\]X[
™\İ[››Ú[™^˜[ÙK	ÜÛYßH\È[™^X›X
NÂˆ\ÜÙ\™\]X[
™\İ[šK^XİY]K	ÜÛYßHX
NÂˆ\ÜÙ\™\]X[
™\İ[˜Ø[›ÛšXØ[Î‹ËØYÙ[˜ÚXXÛÛœØ[\›Ë™\ËØØ\ÛÜËYKY^]ËÉÙ^XİYØ[›ÛšXØ[ÛYßKØ	ÜÛYßHØ[›ÛšXØ[
NÂˆ\ÜÙ\›X]Ú
™\İ[]K™]È™YÑ^
^XİY]Kœ™\XÙJÖËŠŠÏ×‰ßJ
_×WKÙË	×		‰ÊJK	ÜÛYßH]X
NÂˆ\ÜÙ\›X]Ú
™\İ[™\ØÜš\[Û‹ÓY]H\ØÜš\[Ûˆ\ÜXÚYšXØKË	ÜÛYßHY]H\ØÜš\[Û˜
NÂˆ\ÜÙ\›X]Ú
™\İ[š[™]È™YÑ^
™]ÈÛÛ\]ÈH	Ù^XİY]Kœ™\XÙJÖËŠŠÏ×‰ßJ
_×WKÙË	×		‰Ê_X
K	ÜÛYßHPÑˆÛÛ[
NÂŸB‚˜]ØZ]\ÜÙ\^\İ[™Ê	Û]YX›\Ë\Ø\œšXIË	Ó]YX›\ÈØ\œšXIÊNÂ˜]ØZ]\ÜÙ\^\İ[™Ê	Ù[›Ü›ÉË	Ñ[›Ü›ÉÊNÂ˜]ØZ]\ÜÙ\^\İ[™Ê	Ù[™XÚ[Û‹[Û˜ÙIË	Ñ[™XÚpìÛˆÓÑIÊNÂ˜]ØZ]\ÜÙ\^\İ[™Ê	ÌM	Ë	ÑÙ\İ[\YÚ][İ[[Z]	ÊNÂ˜]ØZ]\ÜÙ\^\İ[™Ê	ÙÙ\İ[\YYÚ][\İ[[Z]	Ë	ÑÙ\İ[\YÚ][İ[[Z]	Ë	ÌM	ÊNÂ‚™›Üˆ
ÛÛœİÛYÈÙˆË‹‹œ™[[İ™YÛYÜË	ÜÛYËX[X]Üš[É×JHÂˆ[œİ[Û\Ñ™]Ú
	ÛÚÉÊNÂˆÛÛœİ™\İ[H]ØZ]™XY™\ÜÛœÙJ]ØZ]Û”™\]Y\İ
ÛÛ^›ÜŠÛYÊJJNÂˆ\ÜÙ\™\]X[
™\İ[œİ]\Ë	ÜÛYßH™]\›œÈ
NÂˆ\ÜÙ\™\]X[
™\İ[››Ú[™^YK	ÜÛYßH\È›Ú[™^
NÂˆ\ÜÙ\™Ù\Ó›İX]Ú
™\İ[š[ØØ\ÙK\İYKÚK	ÜÛYßH\È›ÈØ\ÙHØÚ[XX
NÂŸB‚™›Üˆ
ÛÛœİ[ÙHÙˆÉÍL	Ë	Ú[	Ë	İ[Y[İ]	×JHÂˆ[œİ[Û\Ñ™]Ú
[ÙJNÂˆÛÛœİ™\İ[H]ØZ]™XY™\ÜÛœÙJ]ØZ]Û”™\]Y\İ
ÛÛ^›ÜŠ	Ù[›Ü›ÉÊJJNÂˆ\ÜÙ\™\]X[
™\İ[œİ]\ËŒ	Û[Ù_H\Ù\È[\Ü˜\HÚ[
NÂˆ\ÜÙ\™\]X[
™\İ[››Ú[™^YK	Û[Ù_HÚ[\È›Ú[™^
NÂˆ\ÜÙ\›X]Ú
™\İ[š[ĞØ\™Ø[™ÈØ\ÛËË	Û[Ù_HÙY\ÈÛY[˜[˜XÚÈÚ[
NÂŸB‚˜ÛÛœİØÚ[XRœÈH™XYš[TŞ[˜Ê™]ÈT“
	Ë‹‹Ù[˜İ[ÛœË×ÜÚ\™YÜØÚ[XKšœÉË[\Ü›Y]K\›
K	İ]	ÊNÂ™›Üˆ
ÛÛœİÛYÈÙˆ[İÙYØÚ[XTÛYÜÊH\ÜÙ\›X]Ú
ØÚ[XRœË™]È™YÑ^
ÉÈ—IÜÛYßVÉÈ—X
KØÚ[XH[˜ÛY\È	ÜÛYßX
NÂ™›Üˆ
ÛÛœİÛYÈÙˆ™[[İ™YÛYÜÊH\ÜÙ\™\]X[
ØÚ[XRœËš[˜ÛY\ÊÛYÊK˜[ÙKØÚ[XH^ÛY\È	ÜÛYßX
NÂ‚˜ÛÛœİ\İYÒœÈH™XYš[TŞ[˜Ê™]ÈT“
	Ë‹‹Ø\ÜÙ]ËÚœËØØ\ÛÜËYKY^]ËšœÉË[\Ü›Y]K\›
K	İ]	ÊNÂ™›Üˆ
ÛÛœİÛYÈÙˆ™[[İ™YÛYÜÊH\ÜÙ\™\]X[
\İYÒœËš[˜ÛY\ÊÛYÊK˜[ÙK\İ[™È^ÛY\È	ÜÛYßX
NÂ˜\ÜÙ\›X]Ú
\İYÒœËÓ›ÈÙHYY\›ÛˆØ\™Ø\ˆÜÈØ\ÛÜÈH0ê^]È\ÙHÛÜ™™\ÜËË	Û\İ[™È\ÈÛÛ›ÛYYÜ˜YYİ]IÊNÂ‚˜ÛÛœÛÛK›ÙÊ	ØØ\ÛÜÈÛ\ÈÛİ\˜ÙK[Ù‹]]Ú[][][ÛœÈ\ÜÙY	ÊNÂ