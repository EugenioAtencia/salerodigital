import { handleBlogPostRequest } from '../_shared/blog-renderer.js';

const SITE_ORIGIN = 'https://salero.webagencia360.com';
const ORG_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

export async function onRequest(context) {
  const response = await handleBlogPostRequest(context);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  if (html.includes('application/ld+json') || html.includes('salero-schema-graph')) {
    return cloneHtmlResponse(html, response);
  }

  const requestUrl = new URL(context.request.url);
  const schema = buildBlogArticleSchema(requestUrl.pathname, html);

  if (!schema) return cloneHtmlResponse(html, response);

  const nextHtml = injectSchema(html, schema);
  return cloneHtmlResponse(nextHtml, response);
}

function buildBlogArticleSchema(pathname = '/', html = '') {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/la-rebotica\/([^/]+)\/$/);
  if (!match) return null;

  const slug = match[1];
  const canonical = `${SITE_ORIGIN}/la-rebotica/${slug}/`;
  const title = cleanTitle(extractTitle(html));
  const description = extractMeta(html, 'description');
  const image = extractMeta(html, 'og:image', 'property');
  const datePublished = extractDatetime(html);
  const articleText = extractArticleText(html);
  const categories = extractHeroTags(html);
  const faqs = extractFaqs(html);

  if (!title) return null;

  return cleanSchema({
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(),
      websiteSchema(),
      webPageSchema({ canonical, title, description, image, datePublished }),
      breadcrumbSchema([
        { name: 'Inicio', url: `${SITE_ORIGIN}/` },
        { name: 'La Rebotica', url: `${SITE_ORIGIN}/la-rebotica/` },
        { name: title, url: canonical }
      ]),
      blogPostingSchema({ canonical, title, description, image, datePublished, categories, articleText }),
      faqSchema({ canonical, faqs })
    ].filter(Boolean)
  });
}

function organizationSchema() {
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: 'Salero Digital',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/assets/img/favicon.svg`,
    image: `${SITE_ORIGIN}/assets/img/favicon.svg`,
    slogan: 'Tu marca, con salero',
    description: 'Agencia digital para negocios locales que necesitan estrategia, desarrollo web, SEO, redes sociales y campañas con criterio comercial.',
    telephone: '+34665688916',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Morón de la Frontera',
      addressRegion: 'Sevilla',
      addressCountry: 'ES'
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Morón de la Frontera' },
      { '@type': 'AdministrativeArea', name: 'Sierra Sur de Sevilla' },
      { '@type': 'AdministrativeArea', name: 'Campiña de Sevilla' },
      { '@type': 'AdministrativeArea', name: 'Andalucía' }
    ]
  };
}

function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Salero Digital',
    url: SITE_ORIGIN,
    inLanguage: 'es-ES',
    publisher: { '@id': ORG_ID }
  };
}

function webPageSchema({ canonical, title, description, image, datePublished }) {
  return {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: 'es-ES',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
    datePublished,
    dateModified: datePublished
  };
}

function breadcrumbSchema(items = []) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${items[items.length - 1]?.url || SITE_ORIGIN}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function blogPostingSchema({ canonical, title, description, image, datePublished, categories, articleText }) {
  return {
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    mainEntityOfPage: { '@id': `${canonical}#webpage` },
    headline: title,
    description,
    image: image ? [image] : undefined,
    datePublished,
    dateModified: datePublished,
    inLanguage: 'es-ES',
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    articleSection: categories,
    keywords: categories,
    wordCount: articleText ? articleText.split(/\s+/).filter(Boolean).length : undefined,
    url: canonical
  };
}

function faqSchema({ canonical, faqs = [] }) {
  if (!Array.isArray(faqs) || !faqs.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a
      }
    }))
  };
}

function injectSchema(html = '', schema) {
  const json = JSON.stringify(cleanSchema(schema))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const script = `<script id="salero-schema-graph" type="application/ld+json">${json}</script>`;
  return html.includes('</head>') ? html.replace('</head>', `  ${script}\n</head>`) : `${html}\n${script}`;
}

function cloneHtmlResponse(html, response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function normalizePath(pathname = '/') {
  const clean = String(pathname || '/').split('?')[0].split('#')[0];
  if (clean === '/') return '/';
  return `/${clean.replace(/^\/+|\/+$/g, '')}/`;
}

function extractTitle(html = '') {
  const h1 = String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripHtml(h1[1]);

  const title = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripHtml(title[1]) : '';
}

function cleanTitle(value = '') {
  return String(value || '').replace(/\s*\|\s*La Rebotica\s*\|\s*Salero Digital\s*$/i, '').trim();
}

function extractMeta(html = '', name = '', attr = 'name') {
  const source = String(html || '');
  const direct = new RegExp(`<meta[^>]+${attr}=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escapeRegExp(name)}["'][^>]*>`, 'i');
  const match = source.match(direct) || source.match(reversed);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractDatetime(html = '') {
  const match = String(html || '').match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : undefined;
}

function extractArticleText(html = '') {
  const match = String(html || '').match(/<div class=["']ba-content["'][^>]*>([\s\S]*?)<\/div>\s*(?:<section class=["']ba-inline-faq|<\/div>\s*<\/div>\s*<\/section>)/i);
  return stripHtml(match ? match[1] : html);
}

function extractHeroTags(html = '') {
  const block = String(html || '').match(/<div class=["']ba-hero-tags["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!block) return [];

  return [...block[1].matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)]
    .map((item) => stripHtml(item[1]))
    .filter(Boolean);
}

function extractFaqs(html = '') {
  const block = String(html || '').match(/<div class=["']ba-faq-accordion["'][^>]*>([\s\S]*?)<\/div>\s*<\/section>/i);
  if (!block) return [];

  return [...block[1].matchAll(/<details[^>]*>[\s\S]*?<summary>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/summary>[\s\S]*?<div class=["']ba-faq-answer["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/details>/gi)]
    .map((match) => ({ q: stripHtml(match[1]), a: stripHtml(match[2]) }))
    .filter((item) => item.q && item.a);
}

function cleanSchema(value) {
  if (Array.isArray(value)) {
    return value.map(cleanSchema).filter((item) => item !== undefined && item !== null && !(Array.isArray(item) && !item.length));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanSchema(item)])
        .filter(([, item]) => {
          if (item === undefined || item === null || item === '') return false;
          if (Array.isArray(item) && !item.length) return false;
          if (typeof item === 'object' && !Array.isArray(item) && !Object.keys(item).length) return false;
          return true;
        })
    );
  }

  return value;
}

function stripHtml(value = '') {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeEntities(value = '') {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
