import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { onRequest } = await import('../functions/casos-de-exito/[slug].js');

const realCases = {
  'muebles-sarria': makeCase(166, 'muebles-sarria', 'Muebles Sarria', 'Muebles Sarria | Caso de éxito en marketing para retail local'),
  enoro: makeCase(157, 'enoro', 'Enoro', 'Enoro | Caso de éxito en contenido para marca de AOVE'),
  'fundacion-once': makeCase(147, 'fundacion-once', 'Fundación ONCE', 'Fundación ONCE | Caso de éxito en campañas digitales'),
  140: makeCase(140, '140', 'Gestamp Digital Summit', 'Caso de éxito Gestamp Digital Summit')
};

const allCases = Object.values(realCases);
const allowedSchemaSlugs = ['muebles-sarria', 'enoro', 'fundacion-once', '140'];
const removedSlugs = ['comercial-vazquez', 'museo-de-la-cal-de-moron'];

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
    if (!isCasesEndpoint) return jsonResponse({});

    const slug = url.searchParams.get('slug');
    if (slug) return jsonResponse(realCases[slug] ? [realCases[slug]] : []);
    return jsonResponse(allCases);
  };
}

function textBetween(html, re) {
  const match = html.match(re);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

async function readResponse(response) {
  const html = await response.text();
  return {
    status: response.status,
    html,
    title: textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    canonical: textBetween(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
    h1: textBetween(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    description: textBetween(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
    noindex: /<meta[^>]+name=["']robots["'][^>]+content=["']noindex,\s*follow["']/i.test(html)
  };
}

async function assertExisting(slug, expectedTitle, expectedCanonicalSlug = slug) {
  installCmsFetch('ok');
  const result = await readResponse(await onRequest(contextFor(slug)));
  assert.equal(result.status, 200, `${slug} returns 200`);
  assert.equal(result.noindex, false, `${slug} is indexable`);
  assert.equal(result.h1, expectedTitle, `${slug} H1`);
  assert.equal(result.canonical, `https://agenciaconsalero.es/casos-de-exito/${expectedCanonicalSlug}/`, `${slug} canonical`);
  assert.match(result.title, new RegExp(expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${slug} title`);
  assert.match(result.description, /Meta description especifica/, `${slug} meta description`);
  assert.match(result.html, new RegExp(`Reto completo de ${expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${slug} ACF content`);
}

await assertExisting('muebles-sarria', 'Muebles Sarria');
await assertExisting('enoro', 'Enoro');
await assertExisting('fundacion-once', 'Fundación ONCE');
await assertExisting('140', 'Gestamp Digital Summit');
await assertExisting('gestamp-digital-summit', 'Gestamp Digital Summit', '140');

for (const slug of [...removedSlugs, 'slug-aleatorio']) {
  installCmsFetch('ok');
  const result = await readResponse(await onRequest(contextFor(slug)));
  assert.equal(result.status, 404, `${slug} returns 404`);
  assert.equal(result.noindex, true, `${slug} is noindex`);
  assert.doesNotMatch(result.html, /case-study/i, `${slug} has no case schema`);
}

for (const mode of ['500', 'html', 'timeout']) {
  installCmsFetch(mode);
  const result = await readResponse(await onRequest(contextFor('enoro')));
  assert.equal(result.status, 200, `${mode} uses temporary shell`);
  assert.equal(result.noindex, true, `${mode} shell is noindex`);
  assert.match(result.html, /Cargando caso/, `${mode} keeps client fallback shell`);
}

const schemaJs = readFileSync(new URL('../functions/_shared/schema.js', import.meta.url), 'utf8');
for (const slug of allowedSchemaSlugs) assert.match(schemaJs, new RegExp(`['"]${slug}['"]`), `schema includes ${slug}`);
for (const slug of removedSlugs) assert.equal(schemaJs.includes(slug), false, `schema excludes ${slug}`);

const listadoJs = readFileSync(new URL('../assets/js/casos-de-exito.js', import.meta.url), 'utf8');
for (const slug of removedSlugs) assert.equal(listadoJs.includes(slug), false, `listing excludes ${slug}`);
assert.match(listadoJs, /No se pudieron cargar los casos de éxito desde WordPress/, 'listing has controlled degraded state');

console.log('casos cms source-of-truth simulations passed');
