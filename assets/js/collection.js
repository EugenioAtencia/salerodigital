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

    root.innerHTML = items.map(item => renderCard(item, basePath, label)).join('');
  } catch (error) {
    console.error('Error cargando colección:', error);
    root.innerHTML = `<div class="error">No se pudo cargar esta sección desde WordPress. Revisa el endpoint <strong>${escapeHtml(endpoint)}</strong>.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', renderCollectionPage);
