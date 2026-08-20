#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_API = 'https://cms.webagencia360.com/wp-json/wp/v2/sectores?per_page=100&_embed=1';
const SITE = 'https://agenciaconsalero.es';
const WA = 'https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital.';
const SLUGS = ['marketing-para-hosteleria-turismo','marketing-para-comercios-pymes','marketing-para-almazaras-aceite'];

export const esc = (v='') => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const arr = (v) => Array.isArray(v) ? v : [];
export const acfOf = (post) => (post?.salero_acf && typeof post.salero_acf === 'object') ? post.salero_acf : (post?.acf || {});
export const list = (v) => arr(v).map(x => typeof x === 'string' ? {punto:x} : x).filter(x => x?.punto);
export const faqsHtml = (v) => arr(v).map((x,i) => `<details${i===0?' open':''}><summary>${esc(x.pregunta)}</summary><p>${esc(textFromHtml(x.respuesta||''))}</p></details>`).join('');

function textFromHtml(v='') { return String(v).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
function replaceOne(html, re, value, label) { if (!re.test(html)) throw new Error(`No se encontró bloque: ${label}`); return html.replace(re, value); }
function ensureEditorialAssets(html) {
  if (!html.includes('/assets/css/sector-editorial-layout.css')) {
    html = html.replace('<script id="salero-schema-graph"', '<link rel="stylesheet" href="/assets/css/sector-editorial-layout.css?v=1">\n  <script id="salero-schema-graph"');
  }
  html = html.replace(/<body class="([^"]*)">/, (_, cls) => `<body class="${cls.includes('sector-layout-v2') ? cls : `${cls} sector-layout-v2`.trim()}">`);
  return html;
}
function jsonLd(post, a) {
  const slug = post.slug, url = `${SITE}/sectores/${slug}/`;
  const faq = arr(a.faqs_repeater).map(x=>({"@type":"Question",name:x.pregunta,acceptedAnswer:{"@type":"Answer",text:textFromHtml(x.respuesta)}}));
  const graph = [
    {"@type":["Organization","ProfessionalService"],"@id":`${SITE}/#organization`,name:'Salero Digital',url:SITE,telephone:'+34665688916',areaServed:['Morón de la Frontera','Sierra Sur de Sevilla','Campiña de Sevilla','Andalucía']},
    {"@type":"WebSite","@id":`${SITE}/#website`,name:'Salero Digital',url:SITE,publisher:{"@id":`${SITE}/#organization`},inLanguage:'es-ES'},
    {"@type":"WebPage","@id":`${url}#webpage`,url,name:a.hero_title||post.title?.rendered||'',description:a.meta_description||a.hero_text||'',inLanguage:'es-ES',isPartOf:{"@id":`${SITE}/#website`},mainEntity:{"@id":`${url}#service`}},
    {"@type":"BreadcrumbList","@id":`${url}#breadcrumb`,itemListElement:[{"@type":"ListItem",position:1,name:'Inicio',item:`${SITE}/`},{"@type":"ListItem",position:2,name:'Sectores',item:`${SITE}/sectores/`},{"@type":"ListItem",position:3,name:a.hero_title||post.title?.rendered||'',item:url}]},
    {"@type":"Service","@id":`${url}#service`,name:a.hero_title||'',description:a.meta_description||a.hero_text||'',serviceType:a.hero_title||'',provider:{"@id":`${SITE}/#organization`},url}
  ];
  if (faq.length) graph.push({"@type":"FAQPage","@id":`${url}#faq`,mainEntity:faq});
  return JSON.stringify({"@context":"https://schema.org","@graph":graph});
}
function serviceCards(v) {
  return list(v).map((x,i) => `${x.url ? `<a class="se2-service-card" href="${esc(x.url)}">` : '<article class="se2-service-card">'}<span class="se2-service-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(x.punto)}</h3>${x.url ? '</a>' : '</article>'}`).join('');
}
function benefitCards(v) {
  return list(v).map((x,i) => `<article class="se2-benefit-card"><span>${String(i+1).padStart(2,'0')}</span><p>${esc(x.punto)}</p></article>`).join('');
}
function actionCards(v) {
  return list(v).map((x,i) => `<article class="se2-method-item"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(x.punto)}</h3></article>`).join('');
}
function cataList(v) { return `<ul class="se2-cata-list">${list(v).map(x=>`<li>${esc(x.punto)}</li>`).join('')}</ul>`; }
function imageFigure(url, alt) { return url ? `<figure class="se2-editorial-media"><img src="${esc(url)}" alt="${esc(alt)}" loading="lazy"></figure>` : ''; }
function editorialHtml(a) {
  const ctaText = a.cta_sectorial_texto || 'Pide tu cata digital';
  const ctaUrl = a.cta_sectorial_url || '/hablamos/';
  return `<div class="sector-editorial-v2" id="contenido-sector">
<section class="se2-editorial" aria-labelledby="se2-reto-title"><div class="container se2-editorial-grid"><div class="se2-editorial-copy"><span class="se2-eyebrow">La realidad del sector</span><h2 id="se2-reto-title">${esc(a.problema_sector_titulo||'El reto del sector')}</h2>${a.problema_sector||''}</div>${imageFigure(a.problema_sector_imagen,'Realidad del sector')}</div></section>
<section class="se2-editorial is-reverse" aria-labelledby="se2-solucion-title"><div class="container se2-editorial-grid"><div class="se2-editorial-copy"><span class="se2-eyebrow">La receta</span><h2 id="se2-solucion-title">${esc(a.solucion_salero_titulo||'La solución de Salero Digital')}</h2>${a.solucion_salero||''}</div>${imageFigure(a.solucion_salero_imagen,'Estrategia de Salero Digital')}</div></section>
<section class="se2-services" aria-labelledby="se2-services-title"><div class="container"><div class="se2-section-intro"><span class="se2-eyebrow is-dark">Qué podemos hacer</span><h2 id="se2-services-title">Una estrategia para convertir presencia digital en oportunidades reales</h2><p>No se trata de activar canales porque sí. Cada pieza debe tener una función clara dentro del recorrido del cliente.</p></div><div class="se2-service-grid">${serviceCards(a.servicios_recomendados)}</div></div></section>
<section class="se2-benefits" aria-labelledby="se2-benefits-title"><div class="container"><div class="se2-section-intro"><span class="se2-eyebrow">Qué buscamos conseguir</span><h2 id="se2-benefits-title">Más visibilidad, más confianza y mejores oportunidades</h2><p>La estrategia tiene sentido cuando ayuda al negocio real. Estos son los efectos que buscamos provocar.</p></div><div class="se2-benefit-grid">${benefitCards(a.beneficios)}</div></div></section>
<section class="se2-method" aria-labelledby="se2-method-title"><div class="container se2-method-grid"><div class="se2-method-heading"><span class="se2-eyebrow">Plan de acción</span><h2 id="se2-method-title">Primero detectamos oportunidades. Después activamos lo que toca.</h2></div><div class="se2-method-list">${actionCards(a.ejemplos_acciones)}</div></div></section>
<section class="se2-cata" aria-labelledby="se2-cata-title"><div class="container"><div class="se2-cata-card"><div class="se2-cata-copy"><span class="se2-eyebrow is-dark">Cata digital</span><h2 id="se2-cata-title">${esc(a.sidebar_title||'Antes de proponerte nada, revisamos dónde están las oportunidades')}</h2><p>Revisamos el negocio real antes de recomendar acciones. Así priorizamos lo que puede tener más impacto y evitamos invertir por inercia.</p><div class="se2-cata-actions"><a class="btn btn-primary" href="${esc(ctaUrl)}">${esc(ctaText)}</a><a class="btn btn-secondary" href="${WA}" target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div>${cataList(a.sidebar_items)}</div></div></section>
<section class="se2-faq" aria-labelledby="se2-faq-title"><div class="container se2-faq-grid"><div class="se2-faq-copy"><span class="se2-eyebrow">Preguntas frecuentes</span><h2 id="se2-faq-title">Dudas normales antes de empezar</h2><p>Respuestas claras para entender qué papel puede tener el marketing digital en este sector.</p></div><div class="se2-faq-list">${faqsHtml(a.faqs_repeater)}</div></div></section>
</div>`;
}

export function renderIntoTemplate(html, post) {
  const a = acfOf(post); const slug = post.slug; const canonical = `${SITE}/sectores/${slug}/`;
  const title = `${a.meta_title || post.title?.rendered || a.hero_title} | Salero Digital`;
  html = ensureEditorialAssets(html);
  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, 'title');
  html = replaceOne(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(a.meta_description||a.hero_text||'')}">`, 'meta description');
  html = replaceOne(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`, 'canonical');
  html = replaceOne(html, /<script id="salero-schema-graph" type="application\/ld\+json">[\s\S]*?<\/script>/, `<script id="salero-schema-graph" type="application/ld+json">${jsonLd(post,a)}</script>`, 'schema');
  if (a.hero_video) html = replaceOne(html, /<video class="sector-detail-hero-video"[\s\S]*?<\/video>/, `<video class="sector-detail-hero-video" data-sector-video autoplay muted loop playsinline preload="metadata" poster="${esc(a.hero_poster||'')}" aria-hidden="true"><source src="${esc(a.hero_video)}" type="video/mp4"></video>`, 'hero video');
  html = replaceOne(html, /<span class="sector-detail-kicker">[\s\S]*?<\/span>/, `<span class="sector-detail-kicker">${esc(a.etiqueta_comercial||'')}</span>`, 'hero kicker');
  html = replaceOne(html, /<h1 id="sector-detail-title">[\s\S]*?<\/h1>/, `<h1 id="sector-detail-title">${esc(a.hero_title||post.title?.rendered||'')}</h1>`, 'h1');
  html = replaceOne(html, /(<h1 id="sector-detail-title">[\s\S]*?<\/h1>\s*)<p>[\s\S]*?<\/p>/, `$1<p>${esc(a.hero_text||'')}</p>`, 'hero text');
  html = replaceOne(html, /<aside class="sector-detail-hero-card"[\s\S]*?<\/aside>/, `<aside class="sector-detail-hero-card" aria-label="Resumen del sector"><span class="sector-card-label">${esc(a.etiqueta_comercial||'')}</span><h2>${esc(a.hero_card_title||'')}</h2><ul>${list(a.hero_card_items).map(x=>`<li>${esc(x.punto)}</li>`).join('')}</ul></aside>`, 'hero card');

  const editorial = editorialHtml(a);
  if (/<div class="sector-editorial-v2"[\s\S]*?<section class="sector-final-cta"/.test(html)) {
    html = html.replace(/<div class="sector-editorial-v2"[\s\S]*?(?=<section class="sector-final-cta")/, editorial+'\n');
  } else {
    html = replaceOne(html, /<section class="sector-content-section"[\s\S]*?(?=<section class="sector-final-cta")/, editorial+'\n', 'contenido editorial');
  }

  const ctaText = a.cta_sectorial_texto || 'Pide tu cata digital'; const ctaUrl = a.cta_sectorial_url || '/hablamos/';
  const finalText = textFromHtml(a.cta_final_texto_largo||'');
  const final = `<section class="sector-final-cta" aria-labelledby="sector-final-title"><div class="container sector-final-card"><span class="sector-section-kicker">Con salero y con método</span><h2 id="sector-final-title">${esc(a.cta_final_titulo||ctaText)}</h2><p>${esc(finalText)}</p><div class="sector-detail-actions"><a class="btn btn-primary" href="${esc(ctaUrl)}">${esc(ctaText)}</a><a class="btn btn-secondary" href="${WA}" target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div></section>`;
  html = replaceOne(html, /<section class="sector-final-cta"[\s\S]*?<\/section>\s*<\/article>/, `${final}</article>`, 'cta final');
  return html;
}

async function fetchJson(url, timeoutMs=15000) {
  const ctl = new AbortController(); const timer = setTimeout(()=>ctl.abort(), timeoutMs);
  try { const r = await fetch(url,{headers:{accept:'application/json'},signal:ctl.signal}); if (!r.ok) throw new Error(`HTTP ${r.status}`); const ct=r.headers.get('content-type')||''; if(!ct.includes('json')) throw new Error(`Content-Type inesperado: ${ct}`); return await r.json(); } finally { clearTimeout(timer); }
}
function argsOf(argv) { const out={root:process.cwd(),api:DEFAULT_API,write:false,dryRun:false,input:null}; for(let i=2;i<argv.length;i++){ const a=argv[i]; if(a==='--write')out.write=true; else if(a==='--dry-run')out.dryRun=true; else if(a==='--root')out.root=argv[++i]; else if(a==='--api')out.api=argv[++i]; else if(a==='--input')out.input=argv[++i]; } return out; }
async function main() {
  const opt=argsOf(process.argv); const posts = opt.input ? JSON.parse(await readFile(opt.input,'utf8')) : await fetchJson(opt.api);
  if(!Array.isArray(posts)) throw new Error('La API no devolvió un array'); const bySlug=new Map(posts.map(p=>[p.slug,p])); const rows=[];
  for(const slug of SLUGS){ const post=bySlug.get(slug); if(!post) throw new Error(`Falta sector: ${slug}`); const file=path.join(opt.root,'sectores',slug,'index.html'); const before=await readFile(file,'utf8'); const after=renderIntoTemplate(before,post); const changed=before!==after; if(opt.write && changed) await writeFile(file,after); rows.push({slug,changed,bytes:Buffer.byteLength(after)}); }
  console.log(JSON.stringify({mode:opt.write?'write':'dry-run',rows},null,2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e=>{ console.error(e.stack||e.message); process.exit(1); });
