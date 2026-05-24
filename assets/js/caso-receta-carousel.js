(() => {
  const carousels = document.querySelectorAll('.caso-detail-content');

  carousels.forEach((carousel) => {
    if (carousel.dataset.recipeCarousel === 'ready') return;

    const allSections = Array.from(carousel.querySelectorAll(':scope > .caso-detail-section'));
    const cards = allSections
      .filter((card) => !card.classList.contains('caso-detail-list-section') && !card.classList.contains('caso-detail-section-metricas'))
      .slice(0, 4);
    const extraSections = allSections.filter((section) => !cards.includes(section));

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
})();
