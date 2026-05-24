(() => {
  const carousels = document.querySelectorAll('.caso-detail-content');

  carousels.forEach((carousel) => {
    const cards = Array.from(carousel.querySelectorAll('.caso-detail-section'))
      .filter((card) => !card.classList.contains('caso-detail-list-section') && !card.classList.contains('caso-detail-section-metricas'))
      .slice(0, 4);

    if (cards.length < 2 || carousel.dataset.recipeCarousel === 'ready') return;
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

    let active = 0;

    function activate(index, shouldScroll = false) {
      active = (index + cards.length) % cards.length;

      cards.forEach((card, cardIndex) => {
        const isActive = cardIndex === active;
        card.classList.toggle('is-active', isActive);
        card.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === active);
      });

      if (shouldScroll) {
        cards[active].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    controls.querySelector('[data-recipe-prev]').addEventListener('click', () => activate(active - 1, true));
    controls.querySelector('[data-recipe-next]').addEventListener('click', () => activate(active + 1, true));

    cards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => activate(index, false));
      card.addEventListener('focus', () => activate(index, false));
      card.addEventListener('click', () => activate(index, true));
    });

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const index = Number(visible.target.dataset.recipeIndex || 0);
      activate(index, false);
    }, {
      root: carousel,
      threshold: [0.45, 0.62, 0.78]
    });

    cards.forEach((card) => observer.observe(card));
    activate(0, false);
  });
})();
