const SALERO_CONFIG = {
  apiBase: 'https://salero.webagencia360.com/api/wp/v2',
  cmsApiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
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
