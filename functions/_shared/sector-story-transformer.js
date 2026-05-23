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
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=6">\n  <link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=6">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=5">',
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=6">\n  <link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=6">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=3">',
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=6">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=4">',
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=6">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=5">',
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=6">'
  );

  output = output.replace(
    /<div class="container sector-content-grid">\s*<article class="sector-main-content">\s*(<span class="sector-section-kicker">[\s\S]*?<\/span>)\s*<div class="sector-rich-content sector-lead-content">([\s\S]*?)<\/div>\s*(<div class="sector-editorial-split">[\s\S]*?<\/div>)\s*<\/article>\s*(<aside class="sector-sidebar">[\s\S]*?<\/aside>)\s*<\/div>/,
    (_, kickerHtml, leadHtml, editorialHtml, sidebarHtml) => renderStorySection({ kickerHtml, leadHtml, editorialHtml: transformEditorialCards(editorialHtml), sidebarHtml })
  );

  return output;
}

function renderStorySection({ kickerHtml, leadHtml, editorialHtml, sidebarHtml }) {
  const quote = stripHtml(leadHtml).trim();

  return `<div class="container sector-story-container">
        <article class="sector-main-content">
          ${kickerHtml}
          <div class="sector-story-top">
            <figure class="sector-story-quote">
              <cite>${escapeHtml(quote)}</cite>
            </figure>
            ${sidebarHtml}
          </div>
          ${editorialHtml}
        </article>
      </div>`;
}

function transformEditorialCards(editorialHtml = '') {
  return String(editorialHtml).replace(
    /<article class="sector-editorial-card ([^"]+)">\s*<span>([\s\S]*?)<\/span>\s*<h2>([\s\S]*?)<\/h2>\s*([\s\S]*?)\s*<\/article>/g,
    (_, cardClass, numberHtml, titleHtml, bodyHtml) => `<article class="sector-editorial-card ${cardClass}">
              <div class="sector-editorial-copy">
                <span>${numberHtml}</span>
                <h2>${titleHtml}</h2>
                ${bodyHtml.trim()}
              </div>
            </article>`
  );
}

function stripHtml(value = '') {
  return String(value || '')
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
