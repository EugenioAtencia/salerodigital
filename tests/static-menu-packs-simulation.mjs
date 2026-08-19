import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const homeHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const menusHtml = readFileSync(new URL('../nuestros-menus/index.html', import.meta.url), 'utf8');
const homeJs = readFileSync(new URL('../assets/js/home.js', import.meta.url), 'utf8');
const configJs = readFileSync(new URL('../assets/js/config.js', import.meta.url), 'utf8');
const detailJs = readFileSync(new URL('../assets/js/detail.js', import.meta.url), 'utf8');
const redirectFunction = readFileSync(new URL('../functions/nuestros-menus/[slug].js', import.meta.url), 'utf8');
const redirectIndexFunction = readFileSync(new URL('../functions/nuestros-menus/[slug]/index.js', import.meta.url), 'utf8');

const packNames = ['El Pellizco', 'Media Ración', 'El Menú Degustación'];

for (const pack of packNames) {
  assert.equal(homeHtml.includes(pack), true, `Home keeps static pack ${pack}`);
  assert.equal(menusHtml.includes(pack), true, `/nuestros-menus/ keeps static pack ${pack}`);
}

assert.equal(homeHtml.includes('data-home-menus'), false, 'Home does not expose a dynamic packs container');
assert.equal(menusHtml.includes('Cargando menú desde el CMS'), false, '/nuestros-menus/ is not a CMS loading shell');
assert.equal(/<title>[\s\S]*Nuestros menús[\s\S]*<\/title>/i.test(menusHtml), true, 'Menus page keeps title');
assert.equal(/<h1[^>]*>[\s\S]*Tres formas de empezar, sin sorpresas[\s\S]*<\/h1>/i.test(menusHtml), true, 'Menus page keeps H1');

assert.equal(homeJs.includes('menu-packs'), false, 'Home no longer references menu-packs');
assert.equal(homeJs.includes('salero/v1/menu-packs'), false, 'Home no longer references salero/v1/menu-packs');
assert.equal(homeJs.includes("'menus'"), false, 'Home no longer falls back to wp/v2/menus for packs');
assert.equal(configJs.includes('menu-packs'), false, 'Global config no longer exposes dead pack endpoints');
assert.equal(configJs.includes('menuPacks'), false, 'Global config no longer exposes menuPacks alias');
assert.equal(/menu:\s*\{/.test(detailJs), false, 'Detail renderer no longer has a CMS-backed menu config');
assert.match(redirectFunction, /Response\.redirect\(new URL\('\/nuestros-menus\/'/);
assert.match(redirectIndexFunction, /Response\.redirect\(new URL\('\/nuestros-menus\/'/);

function makeElement() {
  return {
    innerHTML: '',
    textContent: '',
    classList: { toggle() {} },
    querySelectorAll() { return []; },
    set innerHTML(value) {
      this._html = String(value || '');
      this.textContent = this._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    },
    get innerHTML() {
      return this._html || '';
    }
  };
}

const elements = {
  '[data-home-servicios]': makeElement(),
  '[data-home-sectores]': makeElement(),
  '[data-home-menus]': makeElement()
};
const fetchUrls = [];
const context = {
  URL,
  Date: { now: () => 12345 },
  window: {
    location: { origin: 'https://agenciaconsalero.es' },
    saleroFetchJson: async (url) => {
      fetchUrls.push(url);
      if (url.includes('/servicios?')) return [{ slug: 'cimientos-digitales', title: { rendered: 'Cimientos Digitales' }, salero_acf: { nombre_tecnico: 'Web', claim: 'Web clara' } }];
      if (url.includes('/sectores?')) return [{ slug: 'marketing-para-comercios-pymes', title: { rendered: 'Marketing para comercios y pymes' }, salero_acf: { claim: 'Visibilidad local' } }];
      throw new Error(`Unexpected fetch ${url}`);
    }
  },
  SALERO_CONFIG: {
    apiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
    cmsApiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
    endpoints: { servicios: 'servicios', sectores: 'sectores' }
  },
  document: {
    querySelector(selector) {
      return elements[selector] || null;
    },
    createElement() {
      return makeElement();
    },
    addEventListener(type, callback) {
      if (type === 'DOMContentLoaded') callback();
    }
  },
  console
};

vm.createContext(context);
vm.runInContext(homeJs, context);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(fetchUrls.length, 2, 'Home only fetches servicios and sectores');
assert.equal(fetchUrls.some((url) => /menu-packs|salero\/v1\/menu-packs|\/menus\?/.test(url)), false, 'Home does not fetch CMS packs endpoints');
assert.equal(elements['[data-home-servicios]'].innerHTML.includes('service-row'), true, 'Services still render');
assert.equal(elements['[data-home-sectores]'].innerHTML.includes('sector-card'), true, 'Sectors still render');
assert.equal(elements['[data-home-menus]'].innerHTML, '', 'Dynamic menu container is left untouched');

console.log('static menu packs simulations passed');
