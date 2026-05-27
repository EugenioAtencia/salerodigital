const CMS_API_BASE = 'https://cms.webagencia360.com/wp-json/wp/v2';
const SITE_ORIGIN = 'https://salero.webagencia360.com';

export async function handleBlogPostRequest(context) {
  const slug = sanitizeSlug(context.params.slug || '');

  if (!slug) {
    return htmlResponse(renderErrorPage('Artículo no encontrado', 'No se ha recibido un slug válido para cargar el artículo.'), 404);
  }

  try {
    const post = await fetchPost(slug);

    if (!post) {
      return htmlResponse(renderErrorPage('Artículo no encontrado', `No existe ningún artículo publicado con el slug ${escapeHtml(slug)}.`), 404);
    }

    return htmlResponse(renderPostPage(slug, post), 200);
  } catch (error) {
    return htmlResponse(renderErrorPage('No se pudo cargar el artículo desde WordPress', String(error && error.message ? error.message : error)), 502);
  }
}

async function fetchPost(slug) {
  const url = new URL(`${CMS_API_BASE}/posts`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_embed', '1');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaleroDigital-Cloudflare-Blog-SSR'
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false
    }
  });

  if (!response.ok) throw new Error(`WordPress respondió con estado ${response.status}`);
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

function renderPostPage(slug, post) {
  const title = stripHtml(post?.title?.rendered || 'Artículo de La Rebotica');
  const fullContent = sanitizeWpContent(post?.content?.rendered || '<p>Contenido pendiente de ampliar desde WordPress.</p>');
  const faqData = extractBlogFaqs(fullContent);
  const rawContent = faqData.content;
  const faqBlock = renderBlogFaqBlock(faqData.faqs);
  const excerpt = stripHtml(post?.excerpt?.rendered || '').slice(0, 170);
  const categories = postCategories(post);
  const primaryCategory = categories[0] || 'La Rebotica';
  const featured = featuredImage(post);
  const date = formatDate(post.date);
  const readTime = readingTime(fullContent);
  const canonical = `${SITE_ORIGIN}/la-rebotica/${slug}/`;
  const metaDescription = (excerpt || stripHtml(fullContent).slice(0, 155)).slice(0, 155);
  const tocHtml = buildToc(rawContent);

  return `<!doctype html>
<html lang="es">
<head>
  <title>${escapeHtml(title)} | La Rebotica | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  ${featured ? `<meta property="og:image" content="${escapeAttr(featured.url)}">` : ''}
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
  <link rel="stylesheet" href="/assets/css/blog-article.css?v=7">
</head>
<body class="blog-article-page">
${renderHeader()}
  <main class="ba-page">
    <article class="ba-article">
      <section class="ba-hero ${featured ? 'ba-hero--with-image' : ''}">
        ${featured ? `<img class="ba-hero-bg-image" src="${escapeAttr(featured.url)}" alt="" aria-hidden="true" loading="eager">` : ''}
        <div class="ba-hero-bg" aria-hidden="true"></div>
        <div class="container ba-hero-grid">
          <div class="ba-hero-copy">
            <a class="ba-back" href="/la-rebotica/">Volver a La Rebotica</a>
            <span class="eyebrow">${escapeHtml(primaryCategory)}</span>
            <h1>${escapeHtml(title)}</h1>
            ${excerpt ? `<p class="lead">${escapeHtml(excerpt)}</p>` : ''}
            <div class="ba-meta">
              ${date ? `<time datetime="${escapeAttr(post.date)}">${escapeHtml(date)}</time>` : ''}
              <span>${readTime} min de lectura</span>
              <span>Salero Digital</span>
            </div>
          </div>
          ${renderHeroCard(categories)}
        </div>
      </section>

      <section class="ba-body-section">
        <div class="container ba-body-grid">
          <div class="ba-sidebar">
            ${tocHtml}
            <aside class="ba-side-cta">
              <span>Cata digital</span>
              <p>¿Quieres saber qué contenidos necesita tu negocio para ganar visibilidad y confianza?</p>
              <a href="/hablamos/">Pedir una cata</a>
            </aside>
          </div>
          <div class="ba-content-wrap">
            <div class="ba-content">${rawContent}</div>
            ${faqBlock}
          </div>
        </div>
      </section>

      <section class="ba-final-cta">
        <div class="container ba-final-box">
          <span class="eyebrow">Siguiente paso</span>
          <h2>Que tu negocio no se quede solo leyendo estrategias.</h2>
          <p>Si este artículo te ha hecho ver una oportunidad, podemos revisar tu caso y decirte qué receta digital tendría más sentido para empezar.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a>
            <a class="btn btn-secondary" href="/la-rebotica/">Ver más artículos</a>
          </div>
        </div>
      </section>
    </article>
  </main>
${renderFooter()}
  <script src="/assets/js/config.js?v=50" defer></script>
  <script src="/assets/js/helpers.js?v=50" defer></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.ba-faq-accordion details').forEach(function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          var group = item.closest('.ba-faq-accordion');
          if (!group) return;
          group.querySelectorAll('details').forEach(function (other) {
            if (other !== item) other.open = false;
          });
        });
      });
    });
  </script>
</body>
</html>`;
}

function renderHeroCard(categories = []) {
  return `<aside class="ba-hero-card" aria-label="Resumen del artículo">
            <span>Receta digital</span>
            <p>Un contenido de La Rebotica para tomar decisiones con más criterio y menos ruido.</p>
            <div class="ba-hero-tags">
              ${(categories.length ? categories : ['Marketing digital', 'Estrategia']).slice(0, 4).map(cat => `<strong>${escapeHtml(cat)}</strong>`).join('')}
            </div>
          </aside>`;
}

function renderHeader() {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="logo logo-wordmark" href="/" aria-label="Salero Digital"><span>Salero Digital</span></a>
      <nav class="nav" aria-label="Menú principal">
        <a href="/el-menu/">El Menú</a>
        <a href="/nuestros-menus/">Nuestros menús</a>
        <a href="/sectores/">Sectores</a>
        <a href="/casos-de-exito/">Casos de éxito</a>
        <a href="/la-rebotica/" class="is-active" aria-current="page">La Rebotica</a>
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
        <div><h2>Salero Digital</h2><p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p></div>
        <div><h3>El Menú</h3><nav class="footer-nav"><a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a><a href="/el-menu/el-pregonero/">El Pregonero</a><a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a><a href="/el-menu/el-empujon/">El Empujón</a></nav></div>
        <div><h3>La Rebotica</h3><nav class="footer-nav"><a href="/la-rebotica/">Ver todos los artículos</a><a href="/sectores/">Ver sectores</a><a href="/casos-de-exito/">Ver casos de éxito</a></nav></div>
        <div><h3>¿Hablamos?</h3><p>Morón de la Frontera, Sierra Sur y Campiña.</p><a href="/hablamos/">Pide tu cata digital</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Salero Digital</span><span>Digitalizamos con salero, pero con los pies en la tierra.</span></div>
    </div>
  </footer>
  <a class="whatsapp-float" href="https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital." target="_blank" rel="noopener">¿Te hace un café y hablamos?</a>`;
}

function renderErrorPage(title, text) {
  return `<!doctype html><html lang="es"><head><title>${escapeHtml(title)} | Salero Digital</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/main.css?v=50"><link rel="stylesheet" href="/assets/css/blog-article.css?v=7"></head><body class="blog-article-page">${renderHeader()}<main class="ba-page"><section class="ba-error-section"><div class="container"><div class="ba-error-card"><span class="eyebrow">La Rebotica</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a class="btn btn-primary" href="/la-rebotica/">Volver a La Rebotica</a></div></div></section></main>${renderFooter()}<script src="/assets/js/config.js?v=50" defer></script><script src="/assets/js/helpers.js?v=50" defer></script></body></html>`;
}

function buildToc(content) {
  const headings = [...String(content).matchAll(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi)]
    .map((match, index) => ({ level: match[1], text: stripHtml(match[3]), id: headingId(stripHtml(match[3]), index) }))
    .filter(item => item.text.length > 0 && !isFaqHeading(item.text));

  if (headings.length < 3) return '';
  return `<aside class="ba-toc" aria-label="Índice del artículo"><span>En esta receta</span>${headings.map(item => `<a class="ba-toc__link ba-toc__link--h${item.level}" href="#${escapeAttr(item.id)}">${escapeHtml(item.text)}</a>`).join('')}</aside>`;
}

function headingId(text, index) {
  return `apartado-${index + 1}-${String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

function sanitizeWpContent(content = '') {
  let html = String(content || '');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<form[\s\S]*?<\/form>/gi, '');

  let index = 0;
  html = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const plain = stripHtml(inner);
    const existingId = String(attrs || '').match(/\sid=["']([^"']+)["']/i);
    const id = existingId ? existingId[1] : headingId(plain, index++);
    const cleanAttrs = String(attrs || '').replace(/\sid=["'][^"']+["']/i, '').replace(/\sstyle=["'][^"']*["']/gi, '');
    return `<h${level}${cleanAttrs} id="${escapeAttr(id)}">${inner}</h${level}>`;
  });

  return html.replace(/\sstyle=["'][^"']*["']/gi, '');
}

function extractBlogFaqs(content = '') {
  let html = String(content || '');
  const headingMatch = findFaqHeading(html);

  if (!headingMatch) {
    const details = parseDetailsFaqs(html);
    if (!details.faqs.length) return { content: html, faqs: [] };
    return { content: details.content, faqs: details.faqs };
  }

  const sectionStart = headingMatch.index;
  const sectionEnd = findNextHeadingBoundary(html, headingMatch.end, headingMatch.level);
  const sectionBody = html.slice(headingMatch.end, sectionEnd);
  let faqs = parseHeadingFaqs(sectionBody);

  if (!faqs.length) faqs = parseDetailsFaqs(sectionBody).faqs;
  if (!faqs.length) faqs = parseStrongFaqs(sectionBody);
  if (!faqs.length) return { content: html, faqs: [] };

  const cleaned = `${html.slice(0, sectionStart)}${html.slice(sectionEnd)}`.trim();
  return { content: cleaned, faqs };
}

function findFaqHeading(html = '') {
  const re = /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = re.exec(html))) {
    const text = stripHtml(match[3]);
    if (!isFaqHeading(text)) continue;
    return { index: match.index, end: match.index + match[0].length, level: Number(match[1]) };
  }

  return null;
}

function findNextHeadingBoundary(html = '', fromIndex = 0, currentLevel = 2) {
  const re = /<h([1-4])\b[^>]*>[\s\S]*?<\/h\1>/gi;
  re.lastIndex = fromIndex;
  let match;

  while ((match = re.exec(html))) {
    const level = Number(match[1]);
    if (level <= currentLevel) return match.index;
  }

  return html.length;
}

function parseHeadingFaqs(block = '') {
  const matches = [...String(block).matchAll(/<h([3-6])([^>]*)>([\s\S]*?)<\/h\1>/gi)]
    .filter(match => stripHtml(match[3]).trim().length > 0);

  if (!matches.length) return [];

  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : block.length;
    const q = stripHtml(match[3]);
    const a = String(block.slice(start, end)).trim();
    return q && a ? { q, a } : null;
  }).filter(Boolean);
}

function parseDetailsFaqs(html = '') {
  const source = String(html || '');
  const detailRe = /<details\b[^>]*>[\s\S]*?<\/details>/gi;
  const faqs = [];
  let content = source;
  let match;

  while ((match = detailRe.exec(source))) {
    const detail = match[0];
    const summary = detail.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    if (!summary) continue;
    const q = stripHtml(summary[1]);
    const a = detail.replace(summary[0], '').replace(/^<details\b[^>]*>/i, '').replace(/<\/details>$/i, '').trim();
    if (q && a) faqs.push({ q, a });
  }

  if (faqs.length) content = source.replace(detailRe, '').trim();
  return { content, faqs };
}

function parseStrongFaqs(block = '') {
  const pieces = String(block || '').split(/(<p[^>]*>\s*(?:<strong[^>]*>)?[\s\S]*?\?[\s\S]*?<\/p>)/i).filter(Boolean);
  const faqs = [];

  for (let index = 0; index < pieces.length; index += 1) {
    const item = pieces[index];
    if (!/<p/i.test(item) || !stripHtml(item).includes('?')) continue;
    const q = stripHtml(item);
    const answerParts = [];
    let cursor = index + 1;

    while (cursor < pieces.length && !stripHtml(pieces[cursor]).includes('?')) {
      answerParts.push(pieces[cursor]);
      cursor += 1;
    }

    const a = answerParts.join('').trim();
    if (q && a) faqs.push({ q, a });
  }

  return faqs;
}

function renderBlogFaqBlock(faqs = []) {
  if (!Array.isArray(faqs) || !faqs.length) return '';

  return `<section class="ba-inline-faq" id="preguntas-frecuentes" aria-labelledby="preguntas-frecuentes-title">
          <div class="ba-inline-faq-head">
            <span class="eyebrow">Preguntas frecuentes</span>
            <h2 id="preguntas-frecuentes-title">Preguntas frecuentes</h2>
            <p>Primero aclaramos las dudas. Después activamos la estrategia con una receta digital pensada para tu negocio.</p>
          </div>
          <div class="ba-faq-accordion">
            ${faqs.map((faq, index) => `<details ${index === 0 ? 'open' : ''}><summary><h3>${escapeHtml(stripHtml(faq.q))}</h3></summary><div class="ba-faq-answer">${formatFaqAnswer(faq.a)}</div></details>`).join('')}
          </div>
        </section>`;
}

function formatFaqAnswer(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

function isFaqHeading(text = '') {
  const normalized = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.includes('preguntas frecuentes') || normalized.includes('faq') || normalized.includes('dudas frecuentes');
}

function postCategories(post) {
  const terms = post?._embedded?.['wp:term'];
  if (!Array.isArray(terms)) return [];
  return (terms[0] || [])
    .filter(cat => cat && cat.slug !== 'sin-categoria' && cat.slug !== 'uncategorized')
    .map(cat => stripHtml(cat.name || ''))
    .filter(Boolean);
}

function featuredImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  const sizes = media.media_details && media.media_details.sizes;
  const selected = sizes && (sizes.full || sizes.large || sizes.medium_large || sizes.medium);
  const url = selected?.source_url || media.source_url;
  if (!url) return null;
  return { url, alt: media.alt_text || stripHtml(post?.title?.rendered || '') || 'Imagen del artículo' };
}

function readingTime(html) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function sanitizeSlug(value = '') {
  return String(value).trim().replace(/^\/+|\/+$/g, '').split('/')[0].replace(/[^a-zA-Z0-9\-_]/g, '');
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
