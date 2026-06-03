(function fixServiceDetailContentPlacement() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;

  function setFichaNumber(card, number) {
    if (!card) return;

    let badge = card.querySelector(':scope > .service-ficha-number');

    if (!badge) {
      const firstSpan = card.querySelector(':scope > span:not(.service-section-kicker)');
      if (firstSpan) {
        badge = firstSpan;
        badge.classList.add('service-ficha-number');
      } else {
        badge = document.createElement('span');
        badge.className = 'service-ficha-number';
        card.prepend(badge);
      }
    }

    badge.textContent = number;
  }

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

  function buildThreeStrategicCards() {
    const contentGrid = document.querySelector('.service-detail-page .service-content-grid');
    const mainContent = document.querySelector('.service-detail-page .service-main-content');
    const editorialSplit = document.querySelector('.service-detail-page .service-editorial-split');
    const editorialCards = editorialSplit ? [...editorialSplit.querySelectorAll('.service-editorial-card')] : [];
    const sidebar = document.querySelector('.service-detail-page .service-sidebar');
    const sidebarCard = sidebar ? sidebar.querySelector('.service-sidebar-card') : null;

    if (!contentGrid || !mainContent || editorialCards.length < 2 || !sidebarCard) return false;
    if (document.querySelector('.service-detail-page .service-three-card-grid')) return true;

    const problemCard = editorialCards[0];
    const howCard = editorialCards[1];

    moveLeadContentToSecondEditorialCard(howCard);

    setFichaNumber(sidebarCard, '01');
    setFichaNumber(howCard, '02');
    setFichaNumber(problemCard, '03');

    sidebarCard.classList.add('service-ficha-card', 'service-ficha-card-cata');
    howCard.classList.add('service-ficha-card', 'service-ficha-card-how');
    problemCard.classList.add('service-ficha-card', 'service-ficha-card-problem');

    const grid = document.createElement('div');
    grid.className = 'service-three-card-grid';
    grid.append(sidebarCard, howCard, problemCard);

    const section = document.createElement('section');
    section.className = 'service-three-card-section';
    section.append(grid);

    editorialSplit.remove();
    if (sidebar) sidebar.remove();

    const dynamicBlocks = mainContent.querySelector('.service-dynamic-blocks');
    if (dynamicBlocks) dynamicBlocks.prepend(section);
    else mainContent.append(section);

    contentGrid.classList.add('service-three-card-layout');
    return true;
  }

  function start() {
    if (buildThreeStrategicCards()) return;

    const observer = new MutationObserver(() => {
      if (buildThreeStrategicCards()) observer.disconnect();
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
