(() => {
  const sectorConfig = {
    hosteleria: 'Reservas, imagen y reputación',
    comercio: 'Visibilidad local y ventas',
    aceite: 'Origen, producto y marca',
    generico: 'Estrategia sectorial'
  };

  function enhanceSectorCards(){
    const cards = document.querySelectorAll('.sectores-dynamic-grid .sector-card-dynamic');
    cards.forEach((card) => {
      const kind = ['hosteleria', 'comercio', 'aceite'].find((key) => card.classList.contains(`sector-card-${key}`)) || 'generico';
      const tag = card.querySelector('.tag');
      const link = card.querySelector('.card-link');

      if(tag){
        tag.textContent = sectorConfig[kind];
        tag.classList.add('sector-value-tag');
      }

      if(link){
        link.textContent = 'Ver estrategia';
        link.setAttribute('aria-label', `Ver estrategia de ${card.querySelector('h3')?.textContent?.trim() || 'este sector'}`);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.sectores-dynamic-grid');
    if(!grid) return;

    enhanceSectorCards();

    const observer = new MutationObserver(() => enhanceSectorCards());
    observer.observe(grid, { childList: true, subtree: true });
  });
})();
