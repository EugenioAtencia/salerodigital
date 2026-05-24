/* Casos de éxito | Medios e interacción del carrusel | v3 */
(function(){
  const AUTOPLAY_DELAY = 6200;
  const DRAG_THRESHOLD = 58;
  const DRAG_LOCK_THRESHOLD = 9;

  function injectInteractionStyles(){
    if (document.getElementById('casos-carousel-interaction-styles')) return;

    const style = document.createElement('style');
    style.id = 'casos-carousel-interaction-styles';
    style.textContent = `
      .casos-carousel-stage .casos-carousel-viewport{
        cursor:grab;
        user-select:none;
        -webkit-user-select:none;
        touch-action:pan-y;
      }

      .casos-carousel-stage.is-dragging .casos-carousel-viewport,
      .casos-carousel-stage.is-dragging .caso-media,
      .casos-carousel-stage.is-dragging .caso-card-visual{
        cursor:grabbing;
      }

      .casos-carousel-stage.is-dragging,
      .casos-carousel-stage.is-dragging *{
        user-select:none;
        -webkit-user-select:none;
      }
    `;
    document.head.appendChild(style);
  }

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

  function getActiveCard(root){
    return root.querySelector('.caso-card-visual.is-active');
  }

  function primeInitialState(root){
    const cards = [...root.querySelectorAll('.caso-card-visual')];
    if (!cards.length || getActiveCard(root)) return;

    const total = cards.length;
    cards.forEach((card, i) => {
      let offset = i;
      const half = Math.floor(total / 2);
      if (offset > half) offset -= total;
      const abs = Math.abs(offset);
      const clamped = Math.max(-3, Math.min(3, offset));

      card.classList.toggle('is-active', i === 0);
      card.classList.toggle('is-near', abs === 1);
      card.classList.toggle('is-far', abs === 2);
      card.classList.toggle('is-hidden', abs > 2);
      card.dataset.offset = String(clamped);
      card.style.setProperty('--offset', clamped);
      card.style.setProperty('--abs-offset', Math.min(abs, 3));
      card.style.zIndex = String(20 - abs);
    });

    const dots = root.querySelectorAll('[data-casos-dot]');
    dots.forEach((dot, i) => {
      const active = i === 0;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
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

  function setupDrag(root){
    const carousel = root.querySelector('[data-casos-carousel]');
    const viewport = root.querySelector('[data-casos-viewport]');
    const prev = root.querySelector('[data-casos-prev]');
    const next = root.querySelector('[data-casos-next]');

    if (!carousel || !viewport || !prev || !next || viewport.dataset.dragReady === 'true') return;
    viewport.dataset.dragReady = 'true';

    let isDown = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let dragged = false;
    let locked = false;
    let preventClickUntil = 0;

    const clearDrag = () => {
      isDown = false;
      pointerId = null;
      dragged = false;
      locked = false;
      carousel.classList.remove('is-dragging');
      carousel.dataset.userInteracting = 'false';
    };

    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('button')) return;

      isDown = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      dragged = false;
      locked = false;
      carousel.dataset.userInteracting = 'true';
      carousel.classList.add('is-dragging');

      if (viewport.setPointerCapture) {
        try { viewport.setPointerCapture(pointerId); } catch (error) {}
      }
    });

    viewport.addEventListener('pointermove', event => {
      if (!isDown || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      lastX = event.clientX;

      if (!locked && Math.abs(deltaX) > DRAG_LOCK_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        locked = true;
        dragged = true;
      }

      if (locked) event.preventDefault();
    }, { passive:false });

    const finishDrag = event => {
      if (!isDown || event.pointerId !== pointerId) return;

      const deltaX = lastX - startX;
      const shouldMove = Math.abs(deltaX) >= DRAG_THRESHOLD;

      if (shouldMove) {
        preventClickUntil = Date.now() + 450;
        if (deltaX < 0) next.click();
        else prev.click();
      }

      if (viewport.releasePointerCapture) {
        try { viewport.releasePointerCapture(pointerId); } catch (error) {}
      }

      clearDrag();
    };

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', clearDrag);
    viewport.addEventListener('pointerleave', event => {
      if (!isDown || event.pointerId !== pointerId) return;
      finishDrag(event);
    });

    viewport.addEventListener('click', event => {
      if (dragged || Date.now() < preventClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function setupAutoplay(root){
    const carousel = root.querySelector('[data-casos-carousel]');
    const next = root.querySelector('[data-casos-next]');
    if (!carousel || !next || carousel.dataset.autoplayReady === 'true') return;

    carousel.dataset.autoplayReady = 'true';
    carousel.dataset.userInteracting = 'false';

    let visible = true;
    let hasFocus = false;

    const canAdvance = () => {
      if (!visible) return false;
      if (hasFocus) return false;
      if (carousel.dataset.userInteracting === 'true') return false;
      if (root.querySelectorAll('.caso-card-visual').length <= 1) return false;
      return true;
    };

    const advance = () => {
      if (!canAdvance()) return;
      next.click();
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .22);
      }, { threshold:[0, .22, .6] });
      observer.observe(carousel);
    }

    carousel.addEventListener('focusin', () => { hasFocus = true; });
    carousel.addEventListener('focusout', () => { hasFocus = false; });

    window.setTimeout(advance, AUTOPLAY_DELAY);
    window.setInterval(advance, AUTOPLAY_DELAY);
  }

  function enhanceCarousel(root){
    injectInteractionStyles();
    primeInitialState(root);
    root.querySelectorAll('.caso-card-visual').forEach(enhanceCard);
    syncVideoState(root);
    setupDrag(root);
    setupAutoplay(root);
  }

  function init(){
    const root = document.querySelector('[data-casos]');
    if (!root) return;

    const run = () => {
      enhanceCarousel(root);
      window.requestAnimationFrame(() => {
        enhanceCarousel(root);
        window.setTimeout(() => enhanceCarousel(root), 350);
        window.setTimeout(() => enhanceCarousel(root), 1200);
      });
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    window.addEventListener('load', run, { once:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
