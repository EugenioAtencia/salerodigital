/* Casos de éxito | Medios del carrusel | v1 */
(function(){
  function enhanceCard(card){
    const video = card.querySelector('.caso-media-video');
    if (!video || video.dataset.mediaEnhanced === 'true') return;

    const media = video.closest('.caso-media');
    if (!media) return;

    const poster = video.getAttribute('poster');
    if (poster) {
      const img = document.createElement('img');
      img.className = 'caso-video-poster-layer';
      img.src = poster;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('aria-hidden', 'true');
      media.insertBefore(img, video.nextSibling);
      video.classList.add('has-poster-layer');
    }

    video.dataset.mediaEnhanced = 'true';
  }

  function syncVideoState(root){
    const cards = root.querySelectorAll('.caso-card-visual');
    cards.forEach(card => {
      const video = card.querySelector('.caso-media-video');
      if (!video) return;

      if (card.classList.contains('is-active')) {
        video.muted = true;
        video.play && video.play().catch(() => {});
      } else {
        video.pause && video.pause();
      }
    });
  }

  function enhanceCarousel(root){
    root.querySelectorAll('.caso-card-visual').forEach(enhanceCard);
    syncVideoState(root);
  }

  function init(){
    const root = document.querySelector('[data-casos]');
    if (!root) return;

    enhanceCarousel(root);

    const observer = new MutationObserver(() => enhanceCarousel(root));
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
