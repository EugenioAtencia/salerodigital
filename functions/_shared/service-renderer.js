const SITE_ORIGIN = 'https://agenciaconsalero.es';
const WHATSAPP_URL = 'https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital.';

const SERVICES = {
  'cimientos-digitales': {
    kind: 'web',
    label: 'Desarrollo web senior',
    title: 'Cimientos Digitales',
    metaTitle: 'Cimientos Digitales, desarrollo web senior | Salero Digital',
    metaDescription: 'Desarrollo web senior para negocios locales: webs rápidas, seguras, orientadas a conversión y preparadas para SEO desde la base.',
    claim: 'Construimos la sede central de tu negocio en internet: una web rápida, clara, segura y pensada para convertir visitas en oportunidades reales.',
    cardTitle: 'La web como sede central, no como simple escaparate.',
    cardItems: ['Velocidad y estabilidad', 'Contenido claro y comercial', 'Base preparada para SEO y captación'],
    intro: 'Una web no debería ser solo una tarjeta de visita bonita. Para un negocio local, una pyme o una marca con ambición comercial, la web es el lugar donde se decide si el usuario confía, entiende lo que ofreces y da el siguiente paso.',
    problem: 'Muchos negocios tienen webs lentas, desordenadas o creadas solo para “estar”. El problema no es tener una web antigua, sino tener una web que no explica bien la propuesta de valor, no genera confianza y no facilita la conversión.',
    approach: 'Trabajamos la web como un activo de negocio. Primero revisamos objetivos, público, servicios prioritarios y recorrido de conversión. Después definimos estructura, contenidos, diseño, rendimiento y medición.',
    includes: ['Arquitectura de páginas y secciones', 'Diseño responsive orientado a conversión', 'Optimización de velocidad y rendimiento', 'Estructura SEO base', 'Integración de formularios, llamadas y WhatsApp'],
    benefits: ['Mejor primera impresión ante clientes nuevos', 'Más claridad en servicios, productos y propuesta comercial', 'Base técnica sólida para SEO, campañas y analítica', 'Experiencia móvil más rápida y profesional'],
    process: ['Cata digital y revisión de necesidades', 'Definición de estructura y mensajes clave', 'Diseño y desarrollo de la web', 'Optimización técnica y revisión SEO', 'Publicación, medición y mejora continua'],
    sidebarTitle: 'Qué miramos antes de construir la web',
    sidebarItems: ['Objetivos comerciales', 'Servicios prioritarios', 'Arquitectura de contenidos', 'Rendimiento móvil', 'Medición y conversiones'],
    ctaLabel: 'Quiero una web con buenos cimientos',
    finalTitle: 'Tu web debe sostener la estrategia, no solo decorar internet.',
    finalText: 'Revisamos tu punto de partida y planteamos una base digital clara, rápida y preparada para crecer.',
    faqs: [
      ['¿Hacéis webs corporativas y tiendas online?', 'Sí. Podemos trabajar webs corporativas, landings de captación y proyectos ecommerce según la necesidad real del negocio.'],
      ['¿La web queda preparada para SEO?', 'Sí. La estructura, los encabezados, los contenidos principales, el rendimiento y la indexabilidad se trabajan desde el inicio.'],
      ['¿También os encargáis del mantenimiento?', 'Sí. Podemos plantear mantenimiento técnico, soporte y mejoras evolutivas para que la web no se quede abandonada.']
    ]
  },
  'el-pregonero': {
    kind: 'seo',
    label: 'SEO local y posicionamiento',
    title: 'El Pregonero',
    metaTitle: 'El Pregonero, SEO local y posicionamiento | Salero Digital',
    metaDescription: 'SEO local para negocios que quieren aparecer mejor en Google, Google Maps y búsquedas de proximidad con una estrategia clara.',
    claim: 'Hacemos que tu negocio se escuche donde importa: en Google, en Maps y en las búsquedas que pueden acabar en llamada, visita o contacto.',
    cardTitle: 'Para que te encuentren los que ya están buscando.',
    cardItems: ['Google Maps más trabajado', 'Páginas con intención SEO', 'Informes claros y accionables'],
    intro: 'El Pregonero es el servicio de SEO local y posicionamiento de Salero Digital. Está pensado para negocios que ya tienen oficio, producto o servicio, pero no aparecen con suficiente fuerza cuando sus clientes buscan en Google.',
    problem: 'Muchos negocios dependen del boca a boca, de redes sociales o de campañas puntuales, pero descuidan la búsqueda local. Si la ficha de Google está incompleta o la web no responde a búsquedas reales, el cliente encuentra antes a otro proveedor.',
    approach: 'Analizamos cómo te buscan, dónde apareces, qué competidores te rodean y qué señales necesita Google para entender mejor tu negocio. A partir de ahí trabajamos ficha, arquitectura web, contenidos e intención de búsqueda.',
    includes: ['Auditoría SEO inicial', 'Optimización de Google Business Profile', 'Keyword research local y sectorial', 'Mejora de páginas estratégicas', 'Seguimiento de posiciones, clics y oportunidades'],
    benefits: ['Más presencia en búsquedas locales relevantes', 'Mayor confianza antes del contacto', 'Captación orgánica más estable', 'Menos dependencia de campañas pagadas para todo'],
    process: ['Diagnóstico de visibilidad actual', 'Análisis de competencia local', 'Priorización de palabras clave y páginas', 'Optimización técnica y editorial', 'Seguimiento mensual con conclusiones claras'],
    sidebarTitle: 'Qué revisamos antes de pregonar',
    sidebarItems: ['Ficha de Google', 'Palabras clave locales', 'Competidores cercanos', 'Páginas prioritarias', 'Datos de Search Console'],
    ctaLabel: 'Quiero mejorar mi visibilidad local',
    finalTitle: 'Si tu negocio merece encontrarse, hay que ponérselo fácil a Google.',
    finalText: 'Ordenamos tu presencia local para que tus clientes te encuentren, te entiendan y confíen antes de contactar.',
    faqs: [
      ['¿Cuánto tarda en notarse el SEO local?', 'Depende del punto de partida y de la competencia. Es un trabajo de medio plazo, aunque algunas mejoras pueden generar señales antes.'],
      ['¿El SEO sustituye a Google Ads?', 'No necesariamente. El SEO construye visibilidad estable y Google Ads puede acelerar captación. Bien combinados se refuerzan.'],
      ['¿También optimizáis la ficha de Google Maps?', 'Sí. Para negocios locales, Google Business Profile suele ser una pieza crítica.']
    ]
  },
  'gracia-y-presencia': {
    kind: 'social',
    label: 'Social media y contenido',
    title: 'Gracia y Presencia',
    metaTitle: 'Gestión de redes sociales | Salero Digital',
    metaDescription: 'Gestión de redes sociales y contenido para marcas que quieren comunicar mejor, generar confianza y activar comunidad con estrategia.',
    claim: 'No publicamos por publicar. Creamos contenido con tono, intención y presencia para que tu marca se entienda, se recuerde y genere confianza.',
    cardTitle: 'Contenido con duende, pero también con dirección estratégica.',
    cardItems: ['Estrategia de contenidos', 'Calendario editorial', 'Copywriting y creatividad'],
    intro: 'Las redes sociales no son solo un escaparate. Son un canal para generar confianza, enseñar el trabajo real, conectar con la comunidad y mantener viva la marca en la mente del cliente.',
    problem: 'Muchos negocios publican sin estrategia, sin calendario, sin tono definido y sin saber qué objetivo tiene cada contenido. Eso provoca perfiles apagados, poca interacción y una imagen que no representa el verdadero valor de la empresa.',
    approach: 'Definimos pilares de contenido, tono de marca, formatos, frecuencia y objetivos por canal. A partir de ahí planificamos piezas que combinan confianza, explicación, producto, servicio, autoridad y llamada a la acción.',
    includes: ['Estrategia de contenidos por canal', 'Calendario editorial', 'Copies para redes sociales', 'Ideas visuales y guiones para reels', 'Revisión de resultados'],
    benefits: ['Más coherencia en la comunicación', 'Mayor conexión con clientes reales', 'Mejor percepción de marca', 'Contenido con intención comercial sin perder naturalidad'],
    process: ['Diagnóstico de presencia actual', 'Definición de pilares de contenido', 'Planificación mensual', 'Producción de copies e ideas', 'Revisión y mejora continua'],
    sidebarTitle: 'Qué miramos antes de proponerte una receta',
    sidebarItems: ['Tono actual de la marca', 'Tipo de contenido que mejor encaja', 'Frecuencia sostenible', 'Interacción de la comunidad', 'Oportunidades de venta y confianza'],
    ctaLabel: 'Quiero redes sociales con más presencia',
    finalTitle: 'Tu marca puede tener presencia sin perder su forma de ser.',
    finalText: 'Ordenamos tus redes para que cada publicación tenga sentido, intención y una forma de hablar reconocible.',
    faqs: [
      ['¿Gestionáis Instagram y Facebook?', 'Sí. Podemos gestionar Instagram, Facebook y otros canales según el tipo de negocio y dónde esté realmente su público.'],
      ['¿También hacéis vídeos?', 'Podemos plantear estrategia de vídeo, guiones, ideas de reels y planificación de contenidos audiovisuales.'],
      ['¿Puedo aprobar los contenidos antes de publicar?', 'Sí. Podemos trabajar con revisión previa para que el cliente tenga control sobre el tono y los mensajes.']
    ]
  },
  'el-empujon': {
    kind: 'ads',
    label: 'Publicidad y captación',
    title: 'El Empujón',
    metaTitle: 'El Empujón, campañas de publicidad digital | Salero Digital',
    metaDescription: 'Campañas de Google Ads y Meta Ads para negocios locales que necesitan captar llamadas, mensajes y oportunidades comerciales.',
    claim: 'Campañas para negocios que necesitan activar visibilidad, llamadas, mensajes y oportunidades comerciales sin esperar meses.',
    cardTitle: 'Cuando hace falta acelerar, conviene empujar con cabeza.',
    cardItems: ['Google Ads con intención', 'Meta Ads para impacto', 'Medición de conversiones'],
    intro: 'El Empujón es el servicio de publicidad digital de Salero Digital. Está pensado para negocios que necesitan activar demanda, promocionar una campaña o captar oportunidades con más velocidad.',
    problem: 'Muchas campañas se lanzan con prisas, sin medir bien el margen, la zona, el tipo de cliente o el mensaje. El resultado suele ser inversión dispersa y pocas oportunidades reales.',
    approach: 'Planteamos campañas con foco comercial: objetivo claro, segmentación precisa, creatividad alineada con el negocio, medición útil y optimización continua.',
    includes: ['Configuración de campañas en Google Ads y Meta Ads', 'Segmentación por zona, perfil e intención', 'Creatividades y mensajes orientados a conversión', 'Control de presupuesto y seguimiento de resultados'],
    benefits: ['Más llamadas, mensajes y solicitudes cualificadas', 'Mayor control sobre la inversión publicitaria', 'Impacto rápido en campañas locales', 'Datos claros para decidir si escalar o corregir'],
    process: ['Cata comercial y definición del objetivo', 'Configuración técnica y medición', 'Lanzamiento de campañas', 'Optimización semanal según resultados'],
    sidebarTitle: 'Qué revisamos antes de invertir',
    sidebarItems: ['Objetivo real de la campaña', 'Zona de captación prioritaria', 'Oferta y margen', 'Canales adecuados', 'Eventos de medición'],
    ctaLabel: 'Quiero activar una campaña',
    finalTitle: 'Tu negocio no necesita más ruido. Necesita un empujón bien dirigido.',
    finalText: 'Revisamos el punto de partida y definimos qué inversión, mensaje y canal tienen más sentido.',
    faqs: [
      ['¿Con cuánto presupuesto se puede empezar?', 'Depende del objetivo, la zona y la competencia. Antes de invertir conviene definir una hipótesis realista.'],
      ['¿Hacéis Google Ads y Meta Ads?', 'Sí. Elegimos el canal según la intención de búsqueda, el tipo de cliente y el momento de compra.'],
      ['¿Medís llamadas y formularios?', 'Sí. La medición es clave para saber qué campañas generan oportunidades reales.']
    ]
  }
};

export async function handleServiceRequest(context) {
  const slug = sanitizeSlug(context.params.slug || '');
  const service = SERVICES[slug];

  if (!slug || !service) {
    return htmlResponse(renderErrorPage('Servicio no encontrado', 'No existe ningún servicio publicado con esa dirección.'), 404);
  }

  return htmlResponse(renderServicePage(slug, service), 200);
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

function renderServicePage(slug, service) {
  const canonical = `${SITE_ORIGIN}/el-menu/${slug}/`;
  const jsonLd = renderJsonLd(slug, service, canonical);

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(service.metaTitle)}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(service.metaDescription)}">
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
    <section class="service-detail-hero service-kind-${escapeAttr(service.kind)}" aria-labelledby="service-detail-title">
      <div class="service-detail-veil" aria-hidden="true"></div>
      <div class="service-detail-gradient" aria-hidden="true"></div>
      <div class="container service-detail-hero-inner">
        <div class="service-detail-copy">
          <a class="service-detail-back" href="/el-menu/">El Menú</a>
          <span class="service-detail-kicker">${escapeHtml(service.label)}</span>
          <h1 id="service-detail-title">${escapeHtml(service.title)}</h1>
          <p>${escapeHtml(service.claim)}</p>
          <div class="service-detail-actions" aria-label="Acciones principales">
            <a class="btn btn-primary" href="/hablamos/">${escapeHtml(service.ctaLabel)}</a>
            <a class="btn btn-secondary service-btn-glass" href="#contenido-servicio">Ver servicio</a>
          </div>
        </div>
        <aside class="service-detail-hero-card" aria-label="Resumen del servicio">
          <span class="service-card-label">${escapeHtml(service.label)}</span>
          <h2>${escapeHtml(service.cardTitle)}</h2>
          ${renderList(service.cardItems)}
        </aside>
      </div>
    </section>

    <section class="service-content-section" id="contenido-servicio">
      <div class="container service-content-grid">
        <article class="service-main-content">
          <span class="service-section-kicker">Servicio estratégico</span>
          <div class="service-rich-content service-lead-content"><p>${escapeHtml(service.intro)}</p></div>
          <div class="service-editorial-split">
            ${renderEditorialCard('problema', '01', 'El problema que resolvemos', service.problem)}
            ${renderEditorialCard('metodo', '02', 'Cómo lo trabajamos', service.approach)}
          </div>
        </article>
        <aside class="service-sidebar">
          <div class="service-sidebar-card">
            <span class="service-section-kicker">Cata digital</span>
            <h2>${escapeHtml(service.sidebarTitle)}</h2>
            ${renderList(service.sidebarItems)}
            <a class="btn btn-primary" href="/hablamos/">${escapeHtml(service.ctaLabel)}</a>
          </div>
        </aside>
      </div>
      <div class="container service-action-container">
        <section class="service-action-section">
          <div class="service-block-heading"><span class="service-section-kicker">Plan de acción</span><h2>Una receta clara para pasar de presencia digital a oportunidades reales</h2></div>
          <div class="service-action-grid">
            ${renderActionCard('incluye', '01', 'Qué incluye', service.includes)}
            ${renderActionCard('beneficios', '02', 'Beneficios que buscamos', service.benefits)}
            ${renderActionCard('proceso', '03', 'Proceso de trabajo', service.process)}
          </div>
        </section>
        ${renderFaqBlock(service.faqs)}
      </div>
    </section>

    <section class="service-final-cta" aria-labelledby="service-final-title">
      <div class="container service-final-card">
        <span class="service-section-kicker">Con salero y con método</span>
        <h2 id="service-final-title">${escapeHtml(service.finalTitle)}</h2>
        <p>${escapeHtml(service.finalText)}</p>
        <div class="service-detail-actions">
          <a class="btn btn-primary" href="/hablamos/">${escapeHtml(service.ctaLabel)}</a>
          <a class="btn btn-secondary" href="${escapeAttr(WHATSAPP_URL)}" target="_blank" rel="noopener">Hablar por WhatsApp</a>
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
        <div><h3>Sectores</h3><nav class="footer-nav"><a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a><a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a><a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a></nav></div>
        <div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="${escapeAttr(WHATSAPP_URL)}" target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
}

function renderEditorialCard(key, number, title, value) {
  return `<article class="service-editorial-card service-editorial-${escapeAttr(key)}"><span>${escapeHtml(number)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(value)}</p></article>`;
}

function renderActionCard(key, number, title, items) {
  return `<article class="service-action-card service-action-${escapeAttr(key)}"><span>${escapeHtml(number)}</span><h2>${escapeHtml(title)}</h2>${renderList(items)}</article>`;
}

function renderFaqBlock(faqs) {
  return `<section class="service-faq-block"><div class="service-faq-copy"><span class="service-section-kicker">Preguntas frecuentes</span><h2>Dudas normales antes de dar el paso</h2><p>Antes de proponerte una solución, aclaramos qué puedes esperar, cómo se trabaja y qué sentido tiene este servicio para tu negocio.</p></div><div class="service-faq-accordion">${faqs.map((faq, index) => `<details ${index === 0 ? 'open' : ''}><summary><span>${escapeHtml(faq[0])}</span></summary><div class="service-faq-answer"><p>${escapeHtml(faq[1])}</p></div></details>`).join('')}</div></section>`;
}

function renderList(items = []) {
  return items && items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

function renderJsonLd(slug, service, canonical) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: service.title,
        description: service.metaDescription,
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: 'Salero Digital', url: SITE_ORIGIN },
        about: { '@type': 'Service', name: service.label, provider: { '@type': 'Organization', name: 'Salero Digital', url: SITE_ORIGIN } }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'El Menú', item: `${SITE_ORIGIN}/el-menu/` },
          { '@type': 'ListItem', position: 3, name: service.title, item: canonical }
        ]
      }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container section"><div class="error"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></main>${renderFooter()}</body></html>`;
}

function sanitizeSlug(value = '') {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '').split('/')[0];
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
