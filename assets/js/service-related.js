const SALERO_SERVICE_RELATED = [
  {
    slug: 'el-empujon',
    label: 'Campañas Ads',
    title: 'El Empujón',
    text: 'Cuando tu negocio necesita visibilidad, tráfico o contactos, le damos el empujón que hace falta.'
  },
  {
    slug: 'gracia-y-presencia',
    label: 'Social Media y contenido',
    title: 'Gracia y Presencia',
    text: 'No se trata de publicar por publicar. Se trata de crear una presencia que la gente recuerde.'
  },
  {
    slug: 'el-pregonero',
    label: 'SEO local',
    title: 'El Pregonero',
    text: 'Hacemos que te encuentren los que te buscan y también los que todavía no saben que te necesitan.'
  },
  {
    slug: 'cimientos-digitales',
    label: 'Desarrollo web',
    title: 'Cimientos Digitales',
    text: 'No hacemos paginitas. Construimos la sede central de tu empresa en internet.'
  }
];

function saleroCurrentServiceSlug() {
  const root = document.querySelector('[data-detail][data-type="servicio"]');
  if (root && root.dataset.slug) return root.dataset.slug;
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'el-menu' ? parts[1] || '' : '';
}

function saleroRelatedServiceCard(item) {
  return `<article class="card service-related-card">
    <span class="tag">${item.label}</span>
    <h3>${item.title}</h3>
    <p>${item.text}</p>
    <a class="card-link" href="/el-menu/${item.slug}/" aria-label="Ver más sobre ${item.title}">Ver más</a>
  </article>`;
}

function saleroInjectRelatedServices() {
  if (document.querySelector('.service-related-section')) return true;

  const root = document.querySelector('.service-detail-root, [data-detail][data-type="servicio"]');
  const faq = document.querySelector('.service-faq-block');
  if (!root || !faq) return false;

  const current = saleroCurrentServiceSlug();
  const related = SALERO_SERVICE_RELATED.filter(item => item.slug !== current).slice(0, 3);
  if (!related.length) return false;

  const section = document.createElement('section');
  section.className = 'service-related-section';
  section.innerHTML = `<div class="cards-grid service-related-grid">
      ${related.map(saleroRelatedServiceCard).join('')}
    </div>`;

  faq.insertAdjacentElement('afterend', section);
  return true;
}

function saleroInitRelatedServices() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;
  if (saleroInjectRelatedServices()) return;

  const observer = new MutationObserver(() => {
    if (saleroInjectRelatedServices()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setTimeout(() => observer.disconnect(), 7000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', saleroInitRelatedServices);
} else {
  saleroInitRelatedServices();
}
