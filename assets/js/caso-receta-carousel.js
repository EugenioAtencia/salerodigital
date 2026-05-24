(() => {
  ensureCaseEnhancementStyles();

  const carousels = document.querySelectorAll('.caso-detail-content');

  carousels.forEach((carousel) => {
    if (carousel.dataset.recipeCarousel === 'ready') return;

    const allSections = Array.from(carousel.querySelectorAll(':scope > .caso-detail-section'));
    const cards = allSections
      .filter((card) => !card.classList.contains('caso-detail-list-section') && !card.classList.contains('caso-detail-section-metricas'))
      .slice(0, 4);

    const detailBody = carousel.closest('.caso-detail-body');
    const gallerySection = document.querySelector('.caso-gallery-section');
    let servicesBlock = null;

    const servicesSection = allSections.find((section) => section.classList.contains('caso-detail-section-servicios'));
    if (servicesSection) {
      const labels = Array.from(servicesSection.querySelectorAll('li'))
        .map((item) => item.textContent.trim())
        .filter(Boolean);

      if (labels.length) {
        servicesBlock = createServicesBlock(labels);
        const servicesAnchor = gallerySection || detailBody || carousel;
        servicesAnchor.insertAdjacentElement('afterend', servicesBlock);
      }

      servicesSection.remove();
    }

    const extraSections = allSections.filter((section) => !cards.includes(section) && section !== servicesSection && section.isConnected);

    if (extraSections.length) {
      const extraBlock = createExtraTextBlock(extraSections);
      extraSections.forEach((section) => section.remove());
      if (extraBlock) {
        const extraAnchor = servicesBlock || gallerySection || detailBody || carousel;
        extraAnchor.insertAdjacentElement('afterend', extraBlock);
      }
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

  function ensureCaseEnhancementStyles() {
    const styles = [
      ['/assets/css/caso-servicios.css?v=4', 'casoServicesCss'],
      ['/assets/css/caso-extra-gallery.css?v=2', 'casoExtraGalleryCss']
    ];

    styles.forEach(([href, key]) => {
      if (document.querySelector(`link[data-${key}]`) || document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset[key] = 'true';
      document.head.appendChild(link);
    });
  }

  function createServicesBlock(labels) {
    const section = document.createElement('section');
    section.className = 'caso-services-section';
    section.setAttribute('aria-label', 'Servicios trabajados');

    section.innerHTML = `
      <div class="container caso-services-inner">
        <h2>Servicios trabajados</h2>
        <div class="caso-services-grid">
          ${labels.map((label) => {
            const key = serviceKey(label);
            return `
              <article class="caso-service-item caso-service-${key}" title="${escapeHtml(label)}">
                <div class="caso-service-icon" aria-hidden="true">${serviceIcon(key)}</div>
                <span>${escapeHtml(serviceLabel(label))}</span>
              </article>
            `;
          }).join('')}
        </div>
      </div>
    `;

    return section;
  }

  function createExtraTextBlock(sections) {
    const groups = sections.map((section) => {
      const title = section.querySelector('h3')?.textContent.trim() || '';
      const metricArticles = Array.from(section.querySelectorAll('.caso-metric'));
      let items = [];

      if (section.classList.contains('caso-detail-section-metricas') && metricArticles.length) {
        items = metricArticles.map((metric) => Array.from(metric.querySelectorAll('strong, span, p'))
          .map((node) => node.textContent.trim())
          .filter(Boolean)
          .join('. ')
          .replace(/\.+/g, '.')
          .trim()
        ).filter(Boolean);
      } else {
        items = Array.from(section.querySelectorAll('li'))
          .map((item) => item.textContent.trim())
          .filter(Boolean);

        if (!items.length) {
          items = Array.from(section.querySelectorAll('p'))
            .map((item) => item.textContent.trim())
            .filter(Boolean);
        }
      }

      return { title, items };
    }).filter((group) => group.title && group.items.length);

    if (!groups.length) return null;

    const section = document.createElement('section');
    section.className = 'caso-extra-text-section';
    section.setAttribute('aria-label', 'Información técnica del caso');
    section.innerHTML = `
      <div class="container caso-extra-text-inner">
        ${groups.map((group) => `
          <div class="caso-extra-text-group">
            <h2>${escapeHtml(group.title)}</h2>
            <p>${group.items.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</p>
          </div>
        `).join('')}
      </div>
    `;
    return section;
  }

  function serviceKey(label) {
    const key = normalize(label);

    if (key === 'web' || key.includes('desarrollo web') || key.includes('pagina web') || key.includes('ecommerce') || key.includes('tienda online')) return 'web';
    if (key === 'seo' || key.includes('posicionamiento') || key.includes('google maps') || key.includes('seo local')) return 'seo';
    if (key.includes('publicidad') || key.includes('ads') || key.includes('adwords') || key.includes('google ads') || key.includes('meta ads') || key.includes('campana')) return 'publicidad-digital';
    if (key.includes('redes') || key.includes('social') || key.includes('instagram') || key.includes('facebook') || key.includes('tiktok') || key.includes('linkedin')) return 'redes-sociales';
    if (key.includes('contenido') || key.includes('copy') || key.includes('storytelling') || key.includes('creatividad') || key.includes('comunicacion')) return 'contenido';
    if (key.includes('email') || key.includes('mailing') || key.includes('newsletter') || key.includes('mailchimp')) return 'email-marketing';
    if (key === 'sms' || key.includes('sms')) return 'sms';
    if (key.includes('whatsapp') || key.includes('wasap')) return 'whatsapp';
    if (key.includes('automatizacion') || key.includes('automatismo') || key.includes('zapier') || key.includes('flujo')) return 'automatizacion';
    if (key.includes('analitica') || key.includes('analytics') || key.includes('datos') || key.includes('medicion') || key.includes('tracking')) return 'analitica';
    if (key.includes('streaming') || key.includes('directo') || key.includes('live') || key.includes('retransmision')) return 'streaming';
    if (key.includes('soporte') || key.includes('mantenimiento') || key.includes('tecnico') || key.includes('acompanamiento')) return 'soporte-tecnico';

    return 'generico';
  }

  function serviceLabel(label) {
    const labels = {
      web: 'web',
      seo: 'seo',
      'publicidad-digital': 'ads',
      'redes-sociales': 'redes',
      contenido: 'contenido',
      'email-marketing': 'email',
      sms: 'sms',
      whatsapp: 'whatsapp',
      automatizacion: 'automatización',
      analitica: 'analítica',
      streaming: 'streaming',
      'soporte-tecnico': 'soporte'
    };

    return labels[serviceKey(label)] || String(label || '').trim();
  }

  function serviceIcon(key) {
    if (key && key !== 'generico') {
      return `<img src="/assets/svg/casos/${key}.svg" alt="" loading="lazy" style="width:100%;height:100%;display:block;object-fit:contain;">`;
    }

    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="36" height="36" rx="11" stroke="currentColor" stroke-width="3.4"/><path d="M22 38c6-14 14-14 22 0M24 25h16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>`;
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
