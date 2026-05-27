import { handleBlogPostRequest } from '../_shared/blog-renderer.js';
import { renderJsonLd, schemaGraph, organizationSchema, websiteSchema, webPageSchema, breadcrumbSchema, blogPostingSchema, SITE_ORIGIN } from '../_shared/schema.js';

export async function onRequest(context) {
  const response = await handleBlogPostRequest(context);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  if (html.includes('id="salero-schema-graph"') || html.includes("id='salero-schema-graph'")) {
    return new Response(html, response);
  }

  const requestUrl = new URL(context.request.url);
  const schema = schemaForBlogArticle(requestUrl.pathname, html);
  if (!schema) return new Response(html, response);

  const jsonLd = renderJsonLd(schema);
  const nextHtml = html.includes('</head>')
    ? html.replace('</head>', `  ${jsonLd}\n</head>`)
    : `${html}\n${jsonLd}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function schemaForBlogArticle(pathname = '/', html = '') {
  const match = normalizePath(pathname).match(/^\/la-rebotica\/([^/]+)\/$/);
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

  return schemaGraph([
    organizationSchema(),
    websiteSchema(),
    webPageSchema({
      url: canonical,
      name: title,
      description,
      type: 'WebPage',
      primaryImage: image,
      datePublished,
      dateModified: datePublished
    }),
    breadcrumbSchema([
      { name: 'Inicio', url: '/' },
      { name: 'La Rebotica', url: '/la-rebotica/' },
      { name: title, url: canonical }
    ]),
    blogPostingSchema({
      title,
      description,
      url: canonical,
      image: image ? { url: image } : null,
      categories,
      content: articleText,
      faqs
    })
  ]);
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
  const re = new RegExp(`<meta[^>]+${attr}=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const match = String(html).match(re);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractDatetime(html = '') {
  const match = String(html).match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : undefined;
}

function extractArticleText(html = '') {
  const match = String(html).match(/<div class=["']ba-content["'][^>]*>([\s\S]*?)<\/div>\s*(?:<section class=["']ba-inline-faq|<\/div>\s*<\/div>\s*<\/section>)/i);
  return stripHtml(match ? match[1] : html);
}

function extractHeroTags(html = '') {
  const block = String(html).match(/<div class=["']ba-hero-tags["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!block) return [];
  return [...block[1].matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)].map((item) => stripHtml(item[1])).filter(Boolean);
}

function extractFaqs(html = '') {
  const block = String(html).match(/<div class=["']ba-faq-accordion["'][^>]*>([\s\S]*?)<\/div>\s*<\/section>/i);
  if (!block) return [];

  return [...block[1].matchAll(/<details[^>]*>[\s\S]*?<summary>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/summary>[\s\S]*?<div class=["']ba-faq-answer["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/details>/gi)]
    .map((match) => ({ q: stripHtml(match[1]), a: stripHtml(match[2]) }))
    .filter((item) => item.q && item.a);
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
