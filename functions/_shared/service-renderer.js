const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://salero.webagencia360.com';

export async function handleServiceRequest(context) {
  const slug = sanitizeSlug(context.params.slug || '');

  if (!slug) {
    return htmlResponse(renderErrorPage('Servicio no encontrado', 'No se ha recibido un slug válido para cargar esta landing de servicio.'), 404);
  }

  try {
    const item = await fetchService(slug);

    if (!item) {
      return htmlResponse(renderErrorPage('Contenido no encontrado', `No existe ningún servicio publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    return htmlResponse(renderServicePage(slug, item), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el contenido desde WordPress', String(error && error.message ? error.message : error)), 502);
  }
}

async function fetchService(slug) {
  const url = new URL(`${CMS_API_BASE}/servicios`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_embed', '1');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaleroDigital-Cloudflare-SSR'
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false
    }
  });

  if (!response.ok) {
    throw new Error(`WordPress respondió con estado ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data.length ? data[0] : null;
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate'
    }
  });
}

function renderServicePage(slug, item) {
  const acf = getAcf(item);
  const kind = serviceKind(slug, item);
  const fallback = serviceFallback(kind);

  const name = stripHtml(fieldValue(acf, ['nombre_creativo', 'hero_title', 'titulo_hero', 'titulo_principal'], fallback.name || itemTitle(item) || 'Servicio digital'));
  const technicalName = stripHtml(fieldValue(acf, ['nombre_tecnico', 'subtitulo_tecnico', 'categoria_servicio'], fallback.technicalName || serviceLabel(kind)));
  const claim = fieldValue(acf, ['claim', 'hero_text', 'texto_hero', 'subtitulo_hero', 'subtitulo_comercial'], fallback.claim || excerpt(item));
  const metaTitleBase = stripHtml(fieldValue(acf, ['meta_title', 'seo_title', 'title_seo', 'seo_head_title', 'og_title'], fallback.metaTitle || name));
  const metaTitle = withBrand(metaTitleBase);
  const metaDescription = stripHtml(fieldValue(acf, ['meta_description', 'seo_description', 'description_seo', 'seo_head_description', 'og_description'], fallback.metaDescription || claim || excerpt(item))).slice(0, 165);
  const canonical = `${SITE_ORIGIN}/el-menu/${slug}/`;

  const ctaLabel = fieldValue(acf, ['cta_final_texto', 'cta_label', 'cta_texto', 'boton_texto'], fallback.ctaLabel || 'Pide tu cata digital');
  const ctaUrl = normalizeUrl(fieldValue(acf, ['cta_final_url', 'cta_url', 'boton_url'], '/hablamos/'));
  const videoUrl = fieldUrl(fieldValue(acf, ['hero_video', 'video_hero', 'service_hero_video'], fallback.fallbackVideo || ''));
  const posterUrl = fieldUrl(fieldValue(acf, ['hero_poster', 'poster_hero', 'service_hero_poster', 'imagen_hero', 'hero_image'], fallback.fallbackPoster || featuredImage(item) || ''));
  const cardTitle = fieldValue(acf, ['hero_card_title', 'destacado_titulo', 'card_title'], fallback.cardTitle || 'Una receta digital con método, criterio y foco comercial.');
  const cardItems = fieldList(fieldValue(acf, ['hero_card_items', 'destacado_items', 'puntos_hero', 'card_items'], fallback.cardItems || []));
  const sidebarTitle = fieldValue(acf, ['sidebar_title', 'cata_titulo'], fallback.sidebarTitle || 'Qué revisamos antes de empezar');
  const sidebarItems = fieldList(fieldValue(acf, ['sidebar_items', 'cata_items', 'que_miramos'], fallback.sidebarItems || []));

  const mainDescription = fieldValue(acf, ['descripcion_principal', 'descripcion_servicio', 'texto_principal'], '') || renderedContent(item) || fallback.description;
  const problem = fieldValue(acf, ['problema_que_resuelve', 'problema_servicio', 'reto_servicio'], fallback.problem);
  const approach = fieldValue(acf, ['como_lo_trabajamos', 'enfoque_salero', 'metodo_servicio', 'solucion_salero'], fallback.approach);
  const includes = fieldList(fieldValue(acf, ['que_incluye', 'incluye', 'servicios_incluidos'], fallback.includes));
  const benefits = fieldList(fieldValue(acf, ['beneficios', 'ventajas', 'resultados_buscados'], fallback.benefits));
  const process = fieldList(fieldValue(acf, ['proceso_trabajo', 'proceso', 'fases_trabajo'], fallback.process));
  const faqs = parseFaqs(fieldValue(acf, ['faqs_repeater', 'preguntas_frecuentes', 'faqs_items', 'faqs'], fallback.faqs));
  const finalText = fieldValue(acf, ['cta_final_texto_largo', 'final_text', 'texto_cta_final'], fallback.finalText);
  const jsonLd = renderJsonLd({ slug, name, technicalName, claim, metaDescription, canonical, faqs });

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(metaTitle)}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/service-detail.css?v=1">
  ${jsonLd}
</head>
<body class="service-detail-page">
${renderHeader()}
  <main id="service-detail-root" class="service-detail-root" data-detail data-type="service" data-slug="${escapeAttr(slug)}">
    <section class="service-detail-hero service-kind-${escapeAttr(kind)}" aria-labelledby="service-detail-title">
      ${renderHeroMedia(videoUrl, posterUrl, name)}
      <div class="service-detail-veil" aria-hidden="true"></div>
      <div class="service-detail-gradient" aria-hidden="true"></div>
      <div class="container service-detail-hero-inner">
        <div class="service-detail-copy">
          <a class="service-detail-back" href="/el-menu/">El Menú</a>
          <span class="service-detail-kicker">${escapeHtml(technicalName)}</span>
          <h1 id="service-detail-title">${escapeHtml(name)}</h1>
          ${claim ? `<p>${escapeHtml(stripHtml(claim))}</p>` : ''}
          <div class="service-detail-actions" aria-label="Acciones principales">
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
            <a class="btn btn-secondary service-btn-glass" href="#contenido-servicio">Ver servicio</a>
          </div>
        </div>
        <aside class="service-detail-hero-card" aria-label="Resumen del servicio">
          <span class="service-card-label">${escapeHtml(serviceLabel(kind))}</span>
          <h2>${escapeHtml(stripHtml(cardTitle))}</h2>
          ${cardItems.length ? `<ul>${cardItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </aside>
      </div>
    </section>

    <section class="service-content-section" id="contenido-servicio">
      <div class="container service-content-grid">
        <article class="service-main-content">
          <span class="service-section-kicker">Servicio estratégico</span>
          <div class="service-rich-content service-lead-content">${formatText(mainDescription)}</div>
          <div class="service-editorial-split">
            ${renderEditorialCard('problema', '01', 'El problema que resolvemos', problem)}
            ${renderEditorialCard('metodo', '02', 'Cómo lo trabajamos', approach)}
          </div>
        </article>
        <aside class="service-sidebar">
          <div class="service-sidebar-card">
            <span class="service-section-kicker">Cata digital</span>
            <h2>${escapeHtml(stripHtml(sidebarTitle))}</h2>
            ${sidebarItems.length ? `<ul>${sidebarItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
          </div>
        </aside>
      </div>
      <div class="container service-action-container">
        ${renderActionSection(includes, benefits, process)}
        ${renderFaqBlock(faqs)}
      </div>
    </section>

    <section class="service-final-cta" aria-labelledby="service-final-title">
      <div class="container service-final-card">
        <span class="service-section-kicker">Con salero y con método</span>
        <h2 id="service-final-title">${escapeHtml(fallback.finalTitle)}</h2>
        ${finalText ? `<p>${escapeHtml(stripHtml(finalText))}</p>` : ''}
        <div class="service-detail-actions">
          <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
          <a class="btn btn-secondary" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">Hablar por WhatsApp</a>
        </div>
      </div>
    </section>
  </main>
${renderFooter()}
  <script src="/assets/js/config.js?v=7" defer></script>
  <script src="/assets/js/helpers.js?v=41" defer></script>
</body>
</html>`;
}

function renderHeader() {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a>
      <nav class="nav" aria-label="Menú principal">
        <a href="/el-menu/" class="is-active" aria-current="page">El Menú</a>
        <a href="/nuestros-menus/">Nuestros menús</a>
        <a href="/sectores/">Sectores</a>
        <a href="/la-receta/">La Receta</a>
        <a href="/la-rebotica/">La Rebotica</a>
        <a class="nav-mobile-contact" href="/hablamos/">¿Hablamos?</a>
        <a class="nav-mobile-cta" href="/hablamos/">Pide tu cata digital</a>
      </nav>
      <div class="header-actions">
        <a class="nav-contact" href="/hablamos/">¿Hablamos?</a>
        <a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a>
        <button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú">☰</button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div><h2>Salero Digital</h2><p>Agencia de aquí, para los de aquí. Estrategia, web, SEO, redes y campañas para negocios que quieren dejar de estar sosos en internet.</p></div>
        <div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div>
        <div><h3>Secciones</h3><nav class="footer-nav"><a href="/nuestros-menus/">Nuestros menús</a><a href="/sectores/">Sectores</a><a href="/la-receta/">La Receta</a><a href="/la-rebotica/">La Rebotica</a></nav></div>
        <div><h3>Contacto</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
}

function renderHeroMedia(videoUrl, posterUrl, title) {
  if (videoUrl) {
    return `<video class="service-detail-hero-video" autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''} aria-hidden="true"><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>`;
  }

  if (posterUrl) {
    return `<img class="service-detail-hero-image" src="${escapeAttr(posterUrl)}" alt="${escapeAttr(stripHtml(title))}" loading="eager">`;
  }

  return '';
}

function renderEditorialCard(key, number, title, value) {
  if (!value) return '';
  return `<article class="service-editorial-card service-editorial-${escapeAttr(key)}"><span>${escapeHtml(number)}</span><h2>${escapeHtml(title)}</h2>${formatText(value)}</article>`;
}

function renderActionSection(includes, benefits, process) {
  const cards = [
    renderActionCard('incluye', '01', 'Qué incluye', includes),
    renderActionCard('beneficios', '02', 'Beneficios que buscamos', benefits),
    renderActionCard('proceso', '03', 'Proceso de trabajo', process)
  ].filter(Boolean).join('');

  if (!cards) return '';

  return `<section class="service-action-section"><div class="service-block-heading"><span class="service-section-kicker">Plan de acción</span><h2>Una receta clara para pasar de presencia digital a oportunidades reales</h2></div><div class="service-action-grid">${cards}</div></section>`;
}

function renderActionCard(key, number, title, items) {
  if (!items || !items.length) return '';
  return `<article class="service-action-card service-action-${escapeAttr(key)}"><span>${escapeHtml(number)}</span><h2>${escapeHtml(title)}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`;
}

function renderFaqBlock(faqs) {
  if (!faqs.length) return '';
  return `<section class="service-faq-block"><div class="service-faq-copy"><span class="service-section-kicker">Preguntas frecuentes</span><h2>Dudas normales antes de dar el paso</h2><p>Antes de proponerte una solución, aclaramos qué puedes esperar, cómo se trabaja y qué sentido tiene este servicio para tu negocio.</p></div><div class="service-faq-accordion">${faqs.map((faq, index) => `<details ${index === 0 ? 'open' : ''}><summary><span>${escapeHtml(faq.q)}</span></summary><div class="service-faq-answer">${formatText(faq.a)}</div></details>`).join('')}</div></section>`;
}

function renderJsonLd({ slug, name, technicalName, claim, metaDescription, canonical, faqs }) {
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name,
      description: metaDescription || stripHtml(claim || ''),
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: 'Salero Digital',
        url: SITE_ORIGIN
      },
      about: {
        '@type': 'Service',
        name: technicalName || name,
        provider: {
          '@type': 'Organization',
          name: 'Salero Digital',
          url: SITE_ORIGIN
        }
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'El Menú', item: `${SITE_ORIGIN}/el-menu/` },
        { '@type': 'ListItem', position: 3, name, item: canonical }
      ]
    }
  ];

  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: stripHtml(faq.a)
        }
      }))
    });
  }

  const data = {
    '@context': 'https://schema.org',
    '@graph': graph
  };

  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container section"><div class="error"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></main>${renderFooter()}<script src="/assets/js/config.js?v=7" defer></script><script src="/assets/js/helpers.js?v=41" defer></script></body></html>`;
}

function getAcf(item = {}) {
  return item.salero_acf || item.acf || {};
}

function itemTitle(item = {}) {
  return item.title && item.title.rendered ? stripHtml(item.title.rendered) : '';
}

function renderedContent(item = {}) {
  return item.content && item.content.rendered ? String(item.content.rendered).trim() : '';
}

function excerpt(item = {}) {
  if (item.excerpt && item.excerpt.rendered) return stripHtml(item.excerpt.rendered);
  const acf = getAcf(item);
  return acf.claim || acf.subtitulo_comercial || acf.meta_description || '';
}

function featuredImage(item = {}) {
  if (item.featured_image_url) return item.featured_image_url;
  const media = item._embedded && item._embedded['wp:featuredmedia'];
  return media && media[0] && media[0].source_url ? media[0].source_url : '';
}

function serviceKind(slug = '', item = {}) {
  const text = `${slug} ${item.slug || ''} ${itemTitle(item)}`.toLowerCase();
  if (text.includes('cimientos') || text.includes('web') || text.includes('desarrollo')) return 'web';
  if (text.includes('pregonero') || text.includes('seo') || text.includes('posicionamiento')) return 'seo';
  if (text.includes('gracia') || text.includes('presencia') || text.includes('redes') || text.includes('social')) return 'social';
  if (text.includes('empujon') || text.includes('ads') || text.includes('publicidad') || text.includes('campaña')) return 'ads';
  return 'generico';
}

function serviceLabel(kind = 'generico') {
  if (kind === 'web') return 'Desarrollo web senior';
  if (kind === 'seo') return 'SEO local y posicionamiento';
  if (kind === 'social') return 'Social media y contenido';
  if (kind === 'ads') return 'Publicidad y captación';
  return 'Servicio digital';
}

function serviceFallback(kind = 'generico') {
  const base = {
    ctaLabel: 'Pide tu cata digital',
    sidebarTitle: 'Qué miramos antes de proponerte una receta',
    sidebarItems: ['Estado actual de tu presencia digital', 'Oportunidades reales de captación', 'Canales prioritarios para tu negocio', 'Nivel de competencia directa', 'Primeras acciones con impacto medible'],
    cardTitle: 'Una receta digital con método, criterio y foco comercial.',
    cardItems: ['Diagnóstico inicial claro', 'Ejecución senior', 'Medición en cristiano'],
    finalTitle: 'Tu negocio ya tiene oficio. Ahora toca darle el punto digital que le falta.',
    finalText: 'Cuéntanos dónde estás, qué quieres conseguir y revisamos qué servicio tiene más sentido para empezar. Sin presión, sin humo y con los pies en la tierra.',
    faqs: [
      { pregunta: '¿Por dónde empezamos?', respuesta: 'Empezamos con una cata digital para revisar tu situación actual, detectar prioridades y decidir qué acciones tienen más sentido para tu negocio.' },
      { pregunta: '¿Se puede contratar este servicio por separado?', respuesta: 'Sí. Cada servicio puede trabajarse de forma independiente, aunque recomendamos conectarlo con el resto de la estrategia para que el resultado sea más sólido.' },
      { pregunta: '¿Trabajáis con negocios locales?', respuesta: 'Sí. La propuesta de Salero Digital está pensada especialmente para negocios de cercanía, pymes y empresas que quieren competir mejor en su zona sin perder su identidad.' }
    ]
  };

  if (kind === 'web') {
    return {
      ...base,
      name: 'Cimientos Digitales',
      technicalName: 'Desarrollo web senior',
      metaTitle: 'Cimientos Digitales, desarrollo web senior',
      metaDescription: 'Desarrollo web senior para negocios locales: webs rápidas, seguras, orientadas a conversión y preparadas para SEO desde la base.',
      claim: 'Construimos la sede central de tu negocio en internet: una web rápida, clara, segura y pensada para convertir visitas en oportunidades reales.',
      description: 'Una web no debería ser solo una tarjeta de visita bonita. Para un negocio local, una pyme o una marca con ambición comercial, la web es el lugar donde se decide si el usuario confía, entiende lo que ofreces y da el siguiente paso. Cimientos Digitales está pensado para construir esa base con criterio senior: arquitectura clara, carga rápida, diseño cuidado, estructura SEO, mensajes comerciales y una experiencia móvil que no haga perder clientes por el camino.',
      problem: 'Muchos negocios tienen webs lentas, desordenadas o creadas solo para “estar”. El problema no es tener una web antigua, sino tener una web que no explica bien la propuesta de valor, no genera confianza y no facilita la conversión. Cuando eso ocurre, el tráfico que llega desde Google, redes o campañas se desaprovecha.',
      approach: 'Trabajamos la web como un activo de negocio. Primero revisamos objetivos, público, servicios prioritarios y recorrido de conversión. Después definimos estructura, contenidos, diseño, rendimiento y medición. El resultado debe ser una web estable, entendible, editable cuando haga falta y preparada para acompañar campañas, SEO local y captación.',
      includes: ['Arquitectura de páginas y secciones', 'Diseño responsive orientado a conversión', 'Optimización de velocidad y rendimiento', 'Estructura SEO base', 'Integración de formularios, llamadas y WhatsApp', 'Mantenimiento y soporte técnico si el proyecto lo requiere'],
      benefits: ['Mejor primera impresión ante clientes nuevos', 'Más claridad en servicios, productos y propuesta comercial', 'Menos dependencia de soluciones improvisadas', 'Base técnica sólida para SEO, campañas y analítica', 'Experiencia móvil más rápida y profesional'],
      process: ['Cata digital y revisión de necesidades', 'Definición de estructura y mensajes clave', 'Diseño y desarrollo de la web', 'Optimización técnica y revisión SEO', 'Publicación, medición y mejora continua'],
      cardTitle: 'La web como sede central, no como simple escaparate.',
      cardItems: ['Velocidad y estabilidad', 'Contenido claro y comercial', 'Base preparada para SEO y captación'],
      faqs: [
        { pregunta: '¿Hacéis webs corporativas y tiendas online?', respuesta: 'Sí. Podemos trabajar webs corporativas, landings de captación y proyectos ecommerce según la necesidad real del negocio.' },
        { pregunta: '¿La web queda preparada para SEO?', respuesta: 'Sí. La estructura, los encabezados, los contenidos principales, el rendimiento y la indexabilidad se trabajan desde el inicio para no construir sobre una base débil.' },
        { pregunta: '¿También os encargáis del mantenimiento?', respuesta: 'Sí. Podemos plantear mantenimiento técnico, revisiones, soporte y mejoras evolutivas para que la web no se quede abandonada después de publicarla.' }
      ]
    };
  }

  if (kind === 'seo') {
    return {
      ...base,
      name: 'El Pregonero',
      technicalName: 'SEO local y posicionamiento',
      metaTitle: 'El Pregonero, SEO local y posicionamiento',
      metaDescription: 'SEO local para negocios que quieren aparecer mejor en Google, Google Maps y búsquedas de proximidad con una estrategia clara.',
      claim: 'Hacemos que tu negocio se escuche donde importa: en Google, en Maps y en las búsquedas que pueden acabar en llamada, visita o contacto.',
      description: 'El Pregonero es el servicio de SEO local y posicionamiento de Salero Digital. Está pensado para negocios que ya tienen oficio, producto o servicio, pero no aparecen con suficiente fuerza cuando sus clientes buscan en Google. No se trata de perseguir palabras clave sin criterio, sino de ordenar la visibilidad digital para que el negocio sea más fácil de encontrar, más fácil de entender y más fiable frente a la competencia.',
      problem: 'Muchos negocios dependen del boca a boca, de redes sociales o de campañas puntuales, pero descuidan la búsqueda local. Si la ficha de Google Business Profile está incompleta, la web no está optimizada o las páginas no responden a búsquedas reales, el cliente acaba encontrando antes a otro proveedor.',
      approach: 'Analizamos cómo te buscan, dónde apareces, qué competidores te rodean y qué señales necesita Google para entender mejor tu negocio. A partir de ahí trabajamos ficha de Google, arquitectura web, contenidos, enlaces internos, intención de búsqueda y medición. El objetivo es que la visibilidad tenga sentido comercial, no solo posiciones bonitas en un informe.',
      includes: ['Auditoría SEO inicial', 'Optimización de Google Business Profile', 'Keyword research local y sectorial', 'Mejora de páginas estratégicas', 'Contenido orientado a intención de búsqueda', 'Seguimiento de posiciones, clics y oportunidades'],
      benefits: ['Más presencia en búsquedas locales relevantes', 'Mejor comprensión de tus servicios por parte de Google', 'Mayor confianza antes del contacto', 'Captación orgánica más estable', 'Menos dependencia de campañas pagadas para todo'],
      process: ['Diagnóstico de visibilidad actual', 'Análisis de competencia local', 'Priorización de palabras clave y páginas', 'Optimización técnica y editorial', 'Seguimiento mensual con conclusiones claras'],
      cardTitle: 'Para que te encuentren los que te buscan y también los que aún no te conocen.',
      cardItems: ['Google Maps más trabajado', 'Páginas con intención SEO', 'Informes claros y accionables'],
      faqs: [
        { pregunta: '¿Cuánto tarda en notarse el SEO local?', respuesta: 'Depende del punto de partida y de la competencia. Normalmente se trabaja a medio plazo, aunque algunas mejoras técnicas y de ficha pueden empezar a generar señales antes.' },
        { pregunta: '¿El SEO sustituye a Google Ads?', respuesta: 'No necesariamente. El SEO construye visibilidad estable y Google Ads puede acelerar captación. Bien combinados, ambos canales se refuerzan.' },
        { pregunta: '¿También optimizáis la ficha de Google Maps?', respuesta: 'Sí. Para negocios locales, Google Business Profile suele ser una pieza crítica porque influye en llamadas, rutas, reseñas y confianza.' }
      ]
    };
  }

  if (kind === 'social') {
    return {
      ...base,
      name: 'Gracia y Presencia',
      technicalName: 'Social media y contenido',
      metaTitle: 'Gracia y Presencia, social media y contenido',
      metaDescription: 'Gestión de redes sociales y contenido para marcas que quieren comunicar mejor, generar confianza y activar comunidad con estrategia.',
      claim: 'No publicamos por publicar. Creamos contenido con tono, intención y presencia para que tu marca se entienda, se recuerde y genere confianza.',
      description: 'Gracia y Presencia es el servicio de redes sociales y contenido de Salero Digital. Está pensado para negocios que necesitan mostrar mejor lo que hacen, explicar su valor y mantenerse presentes sin caer en publicaciones genéricas. La clave no es llenar el calendario, sino construir una comunicación coherente con la marca, útil para la audiencia y alineada con los objetivos comerciales.',
      problem: 'Muchas empresas publican cuando pueden, repiten mensajes parecidos o dependen de creatividades sin estrategia. Eso provoca perfiles irregulares, poca diferenciación y una comunidad que mira pero no actúa. La presencia digital necesita ritmo, pero también criterio.',
      approach: 'Definimos pilares de contenido, tono de marca, formatos, frecuencia y objetivos por canal. A partir de ahí planificamos piezas que combinan confianza, explicación, producto, servicio, autoridad, cercanía y llamada a la acción. La creatividad debe tener gracia, pero también una función dentro del embudo.',
      includes: ['Estrategia de contenidos por canal', 'Calendario editorial', 'Copies para Instagram, Facebook, TikTok o LinkedIn', 'Ideas visuales y guiones para Reels', 'Creatividades y formatos adaptados', 'Revisión de resultados y mejora de líneas de contenido'],
      benefits: ['Marca más reconocible y coherente', 'Más confianza antes de la compra o consulta', 'Contenido menos improvisado', 'Mejor aprovechamiento de fotos, vídeos y proyectos reales', 'Comunicación alineada con campañas, web y SEO'],
      process: ['Definición de objetivos y público', 'Creación de pilares editoriales', 'Planificación mensual', 'Producción y publicación de contenidos', 'Lectura de resultados y ajustes'],
      cardTitle: 'Contenido con duende, pero también con dirección estratégica.',
      cardItems: ['Tono de marca reconocible', 'Ideas visuales con intención', 'Calendario alineado con negocio'],
      faqs: [
        { pregunta: '¿Trabajáis solo publicaciones o también Reels?', respuesta: 'Podemos trabajar publicaciones, carruseles, stories, Reels, guiones y planificación visual según el canal y los recursos disponibles.' },
        { pregunta: '¿Necesitáis material del cliente?', respuesta: 'Lo ideal es combinar material real del negocio con creatividad diseñada. El contenido real aporta cercanía y credibilidad.' },
        { pregunta: '¿Las redes sirven para vender?', respuesta: 'Sí, pero no siempre de forma directa e inmediata. Bien trabajadas, ayudan a generar confianza, explicar valor, activar demanda y apoyar campañas comerciales.' }
      ]
    };
  }

  if (kind === 'ads') {
    return {
      ...base,
      name: 'El Empujón',
      technicalName: 'Campañas de Google Ads y Social Ads',
      metaTitle: 'El Empujón, campañas Google Ads y Social Ads',
      metaDescription: 'Campañas de Google Ads y Social Ads para captar llamadas, leads, visitas y oportunidades con inversión controlada y medición clara.',
      claim: 'Para cuando tu negocio necesita visibilidad y oportunidades con más velocidad: campañas bien segmentadas, medibles y conectadas con objetivos reales.',
      description: 'El Empujón es el servicio de campañas de publicidad digital de Salero Digital. Está pensado para negocios que necesitan activar demanda, generar contactos, vender una línea concreta o reforzar una temporada. No se trata de meter dinero en anuncios y esperar, sino de diseñar campañas con segmentación, mensaje, landing, medición y criterio comercial.',
      problem: 'Muchas campañas fallan porque se lanzan sin una propuesta clara, sin segmentación real, sin seguimiento de conversiones o con una landing que no convierte. El resultado es inversión dispersa, clics de poca calidad y dudas sobre si la publicidad funciona o no.',
      approach: 'Partimos del objetivo de negocio: llamadas, formularios, WhatsApp, visitas a tienda, reservas o ventas. Después definimos canal, audiencia, presupuesto, creatividad, palabras clave, landing y eventos de conversión. La campaña debe poder medirse en cristiano: qué se ha invertido, qué ha generado y qué conviene ajustar.',
      includes: ['Configuración de campañas en Google Ads o Meta Ads', 'Segmentación geográfica y por intención', 'Estructura de anuncios y mensajes', 'Creatividades y copies orientados a conversión', 'Configuración de eventos de medición', 'Optimización y reporting periódico'],
      benefits: ['Más velocidad para captar oportunidades', 'Control de inversión y presupuesto', 'Mensajes adaptados al público correcto', 'Medición de llamadas, formularios o contactos', 'Aprendizaje rápido para mejorar campañas futuras'],
      process: ['Definición de objetivo comercial', 'Preparación de cuenta, públicos y medición', 'Creación de campañas y anuncios', 'Lanzamiento controlado', 'Optimización según datos reales'],
      cardTitle: 'Publicidad digital para dar impulso sin perder el control.',
      cardItems: ['Google Ads y Meta Ads', 'Captación de leads y llamadas', 'Medición clara de resultados'],
      faqs: [
        { pregunta: '¿Puedo hacer campañas solo en mi zona?', respuesta: 'Sí. Podemos segmentar campañas por pueblos, comarcas, provincias o radios concretos para no desperdiciar inversión fuera del área útil.' },
        { pregunta: '¿La inversión publicitaria está incluida?', respuesta: 'Normalmente se separa el fee de gestión de la inversión en medios. Así queda claro qué parte corresponde al trabajo estratégico y qué parte va directamente a Google o Meta.' },
        { pregunta: '¿Qué se puede medir en una campaña?', respuesta: 'Podemos medir clics, llamadas, formularios, contactos por WhatsApp, visitas a páginas clave y otros eventos de conversión según la estructura del proyecto.' }
      ]
    };
  }

  return base;
}

function fieldValue(source = {}, keys = [], fallback = '') {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && !value.length) continue;
    return value;
  }
  return fallback;
}

function fieldUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return '';
  if (Array.isArray(value)) return fieldUrl(value[0]);
  if (typeof value === 'object') return value.url || value.source_url || (value.guid && value.guid.rendered) || (value.sizes && (value.sizes.large || value.sizes.full || value.sizes.medium_large)) || '';
  return '';
}

function fieldList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (typeof item === 'string') return splitListText(stripHtml(item).trim());

      if (item && typeof item === 'object') {
        const text = stripHtml(
          item.punto ||
          item.item ||
          item.texto ||
          item.text ||
          item.label ||
          item.titulo ||
          item.title ||
          item.nombre ||
          item.value ||
          item.descripcion ||
          item.description ||
          ''
        ).trim();

        return splitListText(text);
      }

      return [];
    }).filter(Boolean);
  }

  return splitListText(stripHtml(String(value)).trim());
}

function splitListText(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const primary = clean
    .split(/\n+|;|\|/)
    .map(item => item.replace(/^[-•–]\s*/, '').trim())
    .filter(Boolean);

  if (primary.length > 1) return primary;

  const sentenceSplit = clean
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map(item => item.replace(/^[-•–]\s*/, '').trim())
    .filter(Boolean);

  return sentenceSplit.length > 1 ? sentenceSplit : primary;
}

function parseFaqs(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return parseFaqs(item)[0] || null;
      if (!item || typeof item !== 'object') return null;
      const q = item.pregunta || item.faq_pregunta || item.question || item.titulo || item.title || item.nombre || item.label || '';
      const a = item.respuesta || item.faq_respuesta || item.answer || item.texto || item.content || item.descripcion || item.description || '';
      return q ? { q: stripHtml(String(q)).trim(), a: String(a || '').trim() } : null;
    }).filter(Boolean);
  }

  if (typeof value === 'object') {
    const q = value.pregunta || value.faq_pregunta || value.question || value.titulo || value.title || '';
    const a = value.respuesta || value.faq_respuesta || value.answer || value.texto || value.content || '';
    return q ? [{ q: stripHtml(String(q)).trim(), a: String(a || '').trim() }] : [];
  }

  const text = String(value || '').trim();
  if (!text) return [];

  const blocks = text.split(/(?=###\s)/).map(block => block.trim()).filter(Boolean);
  if (blocks.length > 1 || text.startsWith('###')) {
    return blocks.map(block => {
      const lines = block.split(/\n+/).map(line => line.trim()).filter(Boolean);
      const q = (lines.shift() || '').replace(/^###\s*/, '').trim();
      return q ? { q, a: lines.join('\n\n') } : null;
    }).filter(Boolean);
  }

  const rows = text.split(/\n+/).map(row => row.trim()).filter(Boolean).filter(row => row.includes('|'));
  if (rows.length) {
    return rows.map(row => {
      const parts = row.split('|');
      const q = (parts.shift() || '').trim();
      const a = parts.join('|').trim();
      return q ? { q, a } : null;
    }).filter(Boolean);
  }

  return [{ q: 'Pregunta frecuente', a: text }];
}

function normalizeUrl(value = '') {
  if (!value) return '/hablamos/';
  if (typeof value !== 'string') return '/hablamos/';
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return value;
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

function withBrand(title = '') {
  const clean = stripHtml(title || '').trim();
  if (!clean) return 'Salero Digital';
  return clean.toLowerCase().includes('salero digital') ? clean : `${clean} | Salero Digital`;
}

function formatText(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (hasHtml(text)) return text;
  return text.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function hasHtml(value = '') {
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function sanitizeSlug(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9-_]/g, '');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}
