(function fixServiceDetailContentPlacement() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;

  function moveLeadContentToSecondEditorialCard(secondCard) {
    const lead = document.querySelector('.service-detail-page .service-lead-content');
    if (!lead || !secondCard) return false;

    const html = lead.innerHTML.trim();
    const text = lead.textContent.trim();
    if (!html || !text) return false;

    const title = secondCard.querySelector('h2');
    const number = secondCard.querySelector(':scope > span');
    if (!title) return false;

    [...secondCard.children].forEach(child => {
      if (child !== number && child !== title) child.remove();
    });

    title.insertAdjacentHTML('afterend', html);
    lead.remove();
    return true;
  }

  function cardTitle(card, fallback) {
    const h2 = card ? card.querySelector('h2') : null;
    return h2 ? h2.textContent.trim() : fallback;
  }

  function cardBody(card) {
    if (!card) return '';
    const clone = card.cloneNode(true);
    clone.querySelector(':scope > .service-ficha-number')?.remove();
    clone.querySelector(':scope > span:not(.service-section-kicker)')?.remove();
    clone.querySelector(':scope > .service-section-kicker')?.remove();
    clone.querySelector('h2')?.remove();
    return clone.innerHTML.trim();
  }

  function activateAccordion(section) {
    const items = [...section.querySelectorAll('.service-menu-accordion-item')];
    const openItem = item => {
      items.forEach(other => {
        const isOpen = other === item;
        other.classList.toggle('is-open', isOpen);
        other.querySelector('button')?.setAttribute('aria-expanded', String(isOpen));
      });
    };

    items.forEach(item => {
      const btn = item.querySelector('button');
      if (!btn) return;

      btn.addEventListener('click', () => {
        const wasOpen = item.classList.contains('is-open');
        items.forEach(other => {
          other.classList.remove('is-open');
          other.querySelector('button')?.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });

      btn.addEventListener('mouseenter', () => openItem(item));
      btn.addEventListener('focus', () => openItem(item));
    });
  }

  function renderAccordionItem(item, index) {
    const titleId = `service-menu-accordion-title-${index}`;
    const panelId = `service-menu-accordion-panel-${index}`;
    return `
      <article class="service-menu-accordion-item">
        <button type="button" id="${titleId}" aria-expanded="false" aria-controls="${panelId}">
          <span class="service-menu-accordion-line" aria-hidden="true"></span>
          <span class="service-menu-accordion-title">${item.title}</span>
        </button>
        <div class="service-menu-accordion-content" id="${panelId}" role="region" aria-labelledby="${titleId}">
          <div class="service-menu-accordion-inner">${item.body}</div>
        </div>
      </article>
    `;
  }

  function buildAccordionStrategicBlock() {
    const contentGrid = document.querySelector('.service-detail-page .service-content-grid');
    const mainContent = document.querySelector('.service-detail-page .service-main-content');
    const editorialSplit = document.querySelector('.service-detail-page .service-editorial-split');
    const editorialCards = editorialSplit ? [...editorialSplit.querySelectorAll('.service-editorial-card')] : [];
    const sidebar = document.querySelector('.service-detail-page .service-sidebar');
    const sidebarCard = sidebar ? sidebar.querySelector('.service-sidebar-card') : null;

    if (!contentGrid || !mainContent || editorialCards.length < 2 || !sidebarCard) return false;
    if (document.querySelector('.service-detail-page .service-menu-accordion-section')) return true;

    const problemCard = editorialCards[0];
    const howCard = editorialCards[1];

    moveLeadContentToSecondEditorialCard(howCard);

    const items = [
      {
        title: cardTitle(sidebarCard, 'Qué miramos antes de darle al botón de anunciar'),
        body: cardBody(sidebarCard)
      },
      {
        title: cardTitle(howCard, 'Cómo lo trabajamos'),
        body: cardBody(howCard)
      },
      {
        title: cardTitle(problemCard, 'El problema que resolvemos'),
        body: cardBody(problemCard)
      }
    ].filter(item => item.title && item.body);

    const section = document.createElement('section');
    section.className = 'service-menu-accordion-section';
    section.innerHTML = `
      <div class="service-menu-accordion-media" aria-hidden="true"></div>
      <div class="service-menu-accordion-panel">
        <span class="service-menu-accordion-eyebrow">Servicio estratégico</span>
        <h3>Antes de mover ficha, miramos el terreno.</h3>
        <p class="service-menu-accordion-intro">Una lectura clara para entender qué necesita el negocio, qué canal tiene más sentido y cómo convertir la estrategia en oportunidades reales.</p>
        <div class="service-menu-accordion-list">
          ${items.map(renderAccordionItem).join('')}
        </div>
      </div>
    `;

    editorialSplit.remove();
    if (sidebar) sidebar.remove();
    mainContent.querySelector(':scope > .service-section-kicker')?.remove();

    const dynamicBlocks = mainContent.querySelector('.service-dynamic-blocks');
    if (dynamicBlocks) dynamicBlocks.prepend(section);
    else mainContent.append(section);

    contentGrid.classList.add('service-menu-accordion-layout');
    activateAccordion(section);
    return true;
  }

  function start() {
    if (buildAccordionStrategicBlock()) return;

    const observer = new MutationObserver(() => {
      if (buildAccordionStrategicBlock()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => observer.disconnect(), 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
