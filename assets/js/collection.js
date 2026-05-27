async function renderCollectionPage() {
  const root = document.querySelector('[data-collection]');
  if (!root) return;

  const endpoint = root.dataset.endpoint;
  const basePath = root.dataset.basePath || '';
  const label = root.dataset.label || '';

  root.innerHTML = '<div class="loading">Cargando contenido desde el CMS...</div>';

  try {
    const items = await getCollection(endpoint);

    if (!items.length) {
      root.innerHTML = '<div class="empty">Todavía no hay contenidos publicados.</div>';
      return;
    }

    root.innerHTML = items.map(item => renderCard(item, basePath, collectionCardLabel(item, basePath, label))).join('');
  } catch (error) {
    console.error('Error cargando colección:', error);
    root.innerHTML = `<div class="error">No se pudo cargar esta sección desde WordPress. Revisa el endpoint <strong>${escapeHtml(endpoint)}</strong>.</div>`;
  }
}

function collectionCardLabel(item = {}, basePath = '', fallback = '') {
  const path = String(basePath || '').replace(/\/$/, '');
  if (path !== '/el-menu') return fallback;

  const slug = String(item.slug || '').toLowerCase();
  const title = item && item.title && item.title.rendered ? stripHtml(item.title.rendered).toLowerCase() : '';
  const text = `${slug} ${title}`;

  if (text.includes('empujon') || text.includes('empujón') || text.includes('ads') || text.includes('campana') || text.includes('campaña')) return 'Campañas Ads';
  if (text.includes('gracia') || text.includes('presencia') || text.includes('social') || text.includes('contenido')) return 'Social Media y contenido';
  if (text.includes('pregonero') || text.includes('seo') || text.includes('posicionamiento')) return 'SEO local';
  if (text.includes('cimientos') || text.includes('web') || text.includes('desarrollo')) return 'Desarrollo web';

  return fallback || 'Servicio digital';
}

document.addEventListener('DOMContentLoaded', renderCollectionPage);
