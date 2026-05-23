const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://salero.webagencia360.com';

export async function handleSectorRequest(context) {
  const slug = sanitizeSlug(context.params.slug || '');

  if (!slug) {
    return htmlResponse(renderErrorPage('Sector no encontrado', 'No se ha recibido un slug válido para cargar esta landing sectorial.'), 404);
  }

  try {
    const item = await fetchSector(slug);

    if (!item) {
      return htmlResponse(renderErrorPage('Contenido no encontrado', `No existe ningún sector publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    return htmlResponse(renderSectorPage(slug, item), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el contenido desde WordPress', String(error && error.message ? error.message : error)), 502);
  }
}

async function fetchSector(slug) {
  const url = new URL(`${CMS_API_BASE}/sectores`);
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

function renderSectorPage(slug, item) {
  const acf = getAcf(item);
  const kind = sectorKind(item);
  const fallback = sectorFallback(kind);

  const title = stripHtml(fieldValue(acf, ['hero_title', 'titulo_hero', 'titulo_principal', 'nombre_creativo', 'titular_seo'], fallback.heroTitle || itemTitle(item) || 'Sector'));
  const claim = fieldValue(acf, ['hero_text', 'texto_hero', 'subtitulo_hero', 'claim', 'subtitulo_comercial', 'meta_description'], fallback.heroText || excerpt(item));
  const eyebrow = fieldValue(acf, ['etiqueta_comercial', 'sector_label', 'sector_etiqueta', 'kicker'], fallback.eyebrow || 'Sectores');
  const metaTitle = stripHtml(fieldValue(acf, ['meta_title', 'og_title'], title));
  const metaDescription = stripHtml(fieldValue(acf, ['meta_description', 'og_description'], claim || excerpt(item))).slice(0, 165);
  const canonical = `${SITE_ORIGIN}/sectores/${slug}/`;

  const ctaLabel = fieldValue(acf, ['cta_sectorial_texto', 'cta_label', 'cta_texto', 'boton_texto'], fallback.ctaLabel || 'Pide tu cata digital');
  const ctaUrl = normalizeUrl(fieldValue(acf, ['cta_sectorial_url', 'cta_url', 'boton_url'], '/hablamos/'));
  const videoUrl = fieldUrl(fieldValue(acf, ['hero_video', 'video_hero', 'sector_hero_video', 'video_sector'], fallback.fallbackVideo || ''));
  const posterUrl = fieldUrl(fieldValue(acf, ['hero_poster', 'poster_hero', 'sector_hero_poster', 'imagen_hero', 'hero_image', 'imagen_sector'], fallback.fallbackPoster || featuredImage(item) || ''));
  const cardTitle = fieldValue(acf, ['hero_card_title', 'destacado_titulo', 'card_title'], fallback.cardTitle || 'Una estrategia con el punto justo para tu sector.');
  const cardItems = fieldList(fieldValue(acf, ['hero_card_items', 'destacado_items', 'puntos_hero', 'card_items'], fallback.cardItems || []));
  const sidebarTitle = fieldValue(acf, ['sidebar_title', 'cata_titulo'], 'Qué miramos en una cata digital');
  const sidebarItems = fieldList(fieldValue(acf, ['sidebar_items', 'cata_items', 'que_miramos'], [
    'Cómo apareces en Google y Google Maps',
    'Qué transmite tu web en los primeros segundos',
    'Cómo comunicas en redes sociales',
    'Qué hace tu competencia directa',
    'Dónde se están perdiendo oportunidades'
  ]));
  const finalTitle = fieldValue(acf, ['cta_final_titulo', 'final_title', 'titulo_cta_final'], fallback.finalTitle || 'Tu negocio ya tiene oficio. Ahora toca que se vea como merece.');
  const finalText = fieldValue(acf, ['cta_final_texto_largo', 'final_text', 'texto_cta_final'], fallback.finalText || 'Revisamos tu presencia digital y te decimos qué acciones pueden ayudarte a ganar visibilidad, confianza y oportunidades reales.');

  const bodyHtml = renderSectorContentHtml(item, claim);
  const editorialBlocks = renderEditorialBlocks(acf);
  const strategySection = renderStrategySection(acf);
  const faqBlock = renderFaqBlock(acf);

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(metaTitle)} | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/sector-detail.css?v=4">
  <link rel="stylesheet" href="/assets/css/sector-action-layout.css?v=2">
  <link rel="stylesheet" href="/assets/css/sector-faq-layout.css?v=2">
  <link rel="stylesheet" href="/assets/css/sector-final-layout.css?v=1">
</head>
<body class="sector-detail-page">
${renderHeader()}
  <main id="sector-detail-root" class="sector-detail-root" data-detail data-type="sector" data-slug="${escapeAttr(slug)}">
    <section class="sector-detail-hero sector-kind-${escapeAttr(kind)}" aria-labelledby="sector-detail-title">
      ${renderHeroMedia(videoUrl, posterUrl, title)}
      <div class="sector-detail-veil" aria-hidden="true"></div>
      <div class="sector-detail-gradient" aria-hidden="true"></div>
      <div class="container sector-detail-hero-inner">
        <div class="sector-detail-copy">
          <a class="sector-detail-back" href="/sectores/">Sectores</a>
          <span class="sector-detail-kicker">${escapeHtml(stripHtml(eyebrow))}</span>
          <h1 id="sector-detail-title">${escapeHtml(title)}</h1>
          ${claim ? `<p>${escapeHtml(stripHtml(claim))}</p>` : ''}
          <div class="sector-detail-actions" aria-label="Acciones principales">
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
            <a class="btn btn-secondary sector-btn-glass" href="#contenido-sector">Ver estrategia</a>
          </div>
        </div>
        <aside class="sector-detail-hero-card" aria-label="Resumen del sector">
          <span class="sector-card-label">${escapeHtml(sectorCardLabel(kind))}</span>
          <h2>${escapeHtml(stripHtml(cardTitle))}</h2>
          ${cardItems.length ? `<ul>${cardItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </aside>
      </div>
    </section>

    <section class="sector-content-section" id="contenido-sector">
      <div class="container sector-content-grid">
        <article class="sector-main-content">
          <span class="sector-section-kicker">Estrategia sectorial</span>
          <div class="sector-rich-content sector-lead-content">${bodyHtml}</div>
          ${editorialBlocks}
        </article>
        <aside class="sector-sidebar">
          <div class="sector-sidebar-card">
            <span class="sector-section-kicker">Cata digital</span>
            <h2>${escapeHtml(stripHtml(sidebarTitle))}</h2>
            ${sidebarItems.length ? `<ul>${sidebarItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
            <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
          </div>
        </aside>
      </div>
      ${strategySection ? `<div class="sector-action-container">${strategySection}</div>` : ''}
      ${faqBlock ? `<div class="container sector-faq-container">${faqBlock}</div>` : ''}
    </section>

    <section class="sector-final-cta" aria-labelledby="sector-final-title">
      <div class="container sector-final-card">
        <span class="sector-section-kicker">Con salero y con método</span>
        <h2 id="sector-final-title">${escapeHtml(stripHtml(finalTitle))}</h2>
        ${finalText ? `<p>${escapeHtml(stripHtml(finalText))}</p>` : ''}
        <div class="sector-detail-actions">
          <a class="btn btn-primary" href="${escapeAttr(ctaUrl)}">${escapeHtml(stripHtml(ctaLabel))}</a>
          <a class="btn btn-secondary" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">Hablar por WhatsApp</a>
        </div>
      </div>
    </section>
  </main>
${renderFooter()}
  <script src="/assets/js/config.js?v=7"></script>
  <script src="/assets/js/helpers.js?v=41"></script>
  <script src="/assets/js/sector-faqs.js?v=6"></script>
  <script>document.addEventListener('DOMContentLoaded',function(){if(typeof initSectorFaqAccordions==='function'){initSectorFaqAccordions(document.getElementById('sector-detail-root'));}});</script>
</body>
</html>`;
}

function renderHeader() {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a>
      <nav class="nav" aria-label="Menú principal">
        <a href="/el-menu/">El Menú</a>
        <a href="/nuestros-menus/">Nuestros menús</a>
        <a href="/sectores/" class="is-active" aria-current="page">Sectores</a>
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
        <div><h3>Secciones</h3><nav class="footer-nav"><a href="/nuestros-menus/">Nuestros menús</a><a href="/el-menu/">El Menú</a><a href="/sectores/">Sectores</a><a href="/la-rebotica/">La Rebotica</a></nav></div>
        <div><h3>Contacto</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="/hablamos/">¿Te hace un café y hablamos?</a>`;
}

function renderHeroMedia(videoUrl, posterUrl, title) {
  if (videoUrl) {
    return `<video class="sector-detail-hero-video" data-sector-video autoplay muted loop playsinline preload="metadata" ${posterUrl ? `poster="${escapeAttr(posterUrl)}"` : ''} aria-hidden="true"><source src="${escapeAttr(videoUrl)}" type="video/mp4"></video>`;
  }

  if (posterUrl) {
    return `<img class="sector-detail-hero-image" src="${escapeAttr(posterUrl)}" alt="${escapeAttr(stripHtml(title))}" loading="eager">`;
  }

  return '';
}

function renderSectorContentHtml(item, claim) {
  const wpContent = item.content && item.content.rendered ? String(item.content.rendered).trim() : '';
  if (wpContent) return wpContent;
  if (claim) return formatText(claim);
  return '<p>Contenido pendiente de ampliar desde WordPress.</p>';
}

function renderEditorialBlocks(acf) {
  const blocks = [
    renderEditorialCard(acf, 'problema_sector', fieldValue(acf, ['problema_sector_titulo', 'titulo_problema_sector'], 'El reto del sector'), '01', fieldValue(acf, ['problema_sector_imagen', 'imagen_problema_sector'], '')),
    renderEditorialCard(acf, 'solucion_salero', fieldValue(acf, ['solucion_salero_titulo', 'titulo_solucion_salero'], 'La solución de Salero Digital'), '02', fieldValue(acf, ['solucion_salero_imagen', 'imagen_solucion_salero'], ''))
  ].filter(Boolean).join('');

  return blocks ? `<div class="sector-editorial-split">${blocks}</div>` : '';
}

function renderEditorialCard(acf, key, title, number, image = '') {
  const value = acf[key];
  if (!value) return '';

  const imageUrl = fieldUrl(image);
  const style = imageUrl ? ` style="--sector-card-image:url('${escapeCssUrl(imageUrl)}')"` : '';
  const imageAttr = imageUrl ? ` data-sector-image="true"` : '';

  return `<article class="sector-editorial-card sector-editorial-${escapeAttr(key)}"${imageAttr}${style}><span>${number}</span><h2>${escapeHtml(stripHtml(title))}</h2>${formatText(value)}</article>`;
}

function renderStrategySection(acf) {
  const cards = [
    renderStrategyCard(acf, 'servicios_recomendados', 'Servicios recomendados', '01'),
    renderStrategyCard(acf, 'beneficios', 'Beneficios que buscamos', '02'),
    renderStrategyCard(acf, 'ejemplos_acciones', 'Acciones que podemos activar', '03')
  ].filter(Boolean).join('');

  if (!cards) return '';

  return `<section class="sector-strategy-section"><div class="sector-block-heading"><span class="sector-section-kicker">Plan de acción</span><h2>De la presencia digital a la captación real</h2></div><div class="sector-strategy-grid">${cards}</div></section>`;
}

function renderStrategyCard(acf, key, title, number) {
  const items = fieldList(acf[key]);
  if (!items.length) return '';

  return `<article class="sector-strategy-card sector-strategy-${escapeAttr(key)}"><span>${number}</span><h2>${escapeHtml(title)}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`;
}

function renderFaqBlock(acf) {
  const faqData = acf.faqs_repeater || acf.preguntas_frecuentes || acf.faqs_items || acf.faqs;
  const faqs = parseFaqs(faqData);
  if (!faqs.length) return '';

  return `<section class="sector-faq-block"><div class="sector-faq-copy"><span class="sector-section-kicker">Preguntas frecuentes</span><h2>Primero aclaramos las dudas. Después activamos la estrategia.</h2><p>Resolvemos las preguntas clave antes de proponer una receta digital para tu negocio.</p></div><div class="sector-faq-accordion">${faqs.map((faq, index) => `<details ${index === 0 ? 'open' : ''}><summary><span>${escapeHtml(faq.q)}</span></summary><div class="sector-faq-answer">${formatText(faq.a)}</div></details>`).join('')}</div></section>`;
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

function renderErrorPage(title, message) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/css/main.css?v=50"></head><body>${renderHeader()}<main class="container section"><div class="error"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></main>${renderFooter()}<script src="/assets/js/config.js?v=7"></script><script src="/assets/js/helpers.js?v=41"></script></body></html>`;
}

function getAcf(item = {}) {
  return item.salero_acf || item.acf || {};
}

function itemTitle(item = {}) {
  return item.title && item.title.rendered ? stripHtml(item.title.rendered) : '';
}

function excerpt(item = {}) {
  if (item.excerpt && item.excerpt.rendered) return stripHtml(item.excerpt.rendered);
  const acf = getAcf(item);
  return acf.claim || acf.subtitulo_comercial || acf.titular_seo || acf.meta_description || '';
}

function featuredImage(item = {}) {
  if (item.featured_image_url) return item.featured_image_url;
  const media = item._embedded && item._embedded['wp:featuredmedia'];
  return media && media[0] && media[0].source_url ? media[0].source_url : '';
}

function sectorKind(item = {}) {
  const text = `${item.slug || ''} ${itemTitle(item)}`.toLowerCase();
  if (text.includes('hosteler') || text.includes('turismo') || text.includes('restaurante') || text.includes('alojamiento')) return 'hosteleria';
  if (text.includes('comercio') || text.includes('pyme') || text.includes('pymes') || text.includes('tienda')) return 'comercio';
  if (text.includes('almazara') || text.includes('aceite') || text.includes('olivar') || text.includes('oliva')) return 'aceite';
  return 'generico';
}

function sectorCardLabel(kind = 'generico') {
  if (kind === 'hosteleria') return 'Reservas, imagen y reputación';
  if (kind === 'comercio') return 'Visibilidad local y ventas';
  if (kind === 'aceite') return 'Origen, producto y marca';
  return 'Estrategia sectorial';
}

function sectorFallback(kind = 'generico') {
  const base = {
    eyebrow: 'Sectores',
    cardTitle: 'Una estrategia con el punto justo para tu sector.',
    cardItems: ['Visibilidad local más clara', 'Contenido con intención comercial', 'Medición sencilla y útil'],
    ctaLabel: 'Pide tu cata digital',
    finalTitle: 'Tu negocio ya tiene oficio. Ahora toca que se vea como merece.',
    finalText: 'Revisamos tu presencia digital y te decimos qué acciones pueden ayudarte a ganar visibilidad, confianza y oportunidades reales.'
  };

  if (kind === 'hosteleria') {
    return {
      ...base,
      eyebrow: 'Hostelería y turismo',
      heroTitle: 'Marketing para negocios que se viven en la mesa, en la reserva y en la experiencia',
      heroText: 'Estrategias digitales para restaurantes, bares, cafeterías, alojamientos rurales y proyectos turísticos que quieren ganar visibilidad, confianza y oportunidades reales sin perder su forma de ser.',
      cardTitle: 'Tu negocio ya tiene encanto. Ahora toca que se encuentre, se entienda y se elija.',
      cardItems: ['Google Maps más trabajado', 'Redes con intención comercial', 'Campañas para reservas, llamadas y mensajes'],
      finalTitle: 'Tu negocio ya tiene el sabor. Nosotros hacemos que se note desde fuera.',
      finalText: 'Si tienes un restaurante, bar, cafetería, hotel rural, alojamiento o proyecto turístico, podemos ayudarte a ordenar tu presencia digital y convertirla en visibilidad, confianza y oportunidades reales.',
      fallbackVideo: '/assets/video/hosteleria-hero.mp4',
      fallbackPoster: '/assets/img/hosteleria-hero-poster.webp'
    };
  }

  if (kind === 'comercio') {
    return {
      ...base,
      eyebrow: 'Comercios y pymes',
      heroTitle: 'Marketing para comercios que necesitan más visibilidad local y más ventas',
      heroText: 'Estrategias digitales para tiendas, negocios de barrio y pymes que quieren aparecer mejor, comunicar con más claridad y convertir la cercanía en oportunidades reales.',
      cardTitle: 'Tu comercio ya tiene trato y producto. Ahora toca que te encuentren antes.',
      cardItems: ['Google Maps y búsquedas locales', 'Redes para activar confianza', 'Campañas de cercanía y venta']
    };
  }

  if (kind === 'aceite') {
    return {
      ...base,
      eyebrow: 'Almazaras y aceite',
      heroTitle: 'Marketing para marcas con origen, producto y mucho que contar',
      heroText: 'Estrategias digitales para almazaras, cooperativas y proyectos agroalimentarios que quieren poner en valor su producto, su territorio y su capacidad comercial.',
      cardTitle: 'El origen ya lo tienes. Ahora toca convertirlo en marca y demanda.',
      cardItems: ['SEO para producto y territorio', 'Contenido de origen y calidad', 'Campañas para venta y captación']
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
          item.punto_cata ||
          item.punto_cata_digital ||
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

function normalizeUrl(value = '') {
  if (!value) return '/hablamos/';
  if (typeof value !== 'string') return '/hablamos/';
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return value;
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
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

function escapeCssUrl(value = '') {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\)/g, '\\)');
}
