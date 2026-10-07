import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { schemaForPath } from '../../functions/_shared/schema.js';

export const SITE = 'https://agenciaconsalero.es';
export const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', copy: '©', reg: '®', trade: '™', euro: '€', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü' };
export function plain(value = '') {
  return String(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, key) => {
    if (key[0] !== '#') return entities[key] ?? match;
    const number = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
  });
}

// Compile only trusted, existing card functions, not CMS content or page scripts.
// Reusing their templates keeps SSG and browser markup in step without a framework.
export async function createRenderers(root) {
  const [helpers, collection, cases, blog, home] = await Promise.all(['helpers.js', 'collection.js', 'casos-de-exito.js', 'blog.js', 'home.js'].map(file => readFile(path.join(root, 'assets/js', file), 'utf8')));
  const document = { createElement() {
    return { innerHTML: '', get textContent() { return plain(this.innerHTML); }, querySelectorAll() {
      const element = this;
      return [{ remove() { element.innerHTML = element.innerHTML.replace(/<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>|<(?:script|iframe|object|embed)\b[^>]*\/?\s*>/gi, ''); } }];
    } };
  } };
  const context = vm.createContext({ document, Intl, Date, state: { activeCategory: 'all' } });
  const sections = [
    helpers.slice(0, helpers.indexOf('function injectGlobalNavStyles')),
    collection.slice(collection.indexOf('function collectionCardLabel'), collection.indexOf("document.addEventListener")),
    cases.slice(0, cases.indexOf('function getCircularOffset'))
  ];
  if (sections.some(section => !section.trim())) throw new Error('Card renderer boundaries missing');
  vm.runInContext(sections.join('\n'), context, { timeout: 1000 });
  const blogContext = vm.createContext({ document, Intl, Date, escapeHtml: esc, state: { activeCategory: 'all' } });
  vm.runInContext(blog.slice(blog.indexOf('  function stripHtml'), blog.indexOf('  function renderFilters')), blogContext, { timeout: 1000 });
  const homeContext = vm.createContext({ document, stripHtml: context.stripHtml, escapeHtml: context.escapeHtml });
  const homeStart = home.indexOf('  function strip('), homeEnd = home.indexOf('  async function renderSection(');
  if (homeStart < 0 || homeEnd <= homeStart) throw new Error('Home renderer boundaries missing');
  vm.runInContext(home.slice(homeStart, homeEnd), homeContext, { timeout: 1000 });
  return {
    homeServices(items) { return items.map((item, index) => homeContext.renderServiceRow(item, index)).join(''); },
    homeSectors(items) { return items.map(item => homeContext.renderSectorCard(item)).join(''); },
    cards(items, base, label) { return items.map(item => context.renderCard(item, base, context.collectionCardLabel(item, base, label))).join(''); },
    cases(items) { return context.renderCasosCarousel(items); },
    posts(items) { return items.map((item, index) => blogContext.cardTemplate(item, index)).join(''); },
    entries(items, base) { return items.map(item => ({ name: base === '/casos-de-exito' ? context.saleroCasoTitle(item) : plain(item.title.rendered), url: base === '/casos-de-exito' ? context.saleroCasoUrl(item, context.saleroCasoSlug(item, context.saleroCasoTitle(item))) : `${base}/${item.slug}/` })); }
  };
}

export function collectionSchema(pathname, title, entries) {
  const url = `${SITE}${pathname}`, listId = `${url}#item-list`;
  const basePath = pathname.startsWith('/la-rebotica/') ? '/la-rebotica/' : pathname;
  const original = schemaForPath(basePath);
  const normalized = JSON.stringify(original).replaceAll('https://salero.webagencia360.com', SITE);
  const graph = JSON.parse(normalized)['@graph'].filter(node => node['@type'] !== 'ItemList');
  const page = graph.find(node => node['@id'] === `${SITE}${basePath}#webpage`);
  if (!page) throw new Error('Missing collection WebPage schema');
  page['@id'] = `${url}#webpage`; page.url = url; page.mainEntity = { '@id': listId };
  if (pathname !== basePath) {
    const breadcrumb = graph.find(node => node['@type'] === 'BreadcrumbList');
    if (breadcrumb) { breadcrumb['@id'] = `${url}#breadcrumb`; breadcrumb.itemListElement.push({ '@type': 'ListItem', position: breadcrumb.itemListElement.length + 1, name: `Página ${pathname.split('/').filter(Boolean).at(-1)}`, item: url }); }
  }
  graph.push({ '@type': 'ItemList', '@id': listId, numberOfItems: entries.length, itemListElement: entries.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: new URL(item.url, SITE).href })) });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function jsonScript(id, data, type = 'application/json') {
  return `<script id="${id}" type="${type}">${JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')}</script>`;
}
