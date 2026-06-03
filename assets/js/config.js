const SALERO_CONFIG = {
  apiBase: '/api/wp/v2',
  cmsApiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
  siteOrigin: 'https://agenciaconsalero.es',
  legacyOrigin: 'https://salero.webagencia360.com',
  contactUrl: '/hablamos/',
  whatsappUrl: 'https://wa.me/34665688916?text=Hola%2C%20quiero%20hacer%20una%20cata%20digital%20con%20Salero%20Digital.',
  endpoints: {
    pages: 'pages',
    posts: 'posts',
    menus: 'menu-packs',
    menuPacks: 'menu-packs',
    servicios: 'servicios',
    sectores: 'sectores',
    casos: 'casos-exito'
  }
};

(function loadSaleroFaqSchema() {
  if (document.getElementById('salero-faq-schema-loader')) return;
  const script = document.createElement('script');
  script.id = 'salero-faq-schema-loader';
  script.src = '/assets/js/faq-schema.js?v=1';
  script.defer = true;
  document.head.appendChild(script);
})();

(function loadServiceSectorHeroOverride() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;
  if (!document.getElementById('service-sector-hero-css')) {
    const link = document.createElement('link');
    link.id = 'service-sector-hero-css';
    link.rel = 'stylesheet';
    link.href = '/assets/css/service-detail-sector-hero.css?v=7';
    document.head.appendChild(link);
  }

  if (!document.getElementById('service-menu-accordion-css')) {
    const accordionCss = document.createElement('link');
    accordionCss.id = 'service-menu-accordion-css';
    accordionCss.rel = 'stylesheet';
    accordionCss.href = '/assets/css/service-menu-accordion.css?v=3';
    document.head.appendChild(accordionCss);
  }
})();

(function loadServiceDetailContentFix() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;
  if (document.getElementById('service-detail-content-fix-js')) return;
  const script = document.createElement('script');
  script.id = 'service-detail-content-fix-js';
  script.src = '/assets/js/service-detail-content-fix.js?v=3';
  script.defer = true;
  document.head.appendChild(script);
})();
