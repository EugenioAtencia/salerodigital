import { renderJsonLd, schemaForPath } from './_shared/schema.js';
import { handleBlogPostRequest } from './_shared/blog-renderer.js';
import { renderSitemap } from './_shared/sitemap-renderer.js';
import { handleBlogIndexRequest } from './_shared/blog-index-renderer.js';

const SITE_ORIGIN = 'https://agenciaconsalero.es';
const LEGACY_ORIGIN = 'https://salero.webagencia360.com';
const LEGACY_HOSTNAMES = new Set(['salero.webagencia360.com']);
const GTM_ID = 'GTM-WSLMDJ8N';

const MONTSERRAT_CSS = '<link rel="stylesheet" href="/assets/css/font-body-montserrat.css?v=3">';
const PREGONERO_GRID_CSS = '<style id="pregonero-four-grid-style">.pregonero-seo-cards .pregonero-four-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.pregonero-seo-cards .pregonero-four-grid .service-action-card{min-width:0;padding:26px 20px}@media(max-width:1050px){.pregonero-seo-cards .pregonero-four-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.pregonero-seo-cards .pregonero-four-grid{grid-template-columns:1fr}}</style>';
const CIMIENTOS_GRID_CSS = '<style id="cimientos-web-grid-style">.cimientos-web-cards .cimientos-four-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.cimientos-web-cards .cimientos-four-grid .service-action-card{min-width:0;padding:26px 20px}@media(max-width:1050px){.cimientos-web-cards .cimientos-four-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.cimientos-web-cards .cimientos-four-grid{grid-template-columns:1fr}}</style>';
const GRACIA_GRID_CSS = '<style id="gracia-social-grid-style">.gracia-social-cards .gracia-four-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.gracia-social-cards .gracia-four-grid .service-action-card{min-width:0;padding:26px 20px}@media(max-width:1050px){.gracia-social-cards .gracia-four-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.gracia-social-cards .gracia-four-grid{grid-template-columns:1fr}}</style>';
const EMPUJON_GRID_CSS = '<style id="empujon-ads-grid-style">.empujon-ads-cards .empujon-four-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.empujon-ads-cards .empujon-four-grid .service-action-card{min-width:0;padding:26px 20px}@media(max-width:1050px){.empujon-ads-cards .empujon-four-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.empujon-ads-cards .empujon-four-grid{grid-template-columns:1fr}}</style>';
const SERVICE_RELATED_CSS = '<link rel="stylesheet" href="/assets/css/service-related.css?v=1">';
const SERVICE_RELATED_JS = '<script src="/assets/js/service-related.js?v=1" defer></script>';
const SERVICE_HERO_SECTOR_CSS = '<link rel="stylesheet" href="/assets/css/service-hero-sector-style.css?v=4">';
const SERVICE_MOBILE_NAV_CSS = '<link rel="stylesheet" href="/assets/css/service-mobile-nav.css?v=1">';
const NAV_SERVICE_DROPDOWN_JS = '<script src="/assets/js/nav-service-dropdown.js?v=1" defer></script>';
const CASE_RECIPE_FIX_CSS = '<link rel="stylesheet" href="/assets/css/caso-receta-carousel-fix.css?v=3">';
const BLOG_FAQ_TYPOGRAPHY_CSS = '<link rel="stylesheet" href="/assets/css/ba-faq-typography.css?v=2">';
const CONSENT_CSS = '<link rel="stylesheet" href="/assets/css/consent.css?v=4">';
const CONSENT_JS = '<script src="/assets/js/consent.js?v=3" defer></script>';

const REMOVED_MENU_PACKS = new Set([
  '/nuestros-menus/media-racion/',
  '/nuestros-menus/el-pellizco/',
  '/nuestros-menus/menu-degustacion/'
]);
const REMOVED_PAGES = new Set([]);

const SEO_PAGES = {
  '/': {
    title: 'Agencia de marketing digital en Morón - Salero Digital',
    description: 'Web, SEO local, redes sociales y campañas para negocios de Morón, Arahal y comarca. Estrategia senior con cercanía y resultados medibles.',
    canonical: '/'
  },
  '/nuestros-menus/': {
    title: 'Packs de marketing para negocios - Salero Digital',
    description: 'Elige El Pellizco, Media Ración o El Menú Degustación según tu ritmo: presencia, crecimiento o estrategia digital integral.',
    canonical: '/nuestros-menus/'
  },
  '/el-menu/': {
    title: 'Servicios de marketing digital - Salero Digital',
    description: 'Elige desarrollo web, SEO local, redes sociales o campañas digitales para que tu negocio gane visibilidad, contactos y ventas.',
    canonical: '/el-menu/'
  },
  '/el-menu/cimientos-digitales/': {
    title: 'Diseño y desarrollo web en Morón de la Frontera | Salero Digital',
    description: 'Diseñamos páginas web y tiendas online para negocios de Morón y comarca. Desarrollo a medida, diseño responsive, SEO y enfoque comercial.',
    canonical: '/el-menu/cimientos-digitales/'
  },
  '/el-menu/el-pregonero/': {
    title: 'Agencia SEO local en Morón de la Frontera | Salero Digital',
    description: 'Mejoramos el SEO local de tu negocio en Morón de la Frontera y comarca. Google Maps, posicionamiento web y estrategia para captar clientes.',
    canonical: '/el-menu/el-pregonero/'
  },
  '/el-menu/gracia-y-presencia/': {
    title: 'Gestión de redes sociales en Morón | Salero Digital',
    description: 'Gestionamos redes sociales para empresas de Morón de la Frontera y comarca. Estrategia, reels, contenidos y seguimiento profesional.',
    canonical: '/el-menu/gracia-y-presencia/'
  },
  '/el-menu/el-empujon/': {
    title: 'Agencia Google Ads y Meta Ads en Morón | Salero Digital',
    description: 'Gestionamos campañas de Google Ads y Meta Ads para negocios de Morón de la Frontera y comarca. Estrategia, anuncios, conversiones y medición.',
    canonical: '/el-menu/el-empujon/'
  },
  '/sectores/': {
    title: 'Marketing para sectores locales - Salero Digital',
    description: 'Soluciones digitales para hostelería, comercios, pymes y marcas con origen. Marketing local con estrategia, cercanía y foco comercial.',
    canonical: '/sectores/'
  },
  '/sectores/marketing-para-hosteleria-turismo/': {
    title: 'Marketing para hostelería y turismo - Salero Digital',
    description: 'Atrae más reservas y clientes con web, SEO local, contenidos y campañas para bares, restaurantes, alojamientos rurales y turismo local.',
    canonical: '/sectores/marketing-para-hosteleria-turismo/'
  },
  '/sectores/marketing-para-comercios-pymes/': {
    title: 'Marketing para comercios y pymes - Salero Digital',
    description: 'Web, SEO local, redes y campañas para comercios y pymes que quieren atraer más clientes, ganar visibilidad y vender mejor.',
    canonical: '/sectores/marketing-para-comercios-pymes/'
  },
  '/sectores/marketing-para-almazaras-aceite/': {
    title: 'Marketing para almazaras y aceite - Salero Digital',
    description: 'Impulsa tu marca de aceite con web, SEO local, contenidos y campañas pensadas para almazaras de la Sierra Sur y la Campiña.',
    canonical: '/sectores/marketing-para-almazaras-aceite/'
  },
  '/la-receta/': {
    title: 'Agencia digital con experiencia - Salero Digital',
    description: 'Conoce cómo trabaja Salero Digital: estrategia senior, cercanía, oficio y marketing digital con los pies en la tierra.',
    canonical: '/la-receta/'
  },
  '/casos-de-exito/': {
    title: 'Casos de éxito en marketing digital - Salero Digital',
    description: 'Descubre proyectos reales de web, SEO, contenidos y campañas para marcas, negocios locales y organizaciones que confiaron en Salero Digital.',
    canonical: '/casos-de-exito/'
  },
  '/la-rebotica/': {
    title: 'Blog de marketing local - Salero Digital',
    description: 'Guías prácticas sobre SEO local, redes, campañas y web para negocios que quieren ganar visibilidad sin perder su forma de ser.',
    canonical: '/la-rebotica/'
  },
  '/hablamos/': {
    title: 'Contacto y cata digital - Salero Digital',
    description: 'Cuéntanos qué necesita tu negocio y preparamos una cata digital para mejorar tu web, posicionamiento, redes o campañas.',
    canonical: '/hablamos/'
  }
};

const GLOBAL_FOOTER = `<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h2>Salero Digital</h2>
        <p>Tu marca, con salero. Agencia digital para negocios que quieren dejar de estar sosos en internet.</p>
      </div>
      <div>
        <h3>El Menú</h3>
        <nav class="footer-nav" aria-label="Servicios de Salero Digital">
          <a href="/el-menu/cimientos-digitales/">Cimientos Digitales</a>
          <a href="/el-menu/el-pregonero/">El Pregonero</a>
          <a href="/el-menu/gracia-y-presencia/">Gracia y Presencia</a>
          <a href="/el-menu/el-empujon/">El Empujón</a>
        </nav>
      </div>
      <div>
        <h3>Sectores</h3>
        <nav class="footer-nav" aria-label="Sectores de Salero Digital">
          <a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a>
          <a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a>
          <a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a>
        </nav>
      </div>
      <div>
        <h3>¿Hablamos?</h3>
        <p>Morón de la Frontera, Sierra Sur y Campiña.</p>
        <a href="/hablamos/">Pide tu cata digital</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Salero Digital</span>
      <span>Digitalizamos con salero, pero con los pies en la tierra.</span>
    </div>
  </div>
</footer>`;


function enrichPregonero(html = '', route = '') {
  if (route !== '/el-menu/el-pregonero/' || html.includes('id="pregonero-seo-local"')) return html;
  // Keep the visual service name as an eyebrow while making the principal heading descriptive.
  let next = html.replace(/(<h1\b[^>]*>)\s*El Pregonero\s*(<\/h1>)/i,
    '$1Agencia SEO local en Morón de la Frontera$2');
  if (next === html) return html; // Do not inject into an unexpected page/template.
  const section = `
<section id="pregonero-seo-local" class="section" aria-labelledby="pregonero-seo-heading">
  <div class="container" style="max-width:1080px">
    <span class="eyebrow">El Pregonero · SEO local</span>
    <h2 id="pregonero-seo-heading">Que te encuentren cuando te están buscando</h2>
    <p class="lead">En Salero Digital ayudamos a negocios de Morón de la Frontera, la Sierra Sur y la Campiña a mejorar su presencia en Google, Google Maps y las búsquedas que pueden convertirse en llamadas, visitas o solicitudes de presupuesto.</p>
    <h2>¿Qué es el SEO local y cómo ayuda a tu negocio?</h2>
    <p>El SEO local mejora la visibilidad de una empresa cuando alguien busca sus productos o servicios en un área concreta. Trabajamos la web y la ficha de Google Business Profile para facilitar que los clientes encuentren información útil y puedan contactar contigo. La visibilidad depende de la relevancia, la distancia y la competencia de cada búsqueda.</p>
    <h2>Cómo trabajamos el SEO local</h2>
    <p>Comenzamos con una cata digital para entender tus objetivos. Después analizamos la situación de partida, priorizamos las mejoras y revisamos periódicamente los resultados. No prometemos primeras posiciones: proponemos acciones con sentido comercial y explicamos qué se puede medir.</p>
    <h2>SEO local en Morón de la Frontera y municipios cercanos</h2>
    <p>Trabajamos con negocios de Morón de la Frontera y atendemos proyectos de Arahal, Marchena, Montellano, La Puebla de Cazalla, El Coronil, Paradas y Osuna. Las futuras páginas específicas de cada municipio se enlazarán desde aquí cuando estén publicadas y aporten información diferenciada.</p>
    <p><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a></p>
  </div>
</section>`;
  const faqs = [
    ['¿Cuánto tarda el SEO local en dar resultados?', 'Depende de la competencia, la situación inicial de la web y la ficha de Google, y las mejoras necesarias. Algunas acciones se reflejan antes y otras requieren varios meses de seguimiento.'],
    ['¿Necesito una web para aparecer en Google Maps?', 'No siempre. Una empresa elegible puede tener su perfil de Google sin página web, pero una web propia permite explicar sus servicios y posicionarse en más búsquedas.'],
    ['¿Qué diferencia hay entre SEO local y Google Ads?', 'El SEO local busca mejorar la visibilidad orgánica; Google Ads permite contratar anuncios. Son canales distintos y complementarios, con costes y plazos diferentes.'],
    ['¿Podéis mejorar el posicionamiento de mi web actual?', 'Sí. Primero revisamos su estado técnico, contenidos y oportunidades. No siempre hace falta crear una web nueva.']
  ];
  const accordion = '<div class="service-faq-accordion">' + faqs.map(([q, a], i) =>
    '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + q + '</span></summary><div class="service-faq-answer"><p>' + a + '</p></div></details>'
  ).join('') + '</div>';
  const faqBlock = /<div class="service-faq-accordion">[\s\S]*?<\/div><\/section>/i;
  if (!faqBlock.test(next)) return html;
  const seoCards = `
<section class="service-action-section pregonero-seo-cards" aria-labelledby="pregonero-work-heading">
  <div class="service-block-heading">
    <span class="service-section-kicker">Nuestro trabajo SEO local</span>
    <h2 id="pregonero-work-heading">Qué trabajamos en tu estrategia de posicionamiento local</h2>
  </div>
  <div class="pregonero-four-grid">
    <article class="service-action-card service-action-incluye"><span>01</span><h3>Auditoría y competencia</h3><p>Estudiamos el estado de tu web, tus búsquedas prioritarias y los negocios que compiten por la atención de tus posibles clientes.</p></article>
    <article class="service-action-card service-action-beneficios"><span>02</span><h3>Google Business Profile</h3><p>Revisamos categorías, servicios, información, imágenes y coherencia con la web, además de oportunidades para mejorar la reputación y la gestión de reseñas.</p></article>
    <article class="service-action-card service-action-proceso"><span>03</span><h3>SEO técnico y contenidos</h3><p>Optimizamos páginas estratégicas, encabezados, enlaces internos y contenidos que responden a búsquedas con intención comercial.</p></article>
    <article class="service-action-card service-action-incluye"><span>04</span><h3>Medición y seguimiento</h3><p>Seguimos visibilidad, clics y, cuando existe medición adecuada, contactos, formularios y oportunidades reales de negocio.</p></article>
  </div>
</section>`;
  next = next.replace(faqBlock, accordion + '</section>' + seoCards);
  return next.replace(/<\/main>/i, section + '\n</main>');
}


function enrichCimientos(html = '', route = '') {
  if (route !== '/el-menu/cimientos-digitales/' || html.includes('id="cimientos-web-services"')) return html;
  let next = html.replace(/(<h1\b[^>]*>)\s*Cimientos Digitales\s*(<\/h1>)/i,
    '$1Diseño y desarrollo web en Morón de la Frontera$2');
  if (next === html) return html;
  const faqs = [
    ['¿Cuánto cuesta diseñar una página web?', 'Depende del número de secciones, funcionalidades, contenidos, integraciones y mantenimiento. Tras revisar tu proyecto te proponemos un presupuesto con alcance y entregables claros.'],
    ['¿Mi página web funcionará en móviles?', 'Sí. Diseñamos pensando en móviles, tabletas y ordenadores, con navegación, formularios y contenidos adaptados a cada pantalla.'],
    ['¿Podéis renovar mi web sin perder su posicionamiento?', 'Sí, partimos de una auditoría de las URL actuales y planificamos contenidos, redirecciones y medición para reducir el riesgo de perder visibilidad. Ninguna migración garantiza conservar todas las posiciones.'],
    ['¿La página tendrá SEO y podré actualizarla?', 'Preparamos una base SEO técnica con títulos, estructura, indexabilidad y rendimiento, y definimos contigo qué contenidos podrás gestionar. El posicionamiento continuado se trabaja como una estrategia adicional.']
  ];
  const accordion = '<div class="service-faq-accordion">' + faqs.map(([q,a],i) =>
    '<details' + (i===0 ? ' open' : '') + '><summary><span>' + q + '</span></summary><div class="service-faq-answer"><p>' + a + '</p></div></details>'
  ).join('') + '</div>';
  const faqBlock = /<div class="service-faq-accordion">[\s\S]*?<\/div><\/section>/i;
  if (!faqBlock.test(next)) return html;
  const cards = `
<section id="cimientos-web-services" class="service-action-section cimientos-web-cards" aria-labelledby="cimientos-web-heading">
  <div class="service-block-heading">
    <span class="service-section-kicker">Cimientos Digitales · Desarrollo web</span>
    <h2 id="cimientos-web-heading">Qué construimos para tu negocio</h2>
    <p>Una web no es solo un escaparate. Es una herramienta para explicar qué haces, generar confianza y facilitar el contacto o la venta.</p>
  </div>
  <div class="cimientos-four-grid">
    <article class="service-action-card service-action-incluye"><span>01</span><h3>Diseño y experiencia de usuario</h3><p>Organizamos el contenido y diseñamos una navegación clara, adaptada a móviles y pensada para las necesidades de tus clientes.</p></article>
    <article class="service-action-card service-action-beneficios"><span>02</span><h3>Desarrollo y funcionalidades</h3><p>Construimos webs corporativas, catálogos y tiendas online con formularios, integraciones y opciones de gestión según el proyecto.</p></article>
    <article class="service-action-card service-action-proceso"><span>03</span><h3>SEO técnico y rendimiento</h3><p>Preparamos estructura, títulos, enlaces, accesibilidad básica, velocidad y configuración de indexación para que tu web tenga buenos cimientos.</p></article>
    <article class="service-action-card service-action-incluye"><span>04</span><h3>Publicación y seguimiento</h3><p>Revisamos el funcionamiento antes de publicar, comprobamos formularios y medición, y acordamos las tareas de mantenimiento necesarias.</p></article>
  </div>
</section>`;
  next = next.replace(faqBlock, accordion + '</section>' + cards);
  const additional = `
<section class="section cimientos-web-intro" aria-labelledby="cimientos-web-intro-title">
  <div class="container" style="max-width:1080px">
    <span class="eyebrow">Cimientos Digitales</span>
    <h2 id="cimientos-web-intro-title">Tu web, preparada para trabajar por tu negocio</h2>
    <p class="lead">En Salero Digital diseñamos y desarrollamos páginas web para empresas, comercios y profesionales de Morón de la Frontera, la Sierra Sur y la Campiña. Buscamos que cada proyecto sea fácil de usar, transmita confianza y ayude a conseguir contactos o ventas.</p>
    <h2>Cómo desarrollamos una página web</h2>
    <p>Empezamos por conocer tus servicios, clientes y objetivos. Después definimos la arquitectura de contenidos, trabajamos el diseño, desarrollamos las funciones necesarias y comprobamos el resultado antes del lanzamiento. Si ya tienes una web, estudiamos primero qué conviene conservar, mejorar o redirigir.</p>
    <h2>Diseño web para negocios de Morón y comarca</h2>
    <p>Trabajamos con proyectos de Morón de la Frontera y municipios del entorno como Arahal, Marchena, Montellano, La Puebla de Cazalla, Paradas y Osuna, tanto para nuevas webs como para rediseños y mejoras de proyectos existentes.</p>
    <p><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a></p>
  </div>
</section>`;
  return next.replace(/<\/main>/i, additional + '\n</main>');
}


function enrichGracia(html = '', route = '') {
  if (route !== '/el-menu/gracia-y-presencia/' || html.includes('id="gracia-social-content"')) return html;
  let next = html.replace(/(<h1\b[^>]*>)\s*Gracia y Presencia\s*(<\/h1>)/i, '$1Gestión profesional de redes sociales en Morón de la Frontera$2');
  if (next === html) return html;
  const faqs = [
    ['¿Qué incluye la gestión profesional de redes sociales?', 'Analizamos tu marca y audiencia, definimos una estrategia de contenidos, preparamos publicaciones, coordinamos su programación y revisamos los resultados. El alcance exacto de cada servicio se define en la propuesta.'],
    ['¿En qué redes sociales debería estar mi negocio?', 'Depende de dónde estén tus clientes y del contenido que puedas ofrecer. Estudiamos si tiene sentido trabajar Instagram, Facebook, TikTok o LinkedIn, sin abrir perfiles por obligación.'],
    ['¿También creáis vídeos, reels y fotografías?', 'Podemos planificar y producir contenidos audiovisuales para los canales acordados. Antes concretamos grabaciones, materiales disponibles, frecuencia y formatos necesarios.'],
    ['¿Cómo medimos si las redes sociales funcionan?', 'Revisamos alcance, interacción, visitas al perfil, clics y, cuando se pueden atribuir correctamente, consultas y conversiones. No nos limitamos a contar seguidores.']
  ];
  const accordion = '<div class="service-faq-accordion">' + faqs.map(([q,a],i) =>
    '<details' + (i===0?' open':'') + '><summary><span>' + q + '</span></summary><div class="service-faq-answer"><p>' + a + '</p></div></details>'
  ).join('') + '</div>';
  const faqBlock = /<div class="service-faq-accordion">[\s\S]*?<\/div><\/section>/i;
  if (!faqBlock.test(next)) return html;
  const cards = `
<section id="gracia-social-content" class="service-action-section gracia-social-cards" aria-labelledby="gracia-social-heading">
  <div class="service-block-heading">
    <span class="service-section-kicker">Gracia y Presencia · Redes sociales</span>
    <h2 id="gracia-social-heading">Qué trabajamos en tus redes sociales</h2>
    <p>Un plan de contenidos que combine identidad de marca, utilidad para tus clientes y objetivos medibles.</p>
  </div>
  <div class="gracia-four-grid">
    <article class="service-action-card service-action-incluye"><span>01</span><h3>Estrategia y planificación</h3><p>Estudiamos tu negocio, los públicos, los canales adecuados y los temas que merece la pena comunicar.</p></article>
    <article class="service-action-card service-action-beneficios"><span>02</span><h3>Diseño y contenido audiovisual</h3><p>Preparamos copys, creatividades, fotografías, reels y vídeos según los formatos y recursos del proyecto.</p></article>
    <article class="service-action-card service-action-proceso"><span>03</span><h3>Gestión y publicación</h3><p>Organizamos el calendario editorial y programamos los contenidos, respetando la voz de tu marca y las particularidades de cada canal.</p></article>
    <article class="service-action-card service-action-incluye"><span>04</span><h3>Análisis y mejora continua</h3><p>Revisamos alcance, interacción, tráfico y oportunidades para ajustar la estrategia con datos.</p></article>
  </div>
</section>`;
  next = next.replace(faqBlock, accordion + '</section>' + cards);
  const additional = `
<section class="section gracia-social-intro" aria-labelledby="gracia-social-intro-title">
  <div class="container" style="max-width:1080px">
    <span class="eyebrow">Gracia y Presencia</span>
    <h2 id="gracia-social-intro-title">Redes sociales con estrategia, no publicaciones por publicar</h2>
    <p class="lead">En Salero Digital ayudamos a comercios, empresas y profesionales de Morón de la Frontera, la Sierra Sur y la Campiña a desarrollar una presencia en redes sociales reconocible y útil para su negocio.</p>
    <h2>Cómo gestionamos las redes de tu empresa</h2>
    <p>Empezamos por comprender tu actividad y definir a quién queremos llegar. Diseñamos un calendario de contenidos, acordamos los formatos y organizamos la producción, revisión y publicación. Después interpretamos los resultados para mejorar sin depender únicamente de métricas de popularidad.</p>
    <h2>Comunicación para negocios de Morón y su comarca</h2>
    <p>Prestamos servicios de gestión de redes sociales a negocios de Morón de la Frontera y localidades cercanas como Arahal, Marchena, Montellano, La Puebla de Cazalla, Paradas y Osuna. Adaptamos los mensajes a cada marca y a sus clientes, sin utilizar campañas idénticas para todos.</p>
    <p><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a></p>
  </div>
</section>`;
  return next.replace(/<\/main>/i, additional + '\n</main>');
}


function enrichEmpujon(html = '', route = '') {
  if (route !== '/el-menu/el-empujon/' || html.includes('id="empujon-ads-content"')) return html;
  let next = html.replace(/(<h1\b[^>]*>)\s*El Empujón\s*(<\/h1>)/i, '$1Agencia de Google Ads y Meta Ads en Morón de la Frontera$2');
  if (next === html) return html;
  const faqs = [
    ['¿Qué presupuesto necesito para anunciarme en Google o Meta?', 'Depende de tus objetivos, sector, competencia y zona de captación. Primero definimos una inversión viable y distinguimos el presupuesto publicitario de los honorarios de gestión.'],
    ['¿Qué diferencia hay entre Google Ads y Meta Ads?', 'Google Ads permite llegar a personas que buscan servicios o productos; Meta Ads ayuda a llegar a públicos segmentados en Facebook e Instagram. La elección depende de la demanda y los objetivos del negocio.'],
    ['¿Cómo sabemos si las campañas generan clientes?', 'Configuramos y revisamos la medición de acciones relevantes, como formularios, llamadas o ventas. Analizamos la calidad de los contactos, el coste y los resultados disponibles, no solo clics.'],
    ['¿Se pueden mejorar campañas que ya están activas?', 'Sí. Auditamos la configuración, las búsquedas o audiencias, los anuncios, los presupuestos y el seguimiento de conversiones antes de proponer cambios.']
  ];
  const accordion = '<div class="service-faq-accordion">' + faqs.map(([q,a],i) =>
    '<details' + (i===0?' open':'') + '><summary><span>' + q + '</span></summary><div class="service-faq-answer"><p>' + a + '</p></div></details>'
  ).join('') + '</div>';
  const faqBlock = /<div class="service-faq-accordion">[\s\S]*?<\/div><\/section>/i;
  if (!faqBlock.test(next)) return html;
  const cards = `
<section id="empujon-ads-content" class="service-action-section empujon-ads-cards" aria-labelledby="empujon-ads-heading">
  <div class="service-block-heading">
    <span class="service-section-kicker">El Empujón · Publicidad digital</span>
    <h2 id="empujon-ads-heading">Qué trabajamos en tus campañas publicitarias</h2>
    <p>Anuncios con una estrategia comercial, un presupuesto definido y una medición que ayude a tomar decisiones.</p>
  </div>
  <div class="empujon-four-grid">
    <article class="service-action-card service-action-incluye"><span>01</span><h3>Estrategia y auditoría</h3><p>Analizamos tus objetivos, clientes, competencia, presupuesto y campañas anteriores para identificar oportunidades.</p></article>
    <article class="service-action-card service-action-beneficios"><span>02</span><h3>Google Ads</h3><p>Planificamos y gestionamos anuncios de búsqueda y otros formatos adecuados para captar demanda relevante.</p></article>
    <article class="service-action-card service-action-proceso"><span>03</span><h3>Meta Ads</h3><p>Diseñamos campañas para Facebook e Instagram, con segmentación, creatividades y mensajes adaptados al público.</p></article>
    <article class="service-action-card service-action-incluye"><span>04</span><h3>Conversiones y optimización</h3><p>Revisamos formularios, llamadas y ventas medibles, analizamos costes y ajustamos las campañas según los resultados.</p></article>
  </div>
</section>`;
  next = next.replace(faqBlock, accordion + '</section>' + cards);
  const additional = `
<section class="section empujon-ads-intro" aria-labelledby="empujon-ads-intro-title">
  <div class="container" style="max-width:1080px">
    <span class="eyebrow">El Empujón</span>
    <h2 id="empujon-ads-intro-title">Publicidad digital para generar oportunidades, no solo clics</h2>
    <p class="lead">En Salero Digital ayudamos a empresas, comercios y profesionales de Morón de la Frontera, la Sierra Sur y la Campiña a planificar y gestionar publicidad en Google, Facebook e Instagram con objetivos comerciales claros.</p>
    <h2>Cómo gestionamos tus campañas de anuncios</h2>
    <p>Comenzamos por entender qué quieres conseguir y cómo se convierte un contacto en cliente. Revisamos la medición, definimos públicos y presupuesto, configuramos las campañas y analizamos periódicamente las conversiones y la calidad de los resultados. No prometemos un número fijo de ventas ni resultados inmediatos.</p>
    <h2>Campañas para negocios de Morón y comarca</h2>
    <p>Trabajamos con empresas de Morón de la Frontera y municipios próximos como Arahal, Marchena, Montellano, La Puebla de Cazalla, Paradas y Osuna. Adaptamos cada campaña al ámbito de servicio real y a las búsquedas o audiencias que tienen sentido para el negocio.</p>
    <p><a class="btn btn-primary" href="/hablamos/">Pide tu cata digital</a></p>
  </div>
</section>`;
  return next.replace(/<\/main>/i, additional + '\n</main>');
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  if (LEGACY_HOSTNAMES.has(requestUrl.hostname)) {
    return Response.redirect(`${SITE_ORIGIN}${requestUrl.pathname}${requestUrl.search}`, 301);
  }

  const normalizedPath = normalizePath(requestUrl.pathname);

  if (normalizedPath === '/sitemap.xml/') return renderSitemap(context);

  if (REMOVED_PAGES.has(normalizedPath)) {
    return renderGoneResponse();
  }

  if (REMOVED_MENU_PACKS.has(normalizedPath)) {
    return Response.redirect(`${SITE_ORIGIN}/nuestros-menus/`, 301);
  }

  // Route article HTML through server rendering even when a Pages route falls back to its client shell.
  // Preserve real 404/502 responses instead of serving the client shell with HTTP 200.
  let response;
  const blogPage = normalizedPath.match(/^\/la-rebotica\/page\/(\d+)\/$/);
  if (normalizedPath === '/la-rebotica/' || blogPage) {
    response = await handleBlogIndexRequest(context, blogPage ? Number(blogPage[1]) : 1);
  } else if (isBlogArticlePath(normalizedPath)) {
    const slug = normalizedPath.split('/').filter(Boolean).at(-1);
    const serverResponse = await handleBlogPostRequest({ ...context, params: { ...context.params, slug } });
    response = serverResponse;
  } else {
    response = await context.next();
  }
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const schema = response.status >= 400 || isBlogArticlePath(requestUrl.pathname) ? null : schemaForPath(requestUrl.pathname);
  const html = await response.text();
  let nextHtml = replaceLegacyOrigin(html);
  nextHtml = injectMontserrat(nextHtml);
  nextHtml = injectNavServiceDropdown(nextHtml);
  nextHtml = injectServiceAssets(nextHtml, normalizedPath);
  nextHtml = versionCaseRecipeFix(nextHtml);
  nextHtml = injectBlogFaqTypography(nextHtml, normalizedPath);
  nextHtml = injectConsentAssets(nextHtml);
  nextHtml = normalizeFooter(nextHtml);
  nextHtml = removeLaRecetaLinks(nextHtml);
  nextHtml = optimizeAutoplayVideos(nextHtml);
  nextHtml = injectSeo(nextHtml, SEO_PAGES[normalizedPath]);
  nextHtml = enrichPregonero(nextHtml, normalizedPath);
  nextHtml = enrichCimientos(nextHtml, normalizedPath);
  nextHtml = enrichGracia(nextHtml, normalizedPath);
  nextHtml = enrichEmpujon(nextHtml, normalizedPath);
  if (normalizedPath === '/el-menu/el-empujon/' && nextHtml.includes('empujon-four-grid')) nextHtml = nextHtml.replace('</head>', EMPUJON_GRID_CSS + '</head>');
  if (normalizedPath === '/el-menu/gracia-y-presencia/' && nextHtml.includes('gracia-four-grid')) nextHtml = nextHtml.replace('</head>', GRACIA_GRID_CSS + '</head>');
  if (normalizedPath === '/el-menu/cimientos-digitales/' && nextHtml.includes('cimientos-four-grid')) nextHtml = nextHtml.replace('</head>', CIMIENTOS_GRID_CSS + '</head>');
  if (normalizedPath === '/el-menu/el-pregonero/' && nextHtml.includes('pregonero-four-grid')) nextHtml = nextHtml.replace('</head>', PREGONERO_GRID_CSS + '</head>');
  nextHtml = injectGtm(nextHtml);

  if (schema && !nextHtml.includes('id="salero-schema-graph"') && !nextHtml.includes("id='salero-schema-graph'")) {
    const jsonLd = replaceLegacyOrigin(renderJsonLd(schema));
    nextHtml = nextHtml.includes('</head>')
      ? nextHtml.replace('</head>', `  ${jsonLd}\n</head>`)
      : `${nextHtml}\n${jsonLd}`;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (response.status >= 400) {
    headers.set('X-Robots-Tag', 'noindex');
    headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  }

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function renderGoneResponse() {
  const html = `<!doctype html>
<html lang="es">
<head>
  <title>Página retirada | Salero Digital</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_ORIGIN}/">
  <link rel="stylesheet" href="/assets/css/main.css?v=50">
</head>
<body>
  <main class="container section">
    <h1>Página retirada temporalmente</h1>
    <p>Esta sección no está disponible en este momento.</p>
    <p><a class="btn btn-primary" href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate'
    }
  });
}

function injectMontserrat(html = '') {
  if (html.includes('/assets/css/font-body-montserrat.css')) return html;
  return injectBefore(html, '</head>', `  ${MONTSERRAT_CSS}\n`);
}

function injectNavServiceDropdown(html = '') {
  if (html.includes('/assets/js/nav-service-dropdown.js')) return html;
  return injectBefore(html, '</body>', `  ${NAV_SERVICE_DROPDOWN_JS}\n`);
}

function injectServiceAssets(html = '', path = '') {
  if (!isServiceDetailPath(path)) return html;
  let next = html;
  if (!next.includes('/assets/css/service-related.css')) next = injectBefore(next, '</head>', `  ${SERVICE_RELATED_CSS}\n`);
  next = injectOrReplaceStylesheet(next, '/assets/css/service-hero-sector-style.css', SERVICE_HERO_SECTOR_CSS);
  next = injectOrReplaceStylesheet(next, '/assets/css/service-mobile-nav.css', SERVICE_MOBILE_NAV_CSS);
  if (!next.includes('/assets/js/service-related.js')) next = injectBefore(next, '</body>', `  ${SERVICE_RELATED_JS}\n`);
  return next;
}

function versionCaseRecipeFix(html = '') {
  return injectOrReplaceStylesheet(html, '/assets/css/caso-receta-carousel-fix.css', CASE_RECIPE_FIX_CSS);
}

function injectBlogFaqTypography(html = '', path = '') {
  if (!isBlogArticlePath(path) && !hasFaqMarkup(html)) return html;
  return injectOrReplaceStylesheet(html, '/assets/css/ba-faq-typography.css', BLOG_FAQ_TYPOGRAPHY_CSS);
}

function injectConsentAssets(html = '') {
  let next = html;
  next = injectOrReplaceStylesheet(next, '/assets/css/consent.css', CONSENT_CSS);
  if (!next.includes('/assets/js/consent.js')) next = injectBefore(next, '</body>', `  ${CONSENT_JS}\n`);
  return next;
}

function hasFaqMarkup(html = '') {
  return /ba-faq|faq|pregunta|preguntas frecuentes|accordion/i.test(html);
}

function injectOrReplaceStylesheet(html = '', hrefPath = '', tag = '') {
  if (html.includes(hrefPath)) return html;
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function injectBefore(html = '', marker = '', fragment = '') {
  return html.includes(marker) ? html.replace(marker, `${fragment}${marker}`) : `${html}\n${fragment}`;
}

function injectGtm(html = '') {
  if (!GTM_ID || html.includes(GTM_ID)) return html;

  const consentDefault = `<!-- Google Consent Mode v2 -->
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
  personalization_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
</script>
<!-- End Google Consent Mode v2 -->`;

  const gtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;

  const gtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

  let next = injectBefore(html, '</head>', `  ${consentDefault}\n  ${gtmHead}\n`);
  next = next.replace(/<body([^>]*)>/i, `<body$1>\n  ${gtmBody}`);
  return next;
}

function normalizeFooter(html = '') {
  if (!/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>/i.test(html)) return html;
  return html.replace(/<footer\b[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/footer>/i, GLOBAL_FOOTER);
}

function removeLaRecetaLinks(html = '') {
  return html;
}

function optimizeAutoplayVideos(html = '') {
  return html;
}

function injectSeo(html = '', data) {
  if (!data) return replaceLegacyOrigin(html);

  let next = replaceOrInsertTitle(html, data.title);
  next = replaceOrInsertMetaDescription(next, data.description);
  next = replaceOrInsertCanonical(next, absoluteUrl(data.canonical));
  return replaceLegacyOrigin(next);
}

function replaceOrInsertTitle(html = '', title = '') {
  if (!title) return html;
  const tag = `<title>${escapeHtml(title)}</title>`;
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, tag);
  }
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function replaceOrInsertMetaDescription(html = '', description = '') {
  if (!description) return html;
  const tag = `<meta name="description" content="${escapeAttr(description)}">`;
  const re = /<meta[^>]+name=["']description["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function replaceOrInsertCanonical(html = '', canonical = '') {
  if (!canonical) return html;
  const tag = `<link rel="canonical" href="${escapeAttr(canonical)}">`;
  const re = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return injectBefore(html, '</head>', `  ${tag}\n`);
}

function isBlogArticlePath(pathname = '/') {
  const normalized = normalizePath(pathname);
  return /^\/la-rebotica\/[^/]+\/$/.test(normalized);
}

function isServiceDetailPath(pathname = '/') {
  return /^\/el-menu\/[^/]+\/$/.test(pathname || '');
}

function normalizePath(pathname = '/') {
  const clean = String(pathname || '/').split('?')[0].split('#')[0];
  if (clean === '/') return '/';
  return `/${clean.replace(/^\/+|\/+$/g, '')}/`;
}

function absoluteUrl(value = '/') {
  if (/^https?:\/\//i.test(String(value))) return replaceLegacyOrigin(String(value));
  return `${SITE_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`;
}

function replaceLegacyOrigin(value = '') {
  return String(value || '').replaceAll(LEGACY_ORIGIN, SITE_ORIGIN);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
