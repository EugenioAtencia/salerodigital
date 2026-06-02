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

(function loadServiceHeroMontserratOverride() {
  if (!window.location.pathname.startsWith('/el-menu/')) return;
  if (document.getElementById('service-hero-montserrat-css')) return;
  const link = document.createElement('link');
  link.id = 'service-hero-montserrat-css';
  link.rel = 'stylesheet';
  link.href = '/assets/css/service-detail-hero-montserrat.css?v=1';
  document.head.appendChild(link);
})();
