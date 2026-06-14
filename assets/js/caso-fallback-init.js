(() => {
  const root = document.querySelector('#caso-detalle-root');
  if (!root) return;

  function normalize(value = '') {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function prepareFallbackLayout() {
    const content = document.querySelector('.caso-detail-content');
    if (!content || content.dataset.fallbackPrepared === 'true') return false;

    const sections = Array.from(content.querySelectorAll(':scope > .caso-detail-section'));
    if (!sections.length) return false;

    sections.forEach((section, index) => {
      const title = normalize(section.querySelector('h3')?.textContent || '');

      if (index < 4 && !section.querySelector('.caso-section-number')) {
        const number = document.createElement('span');
        number.className = 'caso-section-number';
        number.textContent = `0${index + 1}`;
        section.prepend(number);
      }

      if (title.includes('servicios trabajados')) {
        section.classList.add('caso-detail-list-section', 'caso-detail-section-servicios');
      }

      if (title.includes('herramientas usadas')) {
        section.classList.add('caso-detail-list-section', 'caso-detail-section-herramientas');
      }
    });

    const fallbackMedia = document.querySelector('.caso-detail-media .caso-detail-media-fallback');
    if (fallbackMedia) {
      const mediaCard = fallbackMedia.closest('.caso-detail-media');
      const heroGrid = fallbackMedia.closest('.caso-detail-hero-grid');
      if (mediaCard) mediaCard.remove();
      if (heroGrid) heroGrid.classList.add('is-no-media');
    }

    content.dataset.fallbackPrepared = 'true';
    loadRecipeCarousel();
    return true;
  }

  function loadRecipeCarousel() {
    if (document.querySelector('script[data-fallback-recipe-carousel]')) return;
    const script = document.createElement('script');
    script.src = '/assets/js/caso-receta-carousel.js?v=9';
    script.defer = true;
    script.dataset.fallbackRecipeCarousel = 'true';
    document.body.appendChild(script);
  }

  if (prepareFallbackLayout()) return;

  const observer = new MutationObserver(() => {
    if (prepareFallbackLayout()) observer.disconnect();
  });

  observer.observe(root, { childList: true, subtree: true });
})();
