const DETAIL_CONFIG = {
  menu: {
    endpoint: SALERO_CONFIG.endpoints.menus,
    typeLabel: 'Nuestros menús',
    ctaTextKey: 'cta_principal_texto',
    ctaUrlKey: 'cta_principal_url',
    sections: [
      ['ideal_para', 'Ideal para', 'text'],
      ['que_incluye', 'Qué incluye', 'list'],
      ['beneficios', 'Beneficios', 'list'],
      ['para_quien', 'Para quién está pensado', 'text'],
      ['faqs', 'Preguntas frecuentes', 'faqs']
    ]
  },
  servicio: {
    endpoint: SALERO_CONFIG.endpoints.servicios,
    typeLabel: 'El Menú',
    ctaTextKey: 'cta_final_texto',
    ctaUrlKey: 'cta_final_url',
    sections: [
      ['problema_que_resuelve', 'El problema que resolvemos', 'text'],
      ['descripcion_principal', 'Cómo lo trabajamos', 'text'],
      ['que_incluye', 'Qué incluye', 'list'],
      ['beneficios', 'Beneficios', 'list'],
      ['proceso_trabajo', 'Proceso de trabajo', 'text'],
      ['faqs', 'Preguntas frecuentes', 'faqs']
    ]
  },
  sector: {
    endpoint: SALERO_CONFIG.endpoints.sectores,
    typeLabel: 'Sectores',
    ctaTextKey: 'cta_sectorial_texto',
    ctaUrlKey: 'cta_sectorial_url',
    sections: [
      ['problema_sector', 'El reto del sector', 'text'],
      ['solucion_salero', 'La solución de Salero Digital', 'text'],
      ['servicios_recomendados', 'Servicios recomendados', 'list'],
      ['beneficios', 'Beneficios', 'list'],
      ['ejemplos_acciones', 'Acciones que podemos activar', 'list'],
      ['faqs', 'Preguntas frecuentes', 'faqs']
    ]
  },
  caso: {
    endpoint: SALERO_CONFIG.endpoints.casos,
    typeLabel: 'Casos de éxito',
    ctaTextKey: 'cta_texto',
    ctaUrlKey: 'cta_url',
    sections: [
      ['cliente', 'Cliente', 'text'],
      ['sector_cliente', 'Sector', 'text'],
      ['reto_inicial', 'Reto inicial', 'text'],
      ['servicios_aplicados', 'Servicios aplicados', 'list'],
      ['estrategia_aplicada', 'Estrategia aplicada', 'text'],
      ['acciones_realizadas', 'Acciones realizadas', 'list'],
      ['resultados', 'Resultados', 'text'],
      ['metricas_destacadas', 'Métricas destacadas', 'list'],
      ['testimonio', 'Testimonio', 'text']
    ]
  }
};

function renderSection(a, key, title, format) {
  const v = a[key];
  if (!v) return '';
  const c = format === 'list' ? formatList(v) : format === 'faqs' ? formatFaqs(v) : formatText(v);
  return c ? `<section class="content-block content-block-${escapeHtml(key)} content-block-${escapeHtml(format)}"><h2>${title}</h2>${c}</section>` : '';
}

function fieldValue(a = {}, keys = [], fallback = '') {
  for (const key of keys) {
    const v = a[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length) return v;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) return v;
    if (typeof v !== 'object' && String(v).trim() !== '') return v;
  }
  return fallback;
}

function fieldUrl(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return '';
  if (Array.isArray(v)) return fieldUrl(v[0]);
  if (typeof v === 'object') return v.url || v.source_url || v.guid?.rendered || v.sizes?.large || v.sizes?.full || v.sizes?.medium_large || '';
  return '';
}

function fieldList(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === 'string') return stripHtml(item).trim();
      if (item && typeof item === 'object') return stripHtml(item.text || item.label || item.titulo || item.title || item.nombre || item.value || item.item || item.punto || '').trim();
      return '';
    }).filter(Boolean);
  }
  const t = stripHtml(String(v)).trim();
  if (!t) return [];
  return t.split(/\n+|;|\|/).map(x => x.replace(/^[-•–]\s*/, '').trim()).filter(Boolean);
}

function currentSlugFromPath() {
  const params = new URLSearchParams(window.location.search || '');
  const paramSlug = params.get('slug');
  if (paramSlug) return paramSlug.trim().replace(/^\/+|\/+$/g, '');
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'sectores' && parts[1] && parts[1] !== 'detalle') return parts[1];
  if (parts[0] === 'el-menu' && parts[1] && parts[1] !== 'detalle') return parts[1];
  if (parts[0] === 'nuestros-menus' && parts[1] && parts[1] !== 'detalle') return parts[1];
  if (parts[0] === 'casos-de-exito' && parts[1] && parts[1] !== 'detalle') return parts[1];
  if (parts[0] === 'sector-detail' && parts[1]) return parts[1];
  return '';
}

function ensureCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function trailingSlashPath(path) {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function serviceKind(item = {}) {
  const t = `${item.slug || ''} ${itemTitle(item)}`.toLowerCase();
  if (t.includes('empujon') || t.includes('empujón') || t.includes('ads') || t.includes('publicidad')) return 'ads';
  if (t.includes('gracia') || t.includes('presencia') || t.includes('redes') || t.includes('social')) return 'social';
  if (t.includes('pregonero') || t.includes('seo') || t.includes('posicionamiento')) return 'seo';
  if (t.includes('cimientos') || t.includes('web') || t.includes('desarrollo')) return 'web';
  return 'generico';
}

function serviceFallback(kind = 'generico') {
  const defaults = {
    eyebrow: 'Servicio digital',
    heroTitle: 'Un servicio pensado para que tu negocio deje de estar soso en internet',
    heroText: 'Ordenamos la presencia digital, activamos lo que de verdad importa y medimos cada avance con claridad.',
    cardTitle: 'Una receta digital con estrategia, oficio y punto de sal.',
    cardItems: ['Diagnóstico claro antes de actuar', 'Ejecución senior sin rodeos', 'Medición entendible para tomar decisiones'],
    problem: 'Muchos negocios invierten tiempo y dinero en acciones digitales sueltas, sin una estrategia que conecte visibilidad, confianza y oportunidades reales.',
    solution: 'Primero entendemos el negocio, después ordenamos prioridades y finalmente activamos una hoja de ruta práctica, medible y adaptada al ritmo comercial de cada empresa.',
    includes: ['Análisis inicial del estado digital', 'Propuesta de acciones priorizadas', 'Ejecución técnica y creativa', 'Seguimiento de resultados'],
    benefits: ['Más claridad para saber qué hacer primero', 'Mejor imagen ante clientes potenciales', 'Más oportunidades desde canales digitales', 'Menos improvisación y más criterio'],
    process: ['Cata digital inicial', 'Definición de prioridades', 'Ejecución de acciones', 'Revisión y mejora continua'],
    sidebarTitle: 'Qué miramos antes de proponer la receta',
    sidebarItems: ['Situación actual del negocio en internet', 'Canales que ya están funcionando', 'Puntos donde se pierden oportunidades', 'Competencia directa y posicionamiento', 'Acciones con mayor impacto comercial'],
    ctaLabel: 'Pide tu cata digital',
    finalTitle: 'Tu negocio ya tiene producto, oficio y valor. Ahora toca que se note también en internet.',
    finalText: 'Revisamos contigo qué necesita tu marca y te proponemos una hoja de ruta clara, sin humo y sin tecnicismos innecesarios.'
  };

  if (kind === 'ads') {
    return {
      ...defaults,
      eyebrow: 'Campañas de Ads',
      heroTitle: 'El Empujón',
      heroText: 'Campañas para negocios que necesitan activar visibilidad, llamadas, mensajes y oportunidades comerciales sin esperar meses.',
      cardTitle: 'Cuando hace falta acelerar, conviene empujar con cabeza.',
      cardItems: ['Google Ads para búsquedas con intención', 'Meta Ads para impacto y demanda', 'Retargeting para recuperar oportunidades'],
      problem: 'Muchas campañas se lanzan con prisas, sin medir bien el margen, la zona, el tipo de cliente o el mensaje. El resultado suele ser inversión dispersa y pocas oportunidades reales.',
      solution: 'Planteamos campañas con foco comercial: objetivo claro, segmentación precisa, creatividad alineada con el negocio, medición útil y optimización continua.',
      includes: ['Configuración de campañas en Google Ads y Meta Ads', 'Segmentación por zona, perfil e intención', 'Creatividades y mensajes orientados a conversión', 'Control de presupuesto y seguimiento de resultados', 'Retargeting para usuarios que ya mostraron interés'],
      benefits: ['Más llamadas, mensajes y solicitudes cualificadas', 'Mayor control sobre la inversión publicitaria', 'Impacto rápido en campañas locales o promocionales', 'Datos claros para decidir si escalar o corregir'],
      process: ['Cata comercial y definición del objetivo', 'Configuración técnica y medición', 'Lanzamiento de campañas', 'Optimización semanal según resultados'],
      sidebarTitle: 'Qué revisamos antes de invertir',
      sidebarItems: ['Objetivo real de la campaña', 'Zona de captación prioritaria', 'Oferta, margen y capacidad de respuesta', 'Canales más adecuados para captar demanda', 'Eventos de medición y conversiones'],
      finalTitle: 'Tu negocio no necesita más ruido. Necesita un empujón bien dirigido.',
      finalText: 'Si quieres activar una campaña con cabeza, revisamos el punto de partida y definimos qué inversión, mensaje y canal tienen más sentido.'
    };
  }

  if (kind === 'social') {
    return {
      ...defaults,
      eyebrow: 'Social Media y contenido',
      heroTitle: 'Gracia y Presencia',
      heroText: 'Contenido, redes sociales y narrativa de marca para negocios que quieren estar presentes sin publicar por publicar.',
      cardTitle: 'No se trata de subir cosas. Se trata de construir presencia.',
      cardItems: ['Estrategia de contenidos', 'Reels, publicaciones y piezas comerciales', 'Tono de marca cercano y reconocible'],
      problem: 'Muchas redes sociales se llenan de publicaciones sin dirección, sin relato y sin una intención comercial clara. Eso desgasta al negocio y no construye marca.',
      solution: 'Convertimos la actividad en redes en un sistema de comunicación: qué decir, cuándo decirlo, cómo mostrarlo y qué acción queremos provocar en la comunidad.',
      includes: ['Planificación de contenidos', 'Copies adaptados a cada canal', 'Ideas visuales para publicaciones y vídeos', 'Calendario editorial', 'Revisión de tono, comunidad y llamadas a la acción'],
      benefits: ['Más coherencia en la comunicación', 'Mayor conexión con clientes reales', 'Mejor percepción de marca', 'Contenido con intención comercial sin perder naturalidad'],
      process: ['Definición de líneas de contenido', 'Calendario mensual', 'Producción de copies e ideas visuales', 'Revisión de resultados y ajustes'],
      sidebarTitle: 'Qué miramos en redes antes de actuar',
      sidebarItems: ['Tono actual de la marca', 'Tipo de contenido que mejor encaja', 'Frecuencia y ritmo sostenible', 'Interacción de la comunidad', 'Oportunidades de venta y confianza'],
      finalTitle: 'Tu marca puede tener presencia sin perder su forma de ser.',
      finalText: 'Ordenamos tus redes para que cada publicación tenga sentido, intención y una forma de hablar reconocible.'
    };
  }

  if (kind === 'seo') {
    return {
      ...defaults,
      eyebrow: 'SEO local y posicionamiento',
      heroTitle: 'El Pregonero',
      heroText: 'SEO, Google Maps y visibilidad local para que te encuentren las personas que ya están buscando lo que vendes.',
      cardTitle: 'Si no apareces cuando te buscan, el negocio se lo lleva otro.',
      cardItems: ['Google Business Profile optimizado', 'SEO local y contenidos útiles', 'Análisis de competencia cercana'],
      problem: 'Hay negocios muy buenos que apenas aparecen en Google, tienen fichas incompletas, contenidos pobres o páginas que no responden a lo que el cliente busca.',
      solution: 'Trabajamos la visibilidad orgánica desde la base: ficha de Google, arquitectura web, contenidos, búsquedas locales, señales de confianza y oportunidades frente a la competencia.',
      includes: ['Auditoría SEO inicial', 'Optimización de Google Business Profile', 'Mejora de contenidos y estructura web', 'Investigación de búsquedas locales', 'Seguimiento de posiciones y oportunidades'],
      benefits: ['Más visibilidad en búsquedas relevantes', 'Mayor confianza antes del primer contacto', 'Tráfico más cualificado', 'Mejor base digital a medio y largo plazo'],
      process: ['Diagnóstico SEO y local', 'Priorización de mejoras', 'Optimización técnica y de contenidos', 'Seguimiento mensual de evolución'],
      sidebarTitle: 'Qué miramos en una cata SEO',
      sidebarItems: ['Cómo apareces en Google', 'Estado de Google Maps', 'Búsquedas relevantes para tu negocio', 'Calidad de contenidos y estructura', 'Qué está haciendo la competencia'],
      finalTitle: 'Que te encuentren como Dios manda también es estrategia.',
      finalText: 'Revisamos tu visibilidad actual y detectamos qué mejoras pueden ayudarte a aparecer mejor, atraer más confianza y captar mejores oportunidades.'
    };
  }

  if (kind === 'web') {
    return {
      ...defaults,
      eyebrow: 'Desarrollo web senior',
      heroTitle: 'Cimientos Digitales',
      heroText: 'Webs rápidas, claras y orientadas a negocio para empresas que necesitan una base digital seria, estable y preparada para crecer.',
      cardTitle: 'La web no es una página bonita. Es la sede digital de tu empresa.',
      cardItems: ['Diseño orientado a conversión', 'Estructura clara para SEO', 'Rendimiento, seguridad y mantenimiento'],
      problem: 'Muchas webs se quedan en una presencia decorativa: cargan lento, no explican bien el negocio, no captan contactos y no están preparadas para posicionar.',
      solution: 'Construimos una base digital sólida, con estructura, contenido, diseño y tecnología pensados para que la web trabaje como un activo comercial.',
      includes: ['Arquitectura de la información', 'Diseño web orientado a conversión', 'Desarrollo técnico y responsive', 'Optimización de carga', 'Base SEO y medición'],
      benefits: ['Mejor primera impresión digital', 'Más claridad para el usuario', 'Más capacidad de captar contactos', 'Una base preparada para SEO, campañas y contenidos'],
      process: ['Cata inicial y objetivos', 'Estructura y propuesta visual', 'Desarrollo y revisión', 'Publicación, medición y mantenimiento'],
      sidebarTitle: 'Qué miramos antes de diseñar',
      sidebarItems: ['Objetivo comercial de la web', 'Servicios o productos prioritarios', 'Recorrido del usuario', 'Contenido necesario para convencer', 'Base técnica, SEO y medición'],
      finalTitle: 'Una buena web no solo se ve bien. Hace que tu negocio se entienda mejor.',
      finalText: 'Si tu web actual no representa el nivel real de tu empresa, revisamos qué cimientos digitales necesita para vender mejor y posicionarse con más criterio.'
    };
  }

  return defaults;
}

function serviceCardLabel(kind = 'generico') {
  if (kind === 'ads') return 'Campañas, captación y conversión';
  if (kind === 'social') return 'Contenido, comunidad y marca';
  if (kind === 'seo') return 'Google, mapas y visibilidad';
  if (kind === 'web') return 'Web, estructura y rendimiento';
  return 'Servicio estratégico';
}

function renderServiceHeroMedia(videoUrl, posterUrl, title) {
  if (videoUrl) return `<video class="service-detail-hero-video" data-service-video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeHtml(posterUrl)}"` : ''} aria-hidden="true"><source src="${escapeHtml(videoUrl)}" type="video/mp4"></video>`;
  if (posterUrl) return `<img class="service-detail-hero-image" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(stripHtml(title))}" loading="eager">`;
  return '';
}

function renderServiceContentHtml(item, a, claim) {
  const wpContent = item.content && item.content.rendered ? String(item.content.rendered).trim() : '';
  if (wpContent) return wpContent;
  if (claim) return formatText(claim);
  return '<p>Contenido pendiente de ampliar desde WordPress.</p>';
}

function renderServiceEditorialCard(value, title, number) {
  if (!value) return '';
  return `<article class="service-editorial-card"><span>${number}</span><h2>${escapeHtml(title)}</h2>${formatText(value)}</article>`;
}

function renderServiceActionCard(value, title, number) {
  const items = fieldList(value);
  if (!items.length) return '';
  return `<article class="service-action-card"><span>${number}</span><h2>${escapeHtml(title)}</h2><ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></article>`;
}

function parseFaqRows(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === 'string') return { q: 'Pregunta frecuente', a: item };
      if (item && typeof item === 'object') {
        return {
          q: stripHtml(item.pregunta || item.question || item.q || item.titulo || item.title || '').trim(),
          a: item.respuesta || item.answer || item.a || item.texto || item.content || ''
        };
      }
      return null;
    }).filter(item => item && item.q && item.a);
  }
  const t = String(v || '').trim();
  if (!t) return [];
  const blocks = t.split(/(?=###\s)/).map(b => b.trim()).filter(Boolean);
  if (blocks.length > 1 || t.startsWith('###')) {
    return blocks.map(b => {
      const lines = b.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const q = (lines.shift() || '').replace(/^###\s*/, '').trim();
      return { q: q || 'Pregunta frecuente', a: lines.join('\n\n') };
    }).filter(item => item.q && item.a);
  }
  return [{ q: 'Pregunta frecuente', a: t }];
}

function renderServiceFaqAccordion(v) {
  const faqs = parseFaqRows(v);
  if (!faqs.length) return '';
  return `<div class="service-faq-accordion">${faqs.map((faq, i) => `<details ${i === 0 ? 'open' : ''}><summary><span>${escapeHtml(faq.q)}</span></summary><div class="service-faq-answer">${formatText(faq.a)}</div></details>`).join('')}</div>`;
}

function initServiceFaqAccordions(scope = document) {
  scope.querySelectorAll('.service-faq-accordion').forEach(acc => {
    const items = [...acc.querySelectorAll('details')];
    items.forEach((item, index) => {
      item.open = index === 0;
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach(other => {
          if (other !== item) other.open = false;
        });
      });
    });
  });
}

function renderServiceFaqBlock(a) {
  const faqValue = fieldValue(a, ['faqs_repeater', 'faqs_servicio', 'faqs'], '');
  const accordion = renderServiceFaqAccordion(faqValue);
  if (!accordion) return '';
  return `<section class="service-faq-block"><div class="service-faq-copy"><span class="service-section-kicker">Preguntas frecuentes</span><h2>Antes de empezar, conviene aclarar el terreno.</h2><p>Resolvemos las dudas principales para que el servicio se entienda con claridad antes de pedir una cata digital.</p></div>${accordion}</section>`;
}

function renderServiceMainBlocks(a, fallback) {
  const problem = fieldValue(a, ['problema_que_resuelve', 'problema_servicio', 'problema'], fallback.problem);
  const solution = fieldValue(a, ['descripcion_principal', 'como_lo_trabajamos', 'solucion_servicio', 'solucion'], fallback.solution);
  const includes = fieldValue(a, ['que_incluye', 'servicios_incluidos', 'incluye'], fallback.includes);
  const benefits = fieldValue(a, ['beneficios', 'beneficios_servicio'], fallback.benefits);
  const process = fieldValue(a, ['proceso_trabajo', 'proceso', 'metodologia'], fallback.process);
  const editorial = [
    renderServiceEditorialCard(problem, 'El problema que resolvemos', '01'),
    renderServiceEditorialCard(solution, 'Cómo lo trabajamos', '02')
  ].join('');
  const actions = [
    renderServiceActionCard(includes, 'Qué incluye', '01'),
    renderServiceActionCard(benefits, 'Beneficios que buscamos', '02'),
    renderServiceActionCard(process, 'Proceso de trabajo', '03')
  ].join('');
  const faqs = renderServiceFaqBlock(a);
  return `${editorial ? `<div class="service-editorial-split">${editorial}</div>` : ''}${actions ? `<section class="service-action-section"><div class="service-block-heading"><span class="service-section-kicker">Plan de servicio</span><h2>De la idea a la ejecución con método</h2></div><div class="service-action-grid">${actions}</div></section>` : ''}${faqs}`;
}

function renderServiceDetailPage(root, item, cfg) {
  const a = getAcf(item);
  const kind = serviceKind(item);
  const fallback = serviceFallback(kind);
  const rawTitle = fieldValue(a, ['hero_title', 'titulo_hero', 'titulo_principal', 'nombre_creativo', 'titular_seo'], fallback.heroTitle || itemTitle(item));
  const title = stripHtml(rawTitle || itemTitle(item) || 'Servicio');
  const claim = fieldValue(a, ['hero_text', 'texto_hero', 'subtitulo_hero', 'claim', 'subtitulo_comercial', 'meta_description'], fallback.heroText || excerpt(item));
  const eyebrow = fieldValue(a, ['etiqueta_comercial', 'servicio_label', 'kicker'], fallback.eyebrow || cfg.typeLabel);
  const ctaLabel = fieldValue(a, [cfg.ctaTextKey, 'cta_label', 'cta_texto', 'boton_texto'], fallback.ctaLabel);
  const ctaUrl = normalizeUrl(fieldValue(a, [cfg.ctaUrlKey, 'cta_url', 'boton_url'], SALERO_CONFIG.contactUrl));
  const videoUrl = fieldUrl(fieldValue(a, ['hero_video', 'video_hero', 'servicio_hero_video', 'video_servicio'], ''));
  const posterUrl = fieldUrl(fieldValue(a, ['hero_poster', 'poster_hero', 'servicio_hero_poster', 'imagen_hero', 'hero_image', 'imagen_servicio'], featuredImage(item) || ''));
  const cardTitle = fieldValue(a, ['hero_card_title', 'destacado_titulo', 'card_title'], fallback.cardTitle);
  const cardItems = fieldList(fieldValue(a, ['hero_card_items', 'destacado_items', 'puntos_hero', 'card_items'], fallback.cardItems));
  const sidebarTitle = fieldValue(a, ['sidebar_title', 'cata_titulo'], fallback.sidebarTitle);
  const sidebarItems = fieldList(fieldValue(a, ['sidebar_items', 'cata_items', 'que_miramos'], fallback.sidebarItems));
  const bodyHtml = renderServiceContentHtml(item, a, claim);
  const serviceBlocks = renderServiceMainBlocks(a, fallback);
  const finalTitle = fieldValue(a, ['cta_final_titulo', 'final_title', 'titulo_cta_final'], fallback.finalTitle);
  const finalText = fieldValue(a, ['cta_final_texto_largo', 'final_text', 'texto_cta_final'], fallback.finalText);

  document.body.classList.add('service-detail-page');
  ensureCanonical(`${window.location.origin}${trailingSlashPath(window.location.pathname)}`);
  root.classList.add('service-detail-root');
  root.innerHTML = `<section class="service-detail-hero service-kind-${escapeHtml(kind)}" aria-labelledby="service-detail-title">${renderServiceHeroMedia(videoUrl, posterUrl, title)}<div class="service-detail-veil" aria-hidden="true"></div><div class="service-detail-gradient" aria-hidden="true"></div><div class="container service-detail-hero-inner"><div class="service-detail-copy"><a class="service-detail-back" href="/el-menu/">El Menú</a><span class="service-detail-kicker">${escapeHtml(stripHtml(eyebrow))}</span><h1 id="service-detail-title">${escapeHtml(title)}</h1>${claim ? `<p>${escapeHtml(stripHtml(claim))}</p>` : ''}<div class="service-detail-actions" aria-label="Acciones principales"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a><a class="btn btn-secondary service-btn-glass" href="#contenido-servicio">Ver qué incluye</a></div></div><aside class="service-detail-hero-card" aria-label="Resumen del servicio"><span class="service-card-label">${escapeHtml(serviceCardLabel(kind))}</span><h2>${escapeHtml(stripHtml(cardTitle))}</h2>${cardItems.length ? `<ul>${cardItems.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}</aside></div></section><section class="service-content-section" id="contenido-servicio"><div class="container service-content-grid"><article class="service-main-content"><span class="service-section-kicker">Servicio digital</span><div class="service-rich-content service-lead-content">${bodyHtml}</div>${serviceBlocks ? `<div class="service-dynamic-blocks">${serviceBlocks}</div>` : ''}</article><aside class="service-sidebar"><div class="service-sidebar-card"><span class="service-section-kicker">Cata digital</span><h2>${escapeHtml(stripHtml(sidebarTitle))}</h2>${sidebarItems.length ? `<ul>${sidebarItems.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}<a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a></div></aside></div></section><section class="service-final-cta" aria-labelledby="service-final-title"><div class="container service-final-card"><span class="service-section-kicker">Con salero y con método</span><h2 id="service-final-title">${escapeHtml(stripHtml(finalTitle))}</h2>${finalText ? `<p>${escapeHtml(stripHtml(finalText))}</p>` : ''}<div class="service-detail-actions"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a><a class="btn btn-secondary" href="${escapeHtml(SALERO_CONFIG.whatsappUrl)}" target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div></section>`;
  initServiceFaqAccordions(root);
  const video = root.querySelector('[data-service-video]');
  if (video) {
    const tryPlay = () => video.play().catch(() => {});
    if (document.readyState === 'complete') tryPlay();
    else window.addEventListener('load', tryPlay, { once: true });
  }
}

function sectorFallback(kind = 'generico') {
  const defaults = { eyebrow: 'Sectores', cardTitle: 'Una estrategia con el punto justo para tu sector.', cardItems: ['Visibilidad local más clara', 'Contenido con intención comercial', 'Medición sencilla y útil'], ctaLabel: 'Pide tu cata digital', finalTitle: 'Tu negocio ya tiene oficio. Ahora toca que se vea como merece.', finalText: 'Revisamos tu presencia digital y te decimos qué acciones pueden ayudarte a ganar visibilidad, confianza y oportunidades reales.' };
  if (kind === 'hosteleria') return { ...defaults, eyebrow: 'Hostelería y turismo', heroTitle: 'Marketing para negocios que se viven en la mesa, en la reserva y en la experiencia', heroText: 'Estrategias digitales para restaurantes, bares, cafeterías, alojamientos rurales y proyectos turísticos que quieren ganar visibilidad, confianza y oportunidades reales sin perder su forma de ser.', cardTitle: 'Tu negocio ya tiene encanto. Ahora toca que se encuentre, se entienda y se elija.', cardItems: ['Google Maps más trabajado', 'Redes con intención comercial', 'Campañas para reservas, llamadas y mensajes'], finalTitle: 'Tu negocio ya tiene el sabor. Nosotros hacemos que se note desde fuera.', finalText: 'Si tienes un restaurante, bar, cafetería, hotel rural, alojamiento o proyecto turístico, podemos ayudarte a ordenar tu presencia digital y convertirla en visibilidad, confianza y oportunidades reales.', fallbackVideo: '/assets/video/hosteleria-hero.mp4', fallbackPoster: '/assets/img/hosteleria-hero-poster.webp' };
  if (kind === 'comercio') return { ...defaults, eyebrow: 'Comercios y pymes', heroTitle: 'Marketing para comercios que necesitan más visibilidad local y más ventas', heroText: 'Estrategias digitales para tiendas, negocios de barrio y pymes que quieren aparecer mejor, comunicar con más claridad y convertir la cercanía en oportunidades reales.', cardTitle: 'Tu comercio ya tiene trato y producto. Ahora toca que te encuentren antes.', cardItems: ['Google Maps y búsquedas locales', 'Redes para activar confianza', 'Campañas de cercanía y venta'] };
  if (kind === 'aceite') return { ...defaults, eyebrow: 'Almazaras y aceite', heroTitle: 'Marketing para marcas con origen, producto y mucho que contar', heroText: 'Estrategias digitales para almazaras, cooperativas y proyectos agroalimentarios que quieren poner en valor su producto, su territorio y su capacidad comercial.', cardTitle: 'El origen ya lo tienes. Ahora toca convertirlo en marca y demanda.', cardItems: ['SEO para producto y territorio', 'Contenido de origen y calidad', 'Campañas para venta y captación'] };
  return defaults;
}

function renderSectorContentHtml(item, a, claim) {
  const wpContent = item.content && item.content.rendered ? String(item.content.rendered).trim() : '';
  if (wpContent) return wpContent;
  if (claim) return formatText(claim);
  return '<p>Contenido pendiente de ampliar desde WordPress.</p>';
}

function renderSectorHeroMedia(videoUrl, posterUrl, title) {
  if (videoUrl) return `<video class="sector-detail-hero-video" data-sector-video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeHtml(posterUrl)}"` : ''} aria-hidden="true"><source src="${escapeHtml(videoUrl)}" type="video/mp4"></video>`;
  if (posterUrl) return `<img class="sector-detail-hero-image" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(stripHtml(title))}" loading="eager">`;
  return '';
}

function renderEditorialCard(a, key, title, number) {
  const v = a[key];
  if (!v) return '';
  return `<article class="sector-editorial-card sector-editorial-${escapeHtml(key)}"><span>${number}</span><h2>${escapeHtml(title)}</h2>${formatText(v)}</article>`;
}

function renderStrategyCard(a, key, title, number) {
  const items = fieldList(a[key]);
  if (!items.length) return '';
  return `<article class="sector-strategy-card sector-strategy-${escapeHtml(key)}"><span>${number}</span><h2>${escapeHtml(title)}</h2><ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></article>`;
}

function parseSectorFaqs(v) {
  const t = String(v || '').trim();
  if (!t) return [];
  const blocks = t.split(/(?=###\s)/).map(b => b.trim()).filter(Boolean);
  if (blocks.length > 1 || t.startsWith('###')) return blocks.map(b => { const lines = b.split(/\n+/).map(l => l.trim()).filter(Boolean); const q = (lines.shift() || '').replace(/^###\s*/, '').trim(); return { q: q || 'Pregunta frecuente', a: lines.join('\n\n') }; });
  return [{ q: 'Pregunta frecuente', a: t }];
}

function renderSectorFaqAccordion(v) {
  const faqs = parseSectorFaqs(v);
  if (!faqs.length) return '';
  return `<div class="sector-faq-accordion">${faqs.map((faq, i) => `<details ${i === 0 ? 'open' : ''}><summary><span>${escapeHtml(faq.q)}</span></summary><div class="sector-faq-answer">${formatText(faq.a)}</div></details>`).join('')}</div>`;
}

function initSectorFaqAccordions(scope = document) {
  scope.querySelectorAll('.sector-faq-accordion').forEach(acc => {
    const items = [...acc.querySelectorAll('details')];
    items.forEach((item, index) => {
      item.open = index === 0;
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach(other => {
          if (other !== item) other.open = false;
        });
      });
    });
  });
}

function renderSectorFaqBlock(a) {
  if (!a.faqs) return '';
  return `<section class="sector-faq-block"><div class="sector-faq-copy"><span class="sector-section-kicker">Preguntas frecuentes</span><h2>Primero aclaramos las dudas. Después activamos la estrategia.</h2><p>Un bloque pensado para resolver las preguntas reales antes de pedir una cata digital.</p></div>${renderSectorFaqAccordion(a.faqs)}</section>`;
}

function renderSectorMainBlocks(a) {
  const editorial = [renderEditorialCard(a, 'problema_sector', 'El reto del sector', '01'), renderEditorialCard(a, 'solucion_salero', 'La solución de Salero Digital', '02')].join('');
  const strategy = [renderStrategyCard(a, 'servicios_recomendados', 'Servicios recomendados', '01'), renderStrategyCard(a, 'beneficios', 'Beneficios que buscamos', '02'), renderStrategyCard(a, 'ejemplos_acciones', 'Acciones que podemos activar', '03')].join('');
  const faqs = renderSectorFaqBlock(a);
  return `${editorial ? `<div class="sector-editorial-split">${editorial}</div>` : ''}${strategy ? `<section class="sector-strategy-section"><div class="sector-block-heading"><span class="sector-section-kicker">Plan de acción</span><h2>De la presencia digital a la captación real</h2></div><div class="sector-strategy-grid">${strategy}</div></section>` : ''}${faqs}`;
}

function renderSectorDetailPage(root, item, cfg) {
  const a = getAcf(item);
  const kind = sectorCardKind(item);
  const fallback = sectorFallback(kind);
  const rawTitle = fieldValue(a, ['hero_title', 'titulo_hero', 'titulo_principal', 'nombre_creativo', 'titular_seo'], fallback.heroTitle || itemTitle(item));
  const title = stripHtml(rawTitle || itemTitle(item) || 'Sector');
  const claim = fieldValue(a, ['hero_text', 'texto_hero', 'subtitulo_hero', 'claim', 'subtitulo_comercial', 'meta_description'], fallback.heroText || excerpt(item));
  const eyebrow = fieldValue(a, ['etiqueta_comercial', 'sector_label', 'sector_etiqueta', 'kicker'], fallback.eyebrow || cfg.typeLabel);
  const ctaLabel = fieldValue(a, [cfg.ctaTextKey, 'cta_label', 'cta_texto', 'boton_texto'], fallback.ctaLabel);
  const ctaUrl = normalizeUrl(fieldValue(a, [cfg.ctaUrlKey, 'cta_url', 'boton_url'], SALERO_CONFIG.contactUrl));
  const videoUrl = fieldUrl(fieldValue(a, ['hero_video', 'video_hero', 'sector_hero_video', 'video_sector'], fallback.fallbackVideo || ''));
  const posterUrl = fieldUrl(fieldValue(a, ['hero_poster', 'poster_hero', 'sector_hero_poster', 'imagen_hero', 'hero_image', 'imagen_sector'], fallback.fallbackPoster || featuredImage(item) || ''));
  const cardTitle = fieldValue(a, ['hero_card_title', 'destacado_titulo', 'card_title'], fallback.cardTitle);
  const cardItems = fieldList(fieldValue(a, ['hero_card_items', 'destacado_items', 'puntos_hero', 'card_items'], fallback.cardItems));
  const sidebarTitle = fieldValue(a, ['sidebar_title', 'cata_titulo'], 'Qué miramos en una cata digital');
  const sidebarItems = fieldList(fieldValue(a, ['sidebar_items', 'cata_items', 'que_miramos'], ['Cómo apareces en Google y Google Maps', 'Qué transmite tu web en los primeros segundos', 'Cómo comunicas en redes sociales', 'Qué hace tu competencia directa', 'Dónde se están perdiendo oportunidades']));
  const bodyHtml = renderSectorContentHtml(item, a, claim);
  const sectorBlocks = renderSectorMainBlocks(a);
  const finalTitle = fieldValue(a, ['cta_final_titulo', 'final_title', 'titulo_cta_final'], fallback.finalTitle);
  const finalText = fieldValue(a, ['cta_final_texto_largo', 'final_text', 'texto_cta_final'], fallback.finalText);
  ensureCanonical(`${window.location.origin}${trailingSlashPath(window.location.pathname)}`);
  root.classList.add('sector-detail-root');
  root.innerHTML = `<section class="sector-detail-hero sector-kind-${escapeHtml(kind)}" aria-labelledby="sector-detail-title">${renderSectorHeroMedia(videoUrl, posterUrl, title)}<div class="sector-detail-veil" aria-hidden="true"></div><div class="sector-detail-gradient" aria-hidden="true"></div><div class="container sector-detail-hero-inner"><div class="sector-detail-copy"><a class="sector-detail-back" href="/sectores/">Sectores</a><span class="sector-detail-kicker">${escapeHtml(stripHtml(eyebrow))}</span><h1 id="sector-detail-title">${escapeHtml(title)}</h1>${claim ? `<p>${escapeHtml(stripHtml(claim))}</p>` : ''}<div class="sector-detail-actions" aria-label="Acciones principales"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a><a class="btn btn-secondary sector-btn-glass" href="#contenido-sector">Ver estrategia</a></div></div><aside class="sector-detail-hero-card" aria-label="Resumen del sector"><span class="sector-card-label">${escapeHtml(sectorCardLabel(kind))}</span><h2>${escapeHtml(stripHtml(cardTitle))}</h2>${cardItems.length ? `<ul>${cardItems.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}</aside></div></section><section class="sector-content-section" id="contenido-sector"><div class="container sector-content-grid"><article class="sector-main-content"><span class="sector-section-kicker">Estrategia sectorial</span><div class="sector-rich-content sector-lead-content">${bodyHtml}</div>${sectorBlocks ? `<div class="sector-dynamic-blocks">${sectorBlocks}</div>` : ''}</article><aside class="sector-sidebar"><div class="sector-sidebar-card"><span class="sector-section-kicker">Cata digital</span><h2>${escapeHtml(stripHtml(sidebarTitle))}</h2>${sidebarItems.length ? `<ul>${sidebarItems.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}<a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a></div></aside></div></section><section class="sector-final-cta" aria-labelledby="sector-final-title"><div class="container sector-final-card"><span class="sector-section-kicker">Con salero y con método</span><h2 id="sector-final-title">${escapeHtml(stripHtml(finalTitle))}</h2>${finalText ? `<p>${escapeHtml(stripHtml(finalText))}</p>` : ''}<div class="sector-detail-actions"><a class="btn btn-primary" href="${escapeHtml(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a><a class="btn btn-secondary" href="${escapeHtml(SALERO_CONFIG.whatsappUrl)}" target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div></section>`;
  initSectorFaqAccordions(root);
  const video = root.querySelector('[data-sector-video]');
  if (video) {
    const tryPlay = () => video.play().catch(() => {});
    if (document.readyState === 'complete') tryPlay();
    else window.addEventListener('load', tryPlay, { once: true });
  }
}

async function renderDetailPage() {
  const root = document.querySelector('[data-detail]');
  if (!root) return;
  const cfg = DETAIL_CONFIG[root.dataset.type];
  if (!cfg) {
    root.innerHTML = '<div class="container section"><div class="error">Configuración no válida.</div></div>';
    return;
  }
  const slug = root.dataset.slug || currentSlugFromPath();
  if (!slug) {
    root.innerHTML = `<div class="container section"><div class="error">No se ha podido detectar el contenido solicitado.</div></div>`;
    return;
  }
  try {
    const item = await getBySlug(cfg.endpoint, slug);
    if (!item) {
      root.innerHTML = '<div class="container section"><div class="empty">Contenido no encontrado en WordPress.</div></div>';
      return;
    }
    setSeoFromItem(item);
    if (root.dataset.type === 'sector') {
      renderSectorDetailPage(root, item, cfg);
      return;
    }
    if (root.dataset.type === 'servicio') {
      renderServiceDetailPage(root, item, cfg);
      return;
    }
    const a = getAcf(item), title = a.nombre_creativo || a.titular_seo || itemTitle(item), tech = a.nombre_tecnico || a.precio_desde || cfg.typeLabel, claim = a.claim || a.subtitulo_comercial || a.titular_seo || a.meta_description || excerpt(item), cta = a[cfg.ctaTextKey] || 'Pide tu cata digital', url = normalizeUrl(a[cfg.ctaUrlKey]), img = featuredImage(item);
    root.innerHTML = `<section class="hero"><div class="container hero-grid"><div class="hero-copy"><span class="eyebrow">${escapeHtml(cfg.typeLabel)}</span><h1>${escapeHtml(stripHtml(title))}</h1>${tech ? `<p class="lead"><strong>${escapeHtml(stripHtml(tech))}</strong></p>` : ''}${claim ? `<p class="lead">${escapeHtml(stripHtml(claim))}</p>` : ''}<div class="hero-actions"><a class="btn btn-primary" href="${url}">${escapeHtml(stripHtml(cta))}</a><a class="btn btn-secondary" href="/hablamos/">Pide una cata digital</a></div></div><aside class="hero-card">${img ? `<img src="${img}" alt="${escapeHtml(stripHtml(title))}" loading="lazy">` : ''}<strong>Digitalizamos con salero, pero con los pies en la tierra.</strong><p>Una estrategia clara, cercana y pensada para que el negocio gane visibilidad, confianza y oportunidades.</p></aside></div></section><section class="section-tight"><div class="container detail-layout"><main class="content-panel">${cfg.sections.map(s => renderSection(a, s[0], s[1], s[2])).join('')}</main><aside class="sidebar-card"><span class="eyebrow">Cata digital</span><h3>¿Le damos una chispa a tu negocio?</h3><p>Cuéntanos dónde está ahora tu marca y vemos qué punto de sal necesita.</p><a class="btn btn-accent" href="/hablamos/">Hablemos</a></aside></div></section>`;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="container section"><div class="error">No se pudo cargar el contenido desde WordPress. Revisa el endpoint ${escapeHtml(cfg.endpoint)} y el slug ${escapeHtml(slug)}.</div></div>`;
  }
}

document.addEventListener('DOMContentLoaded', renderDetailPage);
