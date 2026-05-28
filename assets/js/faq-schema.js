(function () {
  const SCRIPT_ID = 'salero-faqpage-schema';
  let timer = null;

  function stripHtml(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = value || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeQuestion(value) {
    const text = cleanText(value);
    if (!text) return '';
    return text.endsWith('?') ? text : text;
  }

  function normalizeAnswer(value) {
    return cleanText(value).slice(0, 1200);
  }

  function addFaq(faqs, seen, question, answer) {
    const q = normalizeQuestion(question);
    const a = normalizeAnswer(answer);
    const key = q.toLowerCase();
    if (!q || !a || seen.has(key)) return;
    if (q.length < 8 || a.length < 18) return;
    seen.add(key);
    faqs.push({ q, a });
  }

  function faqsFromAccordions(seen) {
    const faqs = [];
    const selectors = [
      '.service-faq-accordion details',
      '.sector-faq-accordion details',
      '.faq-accordion details',
      '.rb-faq details',
      '.ba-content details',
      '[data-faq] details'
    ];

    document.querySelectorAll(selectors.join(',')).forEach((details) => {
      const summary = details.querySelector('summary');
      if (!summary) return;
      const clone = details.cloneNode(true);
      const cloneSummary = clone.querySelector('summary');
      if (cloneSummary) cloneSummary.remove();
      addFaq(faqs, seen, stripHtml(summary.innerHTML), stripHtml(clone.innerHTML));
    });

    return faqs;
  }

  function headingLevel(node) {
    const match = node && node.tagName ? node.tagName.match(/^H([2-6])$/i) : null;
    return match ? Number(match[1]) : 0;
  }

  function faqsFromArticleHeadings(seen) {
    const faqs = [];
    const scopes = document.querySelectorAll('.ba-content, .rb-article-content, article, main');

    scopes.forEach((scope) => {
      const headings = [...scope.querySelectorAll('h2, h3, h4')].filter((heading) => {
        const text = stripHtml(heading.innerHTML);
        return text.includes('?') || /^¿/.test(text);
      });

      headings.forEach((heading) => {
        const level = headingLevel(heading);
        const chunks = [];
        let node = heading.nextElementSibling;

        while (node) {
          const nodeLevel = headingLevel(node);
          if (nodeLevel && nodeLevel <= level) break;
          if (node.matches && node.matches('h2, h3, h4')) break;
          const text = stripHtml(node.innerHTML || node.textContent || '');
          if (text) chunks.push(text);
          if (chunks.join(' ').length > 900) break;
          node = node.nextElementSibling;
        }

        addFaq(faqs, seen, stripHtml(heading.innerHTML), chunks.join(' '));
      });
    });

    return faqs;
  }

  function buildFaqs() {
    const seen = new Set();
    return [
      ...faqsFromAccordions(seen),
      ...faqsFromArticleHeadings(seen)
    ].slice(0, 12);
  }

  function upsertFaqSchema() {
    const faqs = buildFaqs();
    const existing = document.getElementById(SCRIPT_ID);

    if (!faqs.length) {
      if (existing) existing.remove();
      return;
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${window.location.origin}${window.location.pathname.replace(/\/?$/, '/') }#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a
        }
      }))
    };

    const script = existing || document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    if (!existing) document.head.appendChild(script);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(upsertFaqSchema, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', schedule, { once: true });
})();
