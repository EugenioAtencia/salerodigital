const API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://agenciaconsalero.es';

export async function onRequestGet({ request, params, env }) {
  const slug = String(params.slug || '').replace(/^\/+|\/+$/g, '');

  if (!slug || slug === 'detalle') {
    return env.ASSETS.fetch(request);
  }

  const staticResponse = await env.ASSETS.fetch(
    new Request(new URL(`/sectores/${slug}/index.html`, request.url).toString(), request)
  );

  if (staticResponse.ok) {
    const headers = new Headers(staticResponse.headers);
    headers.set('x-salero-render', 'ssg-cms-asset');
    return new Response(staticResponse.body, { status: staticResponse.status, headers });
  }

  const assetRequest = new Request(new URL('/sectores/detalle/index.html', request.url).toString(), {
    method: 'GET',
    headers: { accept: 'text/html' }
  });

  const templateResponse = await env.ASSETS.fetch(assetRequest);
  if (!templateResponse.ok) return templateResponse;

  let html = await templateResponse.text();

  try {
    const sector = await fetchSector(slug);
    if (!sector) return tagged(html, 'edge-sector-not-found');

    html = renderSector(html, sector, slug);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'public, max-age=300, s-maxage=900',
        'x-salero-render': 'edge-sector-cms'
      }
    });
  } catch (error) {
    console.error('Salero sector edge render error', error);
    return tagged(html, 'edge-sector-error');
  }
}

async function fetchSector(slug) {
  const url = new URL(`${API_BASE}/sectores`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_embed', '1');

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  if (!response.ok) throw new Error(`CMS status ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data[0] : null;
}

function renderSector(html, sector, slug) {
  const f = sector.salero_acf || sector.acf || {};
  const title = plain(first(f.hero_title, f.titular_seo, sector.title && sector.title.rendered, 'Marketing digital por sectores'));
  const intro = plain(first(f.hero_text, f.meta_description, sector.excerpt && sector.excerpt.rendered));
  const metaTitle = plain(first(f.meta_title, title));
  const metaDescription = plain(first(f.meta_description, intro)).slice(0, 160);
  const ctaText = plain(first(f.cta_sectorial_texto, 'Pide tu cata digital'));
  const label = plain(first(f.etiqueta_comercial, labelFor(slug)));

  const main = `<main data-detail data-type="sector" data-prerendered="edge-sector-cms">
    <section class="sector-detail-hero sector-kind-${attr(kindFor(slug, title))}" aria-labelledby="sector-detail-title">
      <div class="sector-detail-veil" aria-hidden="true"></div>
      <div class="sector-detail-gradient" aria-hidden="true"></div>
      <div class="container sector-detail-hero-inner">
        <div class="sector-detail-copy">
          <a class="sector-detail-back" href="/sectores/">Sectores</a>
          <span class="sector-detail-kicker">${esc(label)}</span>
          <h1 id="sector-detail-title">${esc(title)}</h1>
          ${intro ? `<p>${esc(intro)}</p>` : ''}
          <div class="sector-detail-actions"><a class="btn btn-primary" href="/hablamos/">${esc(ctaText)}</a><a class="btn btn-secondary sector-btn-glass" href="#contenido-sector">Ver estrategia</a></div>
        </div>
        <aside class="sector-detail-hero-card"><span class="sector-card-label">${esc(label)}</span><h2>Una estrategia digital adaptada a tu sector.</h2>${list(first(f.hero_card_items, defaultHeroItems(slug)))}</aside>
      </div>
    </section>
    <section class="sector-content-section" id="contenido-sector"><div class="container sector-content-grid"><article class="sector-main-content"><span class="sector-section-kicker">Estrategia sectorial</span>${intro ? `<div class="sector-rich-content sector-lead-content"><p>${esc(intro)}</p></div>` : ''}${textBlock('El reto del sector', f.problema_sector)}${textBlock('La solución de Salero Digital', f.solucion_salero)}${listBlock('Servicios recomendados', f.servicios_recomendados)}${listBlock('Beneficios que buscamos', f.beneficios)}${listBlock('Acciones que podemos activar', f.ejemplos_acciones)}${faqBlock(first(f.faqs_repeater, f.faqs))}</article><aside class="sector-sidebar"><div class="sector-sidebar-card"><span class="sector-section-kicker">Cata digital</span><h2>Qué miramos antes de proponer la receta</h2>${list(['Cómo apareces en Google y Google Maps', 'Qué transmite tu web', 'Cómo comunicas en redes sociales', 'Qué hace tu competencia directa', 'Dónde se pierden oportunidades'])}<a class="btn btn-primary" href="/hablamos/">${esc(ctaText)}</a></div></aside></div></section>
    <section class="sector-final-cta"><div class="container sector-final-card"><span class="sector-section-kicker">Con salero y con método</span><h2>${esc(plain(first(f.cta_final_titulo, 'Tu negocio ya tiene oficio. Ahora toca que se vea como merece.')))}</h2>${f.cta_final_texto_largo ? `<p>${esc(plain(f.cta_final_texto_largo))}</p>` : ''}<div class="sector-detail-actions"><a class="btn btn-primary" href="/hablamos/">${esc(ctaText)}</a></div></div></section>
  </main>`;

  html = html.replace(/<main\b[^>]*data-detail[^>]*data-type=["']sector["'][^>]*>[\s\S]*?<\/main>/i, main);
  html = replaceTitle(html, `${metaTitle} | Salero Digital`);
  html = replaceMeta(html, metaDescription);
  html = replaceCanonical(html, `${SITE_ORIGIN}/sectores/${slug}/`);
  return html;
}

function tagged(html, value) {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=UTF-8', 'x-salero-render': value } });
}

function first(...values) {
  return values.find((v) => v !== undefined && v !== null && !(typeof v === 'string' && !v.trim()) && !(Array.isArray(v) && !v.length)) || '';
}

function plain(value) {
  if (Array.isArray(value)) return value.map(plain).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return plain(first(value.rendered, value.title, value.name, value.label, value.text, value.value, value.respuesta, value.answer));
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function esc(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function attr(value) { return esc(value).replaceAll('`', '&#096;'); }

function toItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => plain(first(item.text, item.label, item.titulo, item.title, item.nombre, item.value, item.item, item.punto, item))).filter(Boolean);
  return plain(value).split(/\r?\n\s*\r?\n|\r?\n|;|\|/).map((item) => item.replace(/^[-•–]\s*/, '').trim()).filter(Boolean);
}

function list(value) {
  const items = toItems(value);
  return items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '';
}

function textBlock(title, value) {
  const text = plain(value);
  return text ? `<section class="content-block"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>` : '';
}

function listBlock(title, value) {
  const html = list(value);
  return html ? `<section class="content-block"><h2>${esc(title)}</h2>${html}</section>` : '';
}

function faqBlock(value) {
  const faqs = parseFaqs(value);
  if (!faqs.length) return '';
  return `<section class="content-block content-block-faqs"><h2>Preguntas frecuentes</h2><div class="faq-list">${faqs.map((faq, index) => `<details ${index === 0 ? 'open' : ''}><summary>${esc(faq.q)}</summary><p>${esc(faq.a)}</p></details>`).join('')}</div></section>`;
}

function parseFaqs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => ({ q: plain(first(item.pregunta, item.question, item.q, item.titulo, item.title)), a: plain(first(item.respuesta, item.answer, item.a, item.texto, item.content)) })).filter((item) => item.q && item.a);
  const blocks = String(value || '').trim().split(/\r?\n\s*\r?\n/).map(plain).filter(Boolean);
  const result = [];
  for (let i = 0; i < blocks.length; i += 2) if (blocks[i] && blocks[i + 1]) result.push({ q: blocks[i], a: blocks[i + 1] });
  return result;
}

function replaceTitle(html, title) {
  return /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`) : html.replace('</head>', `<title>${esc(title)}</title>\n</head>`);
}

function replaceMeta(html, description) {
  if (!description) return html;
  return /<meta\s+name=["']description["']/i.test(html) ? html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*>/i, `<meta name="description" content="${attr(description)}">`) : html.replace('</head>', `<meta name="description" content="${attr(description)}">\n</head>`);
}

function replaceCanonical(html, canonical) {
  return /<link\s+rel=["']canonical["']/i.test(html) ? html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*>/i, `<link rel="canonical" href="${attr(canonical)}">`) : html.replace('</head>', `<link rel="canonical" href="${attr(canonical)}">\n</head>`);
}

function kindFor(slug, title) {
  const text = `${slug} ${title}`.toLowerCase();
  if (text.includes('hosteler') || text.includes('turismo')) return 'hosteleria';
  if (text.includes('comercio') || text.includes('pyme')) return 'comercio';
  if (text.includes('almazara') || text.includes('aceite') || text.includes('oliva')) return 'aceite';
  return 'generico';
}

function labelFor(slug) {
  const kind = kindFor(slug, '');
  if (kind === 'hosteleria') return 'Reservas, imagen y reputación';
  if (kind === 'comercio') return 'Visibilidad local y ventas';
  if (kind === 'aceite') return 'Origen, producto y marca';
  return 'Estrategia sectorial';
}

function defaultHeroItems(slug) {
  const kind = kindFor(slug, '');
  if (kind === 'hosteleria') return ['Google Maps más trabajado', 'Redes con intención comercial', 'Campañas para reservas, llamadas y mensajes'];
  if (kind === 'comercio') return ['Google Maps y búsquedas locales', 'Redes para activar confianza', 'Campañas de cercanía y venta'];
  if (kind === 'aceite') return ['SEO para producto y territorio', 'Contenido de origen y calidad', 'Campañas para venta y captación'];
  return ['Visibilidad local más clara', 'Contenido con intención comercial', 'Medición sencilla y útil'];
}
