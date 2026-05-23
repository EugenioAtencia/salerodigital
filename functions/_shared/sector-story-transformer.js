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
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=6">\n  <link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=4">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=5">',
    '<link rel="stylesheet" href="/assets/css/sector-detail.css?v=6">\n  <link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=4">'
  );

  output = output.replace(
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=3">',
    '<link rel="stylesheet" href="/assets/css/sector-story-layout.css?v=4">'
  );

  const imageUrl = extractHeroImage(output);

  output = output.replace(
    /<div class="container sector-content-grid">\s*<article class="sector-main-content">\s*(<span class="sector-section-kicker">[\s\S]*?<\/span>)\s*<div class="sector-rich-content sector-lead-content">([\s\S]*?)<\/div>\s*(<div class="sector-editorial-split">[\s\S]*?<\/div>)\s*<\/article>\s*(<aside class="sector-sidebar">[\s\S]*?<\/aside>)\s*<\/div>/,
    (_, kickerHtml, leadHtml, editorialHtml, sidebarHtml) => renderStorySection({ kickerHtml, leadHtml, editorialHtml, sidebarHtml, imageUrl })
  );

  return output;
}

function renderStorySection({ kickerHtml, leadHtml, editorialHtml, sidebarHtml, imageUrl }) {
  const quote = stripHtml(leadHtml).trim();
  const safeImage = escapeAttr(imageUrl || '/assets/img/hosteleria-hero-poster.webp');
  const photoGrid = renderPhotoGrid(safeImage);

  return `<div class="container sector-story-container">
        <article class="sector-main-content">
          ${kickerHtml}
          <div class="sector-story-top">
            <figure class="sector-story-quote">
              <cite>${escapeHtml(quote)}</cite>
            </figure>
            ${sidebarHtml}
            ${photoGrid}
          </div>
          ${editorialHtml}
        </article>
      </div>`;
}

function renderPhotoGrid(imageUrl) {
  return `<div class="sector-photo-grid" aria-hidden="true">
              <figure class="sector-photo-tile sector-photo-small"><img src="${imageUrl}" alt="" loading="lazy"></figure>
              <figure class="sector-photo-tile sector-photo-small sector-photo-offset"><img src="${imageUrl}" alt="" loading="lazy"></figure>
              <figure class="sector-photo-tile sector-photo-large"><img src="${imageUrl}" alt="" loading="lazy"></figure>
            </div>`;
}

function extractHeroImage(html = '') {
  const posterMatch = html.match(/<video[^>]*poster="([^"]+)"/i);
  if (posterMatch && posterMatch[1]) return posterMatch[1];

  const imageMatch = html.match(/<img class="sector-detail-hero-image"[^>]*src="([^"]+)"/i);
  if (imageMatch && imageMatch[1]) return imageMatch[1];

  return '/assets/img/hosteleria-hero-poster.webp';
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

function escapeAttr(value = '') {
  return escapeHtml(value);
}
