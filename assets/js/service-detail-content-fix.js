(function fixServiceDetailContentPlacement() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;

  function moveLeadContentToSecondEditorialCard() {
    const lead = document.querySelector('.service-detail-page .service-lead-content');
    const cards = document.querySelectorAll('.service-detail-page .service-editorial-card');
    const secondCard = cards && cards.length > 1 ? cards[1] : null;

    if (!lead || !secondCard) return false;

    const html = lead.innerHTML.trim();
    const text = lead.textContent.trim();
    if (!html || !text) return false;

    const title = secondCard.querySelector('h2');
    const number = secondCard.querySelector('span');
    if (!title) return false;

    [...secondCard.children].forEach(child => {
      if (child !== number && child !== title) child.remove();
    });

    title.insertAdjacentHTML('afterend', html);
    lead.remove();
    return true;
  }

  function start() {
    if (moveLeadContentToSecondEditorialCard()) return;

    const observer = new MutationObserver(() => {
      if (moveLeadContentToSecondEditorialCard()) observer.disconnect();
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
