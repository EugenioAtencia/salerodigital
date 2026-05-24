(() => {
  ensureServicesStyles();

  const carousels = document.querySelectorAll('.caso-detail-content');

  carousels.forEach((carousel) => {
    if (carousel.dataset.recipeCarousel === 'ready') return;

    const allSections = Array.from(carousel.querySelectorAll(':scope > .caso-detail-section'));
    const cards = allSections
      .filter((card) => !card.classList.contains('caso-detail-list-section') && !card.classList.contains('caso-detail-section-metricas'))
      .slice(0, 4);

    const servicesSection = allSections.find((section) => section.classList.contains('caso-detail-section-servicios'));
    if (servicesSection) {
      const labels = Array.from(servicesSection.querySelectorAll('li'))
        .map((item) => item.textContent.trim())
        .filter(Boolean);

      if (labels.length) {
        const servicesBlock = createServicesBlock(labels);
        const detailBody = carousel.closest('.caso-detail-body');
        if (detailBody) detailBody.insertAdjacentElement('afterend', servicesBlock);
        else carousel.insertAdjacentElement('afterend', servicesBlock);
      }

      servicesSection.remove();
    }

    const extraSections = allSections.filter((section) => !cards.includes(section) && section !== servicesSection && section.isConnected);

    if (extraSections.length) {
      const extraWrap = document.createElement('div');
      extraWrap.className = 'caso-detail-extra';
      extraWrap.setAttribute('aria-label', 'Información complementaria del caso');
      extraSections.forEach((section) => extraWrap.appendChild(section));
      carousel.insertAdjacentElement('afterend', extraWrap);
    }

    if (cards.length < 2) return;
    carousel.dataset.recipeCarousel = 'ready';

    cards.forEach((card, index) => {
      card.dataset.recipeIndex = String(index);
      card.tabIndex = 0;
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `Paso ${index + 1} de ${cards.length}`);
    });

    const controls = document.createElement('div');
    controls.className = 'caso-recipe-controls';
    controls.innerHTML = `
      <button class="caso-recipe-control" type="button" data-recipe-prev aria-label="Ver ficha anterior">‹</button>
      <div class="caso-recipe-dots" aria-label="Navegación de fichas"></div>
      <button class="caso-recipe-control" type="button" data-recipe-next aria-label="Ver ficha siguiente">›</button>
    `;

    carousel.insertAdjacentElement('afterend', controls);

    const dotsWrap = controls.querySelector('.caso-recipe-dots');
    const dots = cards.map((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'caso-recipe-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ir a la ficha ${index + 1}`);
      dot.addEventListener('click', () => activate(index, true));
      dotsWrap.appendChild(dot);
      return dot;
    });

    let active = -1;

    function activate(index, shouldScroll = false) {
      active = (index + cards.length) % cards.length;
      carousel.classList.add('has-active');

      cards.forEach((card, cardIndex) => {
        const isActive = cardIndex === active;
        card.classList.toggle('is-active', isActive);
        card.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === active);
      });

      if (shouldScroll && window.matchMedia('(max-width: 1180px)').matches) {
        cards[active].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    function reset() {
      active = -1;
      carousel.classList.remove('has-active');
      cards.forEach((card) => {
        card.classList.remove('is-active');
        card.removeAttribute('aria-current');
      });
      dots.forEach((dot) => dot.classList.remove('is-active'));
    }

    controls.querySelector('[data-recipe-prev]').addEventListener('click', () => activate(active < 0 ? cards.length - 1 : active - 1, true));
    controls.querySelector('[data-recipe-next]').addEventListener('click', () => activate(active < 0 ? 0 : active + 1, true));

    cards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => activate(index, false));
      card.addEventListener('focus', () => activate(index, false));
      card.addEventListener('click', () => activate(index, true));
    });

    carousel.addEventListener('mouseleave', reset);
    reset();
  });

  function ensureServicesStyles() {
    if (document.querySelector('link[data-caso-services-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/caso-servicios.css?v=1';
    link.dataset.casoServicesCss = 'true';
    document.head.appendChild(link);
  }

  function createServicesBlock(labels) {
    const section = document.createElement('section');
    section.className = 'caso-services-section';
    section.setAttribute('aria-label', 'Servicios trabajados');

    section.innerHTML = `
      <div class="container caso-services-inner">
        <h2>Servicios trabajados</h2>
        <div class="caso-services-grid">
          ${labels.map((label) => `
            <article class="caso-service-item caso-service-${serviceKey(label)}">
              <div class="caso-service-icon" aria-hidden="true">${serviceIcon(label)}</div>
              <span>${escapeHtml(label)}</span>
            </article>
          `).join('')}
        </div>
      </div>
    `;

    return section;
  }

  function serviceKey(label) {
    const key = normalize(label);
    if (key.includes('web') || key.includes('ecommerce') || key.includes('pagina')) return 'web';
    if (key.includes('contenido') || key.includes('copy') || key.includes('comunicacion')) return 'contenido';
    if (key.includes('analitica') || key.includes('analytics') || key.includes('datos')) return 'analitica';
    if (key.includes('streaming') || key.includes('directo') || key.includes('video')) return 'streaming';
    if (key.includes('soporte') || key.includes('mantenimiento') || key.includes('acompanamiento')) return 'soporte';
    return 'generico';
  }

  function serviceIcon(label) {
    const key = serviceKey(label);
    const icons = {
      web: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="36" stroke="currentColor" stroke-width="4"/><path d="M12 48h72M48 12c11 10 17 22 17 36S59 74 48 84M48 12C37 22 31 34 31 48s6 26 17 36M20 29c8 5 18 8 28 8s20-3 28-8M20 67c8-5 18-8 28-8s20 3 28 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
      contenido: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 14h36l16 16v50H22V14Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M58 14v18h16M32 32h18M32 44h30" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="30" y="56" width="22" height="16" rx="2" stroke="currentColor" stroke-width="4"/><path d="m58 70 18-18 8 8-18 18-10 2 2-10Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="m36 60 8 4-8 4v-8Z" fill="currentColor"/></svg>`,
      analitica: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 78h12V48H16v30ZM42 78h12V34H42v44ZM68 78h12V42H68v36Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M18 36 38 20l22 20 18-24" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="36" r="5" fill="currentColor"/><circle cx="38" cy="20" r="5" fill="currentColor"/><circle cx="60" cy="40" r="5" fill="currentColor"/><circle cx="78" cy="16" r="5" fill="currentColor"/></svg>`,
      streaming: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="20" width="60" height="42" rx="5" stroke="currentColor" stroke-width="4"/><path d="M42 32v18l16-9-16-9Z" fill="currentColor"/><path d="M26 52h32M66 52h4M30 74h36M38 62l-4 12M58 62l4 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
      soporte: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 54v-9c0-17 12-31 28-31s28 14 28 31v9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M20 54c-6 0-10 5-10 12s4 12 10 12h8V54h-8ZM76 54c6 0 10 5 10 12s-4 12-10 12h-8V54h8Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M63 78c0 6-5 10-11 10h-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="48" r="10" stroke="currentColor" stroke-width="4"/><path d="M48 31v7M48 58v7M31 48h7M58 48h7M36 36l5 5M55 55l5 5M60 36l-5 5M41 55l-5 5" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
      generico: `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="18" width="60" height="60" rx="18" stroke="currentColor" stroke-width="4"/><path d="M32 58c8-18 20-18 32 0M34 36h28" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`
    };
    return icons[key] || icons.generico;
  }

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    }[char]));
  }
})();
