import { handleSectorRequest } from './sector-renderer.js';

export async function handleSectorStoryRequest(context) {
  const response = await handleSectorRequest(context);
  const contentType = response.headers.get('Content-Type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const transformed = transformSectorStoryHtml(html);
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');

  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function transformSectorStoryHtml(html) {
  let output = html;

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=4">',
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=5">\n  <link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=2">'
  );

  output = output.replace(
    /<div class="sector-rich-content sector-lead-content">([\s\S]*?)<\/div>\s*<div class="sector-editorial-split">/,
    (_, leadHtml) => `${renderQuoteBlock(leadHtml)}\n          <div class="sector-editorial-split">`
  );

  return output;
}

function renderQuoteBlock(leadHtml) {
  const quote = stripHtml(leadHtml).trim();

  if (!quote) return '';

  return `<figure class="sector-story-quote">\n            <cite>${escapeHtml(quote)}</cite>\n          </figure>`;
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
