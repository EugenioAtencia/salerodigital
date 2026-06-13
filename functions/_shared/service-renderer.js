const SITE_ORIGIN = 'https://agenciaconsalero.es';
const WHATSAPP_URL = 'https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital.';

const SERVICES = {
  'cimientos-digitales': {
    kind: 'web', label: 'Desarrollo web senior', title: 'Cimientos Digitales',
    metaTitle: 'Cimientos Digitales, desarrollo web senior | Salero Digital',
    metaDescription: 'Desarrollo web senior para negocios locales: webs rápidas, seguras, orientadas a conversión y preparadas para SEO desde la base.',
    claim: 'Construimos la sede central de tu negocio en internet: una web rápida, clara, segura y pensada para convertir visitas en oportunidades reales.',
    heroVideo: 'https://cms.webagencia360.com/wp-content/uploads/2026/05/CIMIENTOS-DIGITALES-PARA-PEQUENOS-COMERCIOS.mp4',
    cardTitle: 'La web como sede central, no como simple escaparate.',
    cardItems: ['Velocidad y estabilidad', 'Contenido claro y comercial', 'Base preparada para SEO y captación'],
    intro: 'Una web no debería ser solo una tarjeta de visita bonita. Para un negocio local, una pyme o una marca con ambición comercial, la web es el lugar donde se decide si el usuario confía, entiende lo que ofreces y da el siguiente paso.',
    problem: 'Muchos negocios tienen webs lentas, desordenadas o creadas solo para estar. El problema no es tener una web antigua, sino tener una web que no explica bien la propuesta de valor, no genera confianza y no facilita la conversión.',
    approach: 'Trabajamos la web como un activo de negocio: objetivos, público, servicios prioritarios, estructura, contenidos, diseño, rendimiento y medición.',
    includes: ['Arquitectura de páginas y secciones', 'Diseño responsive orientado a conversión', 'Optimización de velocidad y rendimiento', 'Estructura SEO base', 'Formularios, llamadas y WhatsApp'],
    benefits: ['Mejor primera impresión', 'Más claridad comercial', 'Base sólida para SEO y campañas', 'Experiencia móvil más profesional'],
    process: ['Cata digital', 'Estructura y mensajes', 'Diseño y desarrollo', 'Optimización técnica', 'Publicación y medición']
  },
  'el-pregonero': {
    kind: 'seo', label: 'SEO local y posicionamiento', title: 'El Pregonero',
    metaTitle: 'El Pregonero, SEO local y posicionamiento | Salero Digital',
    metaDescription: 'SEO local para negocios que quieren aparecer mejor en Google, Google Maps y búsquedas de proximidad con una estrategia clara.',
    claim: 'Hacemos que tu negocio se escuche donde importa: en Google, en Maps y en las búsquedas que pueden acabar en llamada, visita o contacto.',
    heroVideo: 'https://cms.webagencia360.com/wp-content/uploads/2026/05/EL-PREGONERO-DE-LOS-PEQUENOS-COMERCIOS.mp4',
    cardTitle: 'Para que te encuentren los que ya están buscando.',
    cardItems: ['Google Maps más trabajado', 'Páginas con intención SEO', 'Informes claros y accionables'],
    intro: 'El Pregonero es el servicio de SEO local y posicionamiento de Salero Digital. Está pensado para negocios que ya tienen oficio, producto o servicio, pero no aparecen con suficiente fuerza cuando sus clientes buscan en Google.',
    problem: 'Muchos negocios dependen del boca a boca o de campañas puntuales, pero descuidan la búsqueda local. Si la ficha de Google está incompleta o la web no responde a búsquedas reales, el cliente encuentra antes a otro proveedor.',
    approach: 'Analizamos cómo te buscan, dónde apareces, qué competidores te rodean y qué señales necesita Google para entender mejor tu negocio.',
    includes: ['Auditoría SEO inicial', 'Optimización de Google Business Profile', 'Keyword research local', 'Mejora de páginas estratégicas', 'Seguimiento de clics y oportunidades'],
    benefits: ['Más presencia en búsquedas locales', 'Mayor confianza antes del contacto', 'Captación orgánica más estable', 'Menos dependencia de campañas pagadas'],
    process: ['Diagnóstico de visibilidad', 'Análisis de competencia local', 'Priorización SEO', 'Optimización técnica y editorial', 'Seguimiento mensual']
  },
  'gracia-y-presencia': {
    kind: 'social', label: 'Social media y contenido', title: 'Gracia y Presencia',
    metaTitle: 'Gestión de redes sociales | Salero Digital',
    metaDescription: 'Gestión de redes sociales y contenido para marcas que quieren comunicar mejor, generar confianza y activar comunidad con estrategia.',
    claim: 'No publicamos por publicar. Creamos contenido con tono, intención y presencia para que tu marca se entienda, se recuerde y genere confianza.',
    heroVideo: 'https://cms.webagencia360.com/wp-content/uploads/2026/05/gracia-y-presencia-en-redes-sociales.mp4',
    cardTitle: 'Contenido con duende, pero también con dirección estratégica.',
    cardItems: ['Estrategia de contenidos', 'Calendario editorial', 'Copywriting y creatividad'],
    intro: 'Las redes sociales no son solo un escaparate. Son un canal para generar confianza, enseñar el trabajo real, conectar con la comunidad y mantener viva la marca en la mente del cliente.',
    problem: 'Muchos negocios publican sin estrategia, sin calendario, sin tono definido y sin saber qué objetivo tiene cada contenido.',
    approach: 'Definimos pilares de contenido, tono de marca, formatos, frecuencia y objetivos por canal.',
    includes: ['Estrategia de contenidos', 'Calendario editorial', 'Copies para redes', 'Ideas visuales y guiones', 'Revisión de resultados'],
    benefits: ['Más coherencia', 'Mayor conexión con clientes reales', 'Mejor percepción de marca', 'Contenido con intención comercial'],
    process: ['Diagnóstico de presencia', 'Pilares de contenido', 'Planificación mensual', 'Producción', 'Mejora continua']
  },
  'el-empujon': {
    kind: 'ads', label: 'Campañas de Ads', title: 'El Empujón',
    metaTitle: 'El Empujón, campañas de publicidad digital | Salero Digital',
    metaDescription: 'Campañas de Google Ads y Meta Ads para negocios locales que necesitan captar llamadas, mensajes y oportunidades comerciales.',
    claim: 'Campañas para negocios que necesitan activar visibilidad, llamadas, mensajes y oportunidades comerciales sin esperar meses.',
    heroVideo: 'https://cms.webagencia360.com/wp-content/uploads/2026/05/El-empujon-Campanas-de-Ads.mp4',
    cardTitle: 'Cuando hace falta acelerar, conviene empujar con cabeza.',
    cardItems: ['Google Ads con intención', 'Meta Ads para impacto', 'Medición de conversiones'],
    intro: 'El Empujón es el servicio de publicidad digital de Salero Digital. Está pensado para negocios que necesitan activar demanda, promocionar una campaña o captar oportunidades con más velocidad.',
    problem: 'Muchas campañas se lanzan con prisas, sin medir bien el margen, la zona, el tipo de cliente o el mensaje. El resultado suele ser inversión dispersa y pocas oportunidades reales.',
    approach: 'Planteamos campañas con foco comercial: objetivo claro, segmentación precisa, creatividad alineada con el negocio, medición útil y optimización continua.',
    includes: ['Google Ads y Meta Ads', 'Segmentación por zona e intención', 'Creatividades orientadas a conversión', 'Control de presupuesto', 'Seguimiento de resultados'],
    benefits: ['Más llamadas y solicitudes cualificadas', 'Mayor control de la inversión', 'Impacto rápido en campañas locales', 'Datos claros para decidir'],
    process: ['Objetivo comercial', 'Configuración técnica', 'Lanzamiento', 'Optimización semanal', 'Informe de resultados']
  }
};

export async function handleServiceRequest(context) {
  const slug = String(context.params.slug || '').trim().replace(/^\/+|\/+$/g, '').split('/')[0];
  const service = SERVICES[slug];
  if (!service) return htmlResponse(renderErrorPage(), 404);
  return htmlResponse(renderServicePage(slug, service), 200);
}

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0, must-revalidate' } });
}

function renderServicePage(slug, service) {
  const canonical = `${SITE_ORIGIN}/el-menu/${slug}/`;
  return `<!doctype html><html lang="es"><head><title>${esc(service.metaTitle)}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(service.metaDescription)}"><link rel="canonical" href="${esc(canonical)}"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/main.css?v=50"><link rel="stylesheet" href="/assets/css/service-detail.css?v=1">${jsonLd(slug, service, canonical)}</head><body class="service-detail-page">${header()}<main id="service-detail-root" class="service-detail-root" data-detail data-type="service" data-slug="${esc(slug)}"><section class="service-detail-hero service-kind-${esc(service.kind)}" aria-labelledby="service-detail-title">${hero(service)}<div class="service-detail-veil" aria-hidden="true"></div><div class="service-detail-gradient" aria-hidden="true"></div><div class="container service-detail-hero-inner"><div class="service-detail-copy"><a class="service-detail-back" href="/el-menu/">El Menú</a><span class="service-detail-kicker">${esc(service.label)}</span><h1 id="service-detail-title">${esc(service.title)}</h1><p>${esc(service.claim)}</p><div class="service-detail-actions"><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><a class="btn btn-secondary service-btn-glass" href="#contenido-servicio">Ver servicio</a></div></div><aside class="service-detail-hero-card"><span class="service-card-label">${esc(service.label)}</span><h2>${esc(service.cardTitle)}</h2>${list(service.cardItems)}</aside></div></section><section class="service-content-section" id="contenido-servicio"><div class="container service-content-grid"><article class="service-main-content"><span class="service-section-kicker">Servicio estratégico</span><div class="service-rich-content service-lead-content"><p>${esc(service.intro)}</p></div><div class="service-editorial-split">${editorial('problema','01','El problema que resolvemos',service.problem)}${editorial('metodo','02','Cómo lo trabajamos',service.approach)}</div></article><aside class="service-sidebar"><div class="service-sidebar-card"><span class="service-section-kicker">Cata digital</span><h2>Qué revisamos antes de empezar</h2>${list(['Objetivo comercial','Situación actual','Canales prioritarios','Medición y conversiones'])}<a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a></div></aside></div><div class="container service-action-container"><section class="service-action-section"><div class="service-block-heading"><span class="service-section-kicker">Plan de acción</span><h2>Una receta clara para pasar de presencia digital a oportunidades reales</h2></div><div class="service-action-grid">${action('incluye','01','Qué incluye',service.includes)}${action('beneficios','02','Beneficios que buscamos',service.benefits)}${action('proceso','03','Proceso de trabajo',service.process)}</div></section>${faqs()}</div></section><section class="service-final-cta"><div class="container service-final-card"><span class="service-section-kicker">Con salero y con método</span><h2>Tu negocio ya tiene oficio. Ahora toca darle el punto digital que le falta.</h2><p>Revisamos contigo qué necesita tu marca y te proponemos una hoja de ruta clara, sin humo y sin tecnicismos innecesarios.</p><div class="service-detail-actions"><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><a class="btn btn-secondary" href="${esc(WHATSAPP_URL)}" target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div></section></main>${footer()}<script src="/assets/js/config.js?v=7" defer></script><script src="/assets/js/helpers.js?v=41" defer></script></body></html>`;
}

function hero(s) { return `<video class="service-detail-hero-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="${esc(s.heroVideo)}" type="video/mp4"></video>`; }
function editorial(k,n,t,v){return `<article class="service-editorial-card service-editorial-${esc(k)}"><span>${esc(n)}</span><h2>${esc(t)}</h2><p>${esc(v)}</p></article>`;}
function action(k,n,t,items){return `<article class="service-action-card service-action-${esc(k)}"><span>${esc(n)}</span><h2>${esc(t)}</h2>${list(items)}</article>`;}
function list(items=[]){return `<ul>${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;}
function faqs(){return `<section class="service-faq-block"><div class="service-faq-copy"><span class="service-section-kicker">Preguntas frecuentes</span><h2>Dudas normales antes de dar el paso</h2><p>Aclaramos qué puedes esperar, cómo se trabaja y qué sentido tiene este servicio para tu negocio.</p></div><div class="service-faq-accordion"><details open><summary><span>¿Por dónde empezamos?</span></summary><div class="service-faq-answer"><p>Empezamos con una cata digital para revisar tu situación actual y priorizar acciones.</p></div></details><details><summary><span>¿Se puede contratar este servicio por separado?</span></summary><div class="service-faq-answer"><p>Sí. Cada servicio puede trabajarse de forma independiente.</p></div></details></div></section>`;}
function header(){return `<header class="site-header"><div class="container header-inner"><a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a><nav class="nav" aria-label="Menú principal"><a href="/el-menu/" class="is-active" aria-current="page">El Menú</a><a href="/nuestros-menus/">Nuestros menús</a><a href="/sectores/">Sectores</a><a href="/la-receta/">La Receta</a><a href="/la-rebotica/">La Rebotica</a><a class="nav-mobile-contact" href="/hablamos/">¿Hablamos?</a><a class="nav-mobile-cta" href="/hablamos/">Pide tu cata digital</a></nav><div class="header-actions"><a class="nav-contact" href="/hablamos/">¿Hablamos?</a><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a><button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button></div></div></header>`;}
function footer(){return `<footer class="footer"><div class="container"><div class="footer-grid"><div><h2>Salero Digital</h2><p>Agencia de aquí, para los de aquí. Estrategia, web, SEO, redes y campañas para negocios que quieren dejar de estar sosos en internet.</p></div><div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div><div><h3>Sectores</h3><nav class="footer-nav"><a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a><a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a><a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a></nav></div><div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div></div><div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div></div></footer><a class="whatsapp-float" href="${esc(WHATSAPP_URL)}" target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;}
function jsonLd(slug,s,canonical){return `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,name:s.title,description:s.metaDescription,isPartOf:{'@type':'WebSite','@id':`${SITE_ORIGIN}/#website`,name:'Salero Digital',url:SITE_ORIGIN},about:{'@type':'Service',name:s.label,provider:{'@type':'Organization',name:'Salero Digital',url:SITE_ORIGIN}}},{'@type':'BreadcrumbList','@id':`${canonical}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'Inicio',item:`${SITE_ORIGIN}/`},{'@type':'ListItem',position:2,name:'El Menú',item:`${SITE_ORIGIN}/el-menu/`},{'@type':'ListItem',position:3,name:s.title,item:canonical}]}]}).replace(/</g,'\\u003c')}</script>`;}
function renderErrorPage(){return `<!doctype html><html lang="es"><head><title>Servicio no encontrado | Salero Digital</title><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${header()}<main class="container section"><h1>Servicio no encontrado</h1></main>${footer()}</body></html>`;}
function esc(v=''){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
