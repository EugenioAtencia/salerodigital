function saleroNormalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function saleroLooksLikeQuestion(value = '') {
  const text = saleroNormalizeText(value);
  return text.startsWith('¿') || text.endsWith('?') || text.endsWith('？');
}

function saleroBuildFaqItem(question = '', answer = '', index = 0) {
  const q = escapeHtml(saleroNormalizeText(question) || 'Pregunta frecuente');
  const a = escapeHtml(saleroNormalizeText(answer) || 'Contenido pendiente de completar.');
  return `<details ${index === 0 ? 'open' : ''}><summary><span>${q}</span></summary><div class="service-faq-answer"><p>${a}</p></div></details>`;
}

function saleroSplitServiceFaqs() {
  document.querySelectorAll('.service-faq-accordion').forEach(accordion => {
    const details = [...accordion.querySelectorAll(':scope > details')];
    if (details.length !== 1) return;

    const first = details[0];
    const summaryText = saleroNormalizeText(first.querySelector('summary span')?.textContent || '');
    const answerRoot = first.querySelector('.service-faq-answer');
    if (!answerRoot) return;

    const blocks = [...answerRoot.querySelectorAll('p, li')]
      .map(node => saleroNormalizeText(node.textContent))
      .filter(Boolean);

    if (blocks.length < 3 || !/pregunta frecuente/i.test(summaryText)) return;

    const rows = [];
    let current = null;

    blocks.forEach(text => {
      if (saleroLooksLikeQuestion(text)) {
        if (current && current.q && current.a.length) rows.push(current);
        current = { q: text, a: [] };
      } else if (current) {
        current.a.push(text);
      }
    });

    if (current && current.q && current.a.length) rows.push(current);

    if (rows.length < 2) return;

    accordion.innerHTML = rows.map((row, index) => saleroBuildFaqItem(row.q, row.a.join(' '), index)).join('');

    const rebuilt = [...accordion.querySelectorAll(':scope > details')];
    rebuilt.forEach((item, index) => {
      item.open = index === 0;
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        rebuilt.forEach(other => {
          if (other !== item) other.open = false;
        });
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.setTimeout(saleroSplitServiceFaqs, 120);
});
