export const SITE_ORIGIN = 'https://salero.webagencia360.com';

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const DEFAULT_AREA_SERVED = [
  'Morón de la Frontera',
  'Sierra Sur de Sevilla',
  'Campiña de Sevilla',
  'Andalucía'
];

const SERVICES = {
  'cimientos-digitales': {
    name: 'Cimientos Digitales',
    description: 'Desarrollo web senior para negocios que necesitan una sede digital rápida, segura, clara y preparada para convertir.',
    serviceType: 'Desarrollo web senior',
    audience: 'Pymes, comercios, marcas locales y empresas que necesitan una web profesional'
  },
  'el-pregonero': {
    name: 'El Pregonero',
    description: 'SEO local y posicionamiento para negocios que necesitan aparecer mejor en Google, Google Maps y búsquedas de proximidad.',
    serviceType: 'SEO local y posicionamiento',
    audience: 'Negocios locales, comercios, servicios profesionales y empresas de la comarca'
  },
  'gracia-y-presencia': {
    name: 'Gracia y Presencia',
    description: 'Gestión de redes sociales y contenido para negocios que necesitan presencia, comunidad, confianza y criterio comercial.',
    serviceType: 'Gestión de redes sociales y contenido',
    audience: 'Empresas locales, comercios, hostelería, marcas de producto y servicios'
  },
  'el-empujon': {
    name: 'El Empujón',
    description: 'Campañas de Google Ads, Meta Ads y publicidad digital para captar oportunidades reales con inversión controlada.',
    serviceType: 'Publicidad digital y campañas Ads',
    audience: 'Negocios que necesitan captación, leads, llamadas, reservas o ventas'
  }
};

const PACKS = {
  'el-pellizco': {
    name: 'El Pellizco',
    description: 'Pack básico para empezar con presencia digital, SEO local, Google Business Profile, una red social y soporte.',
    serviceName: 'Pack básico de presencia digital'
  },
  'media-racion': {
    name: 'Media Ración',
    description: 'Pack recomendado para empresas que quieren trabajar web, SEO, redes sociales y una primera activación de campañas.',
    serviceName: 'Pack de crecimiento digital'
  },
  'menu-degustacion': {
    name: 'El Menú Degustación',
    description: 'Pack integral para negocios que necesitan estrategia avanzada, web, SEO, contenido, campañas y acompañamiento digital.',
    serviceName: 'Pack integral de marketing digital'
  }
};

const SECTORS = {
  'marketing-para-hosteleria-turismo': {
    name: 'Marketing para hostelería y turismo',
    description: 'Estrategia digital para bares, restaurantes, cafeterías, alojamientos rurales y negocios turísticos que necesitan reservas, reputación y visibilidad.',
    serviceType: 'Marketing digital para hostelería y turismo',
    audience: 'Bares, restaurantes, cafeterías, alojamientos rurales y negocios turísticos'
  },
  'marketing-para-comercios-pymes': {
    name: 'Marketing para comercios y pymes',
    description: 'Estrategia digital para comercios locales y pequeñas empresas que necesitan visibilidad, confianza y ventas de proximidad.',
    serviceType: 'Marketing digital para comercios y pymes',
    audience: 'Comercios locales, autónomos, pymes y negocios de calle'
  },
  'marketing-para-almazaras-aceite': {
    name: 'Marketing para almazaras y aceite',
    description: 'Estrategia digital para almazaras, marcas de aceite y proyectos agroalimentarios que necesitan transmitir origen, producto y marca.',
    serviceType: 'Marketing digital para almazaras y aceite',
    audience: 'Almazaras, cooperativas, marcas de aceite y proyectos agroalimentarios'
  }
};

const CASES = {
  'fundacion-once': {
    name: 'Fundación ONCE',
    description: 'Caso de éxito de comunicación, captación y activación digital para un proyecto de alcance nacional.',
    service: 'Estrategia digital y campañas'
  },
  'gestamp-digital-summit': {
    name: 'Gestamp Digital Summit',
    description: 'Caso de éxito de plataforma digital, evento online, contenidos y experiencia de usuario para un entorno corporativo.',
    service: 'Desarrollo web y experiencia digital'
  },
  'muebles-sarria': {
    name: 'Muebles Sarria',
    description: 'Caso de éxito de marketing digital, contenidos, campañas y activación comercial para una marca local de mobiliario y decoración.',
    service: 'Marketing digital y campañas'
  },
  'comercial-vazquez': {
    name: 'Comercial Vázquez',
    description: 'Caso de éxito de estrategia de contenidos, redes sociales y posicionamiento digital para una empresa local de electrodomésticos y cocinas.',
    service: 'Contenido, SEO y redes sociales'
  },
  'enoro': {
    name: 'ENORO',
    description: 'Caso de éxito de comunicación digital, contenido y marca para un proyecto de aceite de oliva virgen extra.',
    service: 'Contenido y estrategia de marca'
  },
  'museo-de-la-cal-de-moron': {
    name: 'Museo de la Cal de Morón',
    description: 'Caso de éxito de desarrollo web, optimización técnica y accesibilidad para un proyecto cultural y patrimonial.',
    service: 'Desarrollo web y optimización técnica'
  }
};

export function schemaGraph(items = []) {
  return cleanSchema({
    '@context': 'https://schema.org',
    '@graph': flatten(items).filter(Boolean)
  });
}

export function renderJsonLd(schema) {
  if (!schema) return '';
  const json = JSON.stringify(cleanSchema(schema))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<script id="salero-schema-graph" type="application/ld+json">${json}</script>`;
}

export function organizationSchema() {
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORGANIZATION_ID,
    name: 'Salero Digital',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/assets/img/favicon.svg`,
    image: `${SITE_ORIGIN}/assets/img/favicon.svg`,
    slogan: 'Tu marca, con salero',
    description: 'Agencia digital para negocios locales que necesitan estrategia, desarrollo web, SEO, redes sociales y campañas con criterio comercial.',
    telephone: '+34665688916',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Morón de la Frontera',
      addressRegion: 'Sevilla',
      addressCountry: 'ES'
    },
    areaServed: DEFAULT_AREA_SERVED.map((name) => ({ '@type': 'AdministrativeArea', name }))
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Salero Digital',
    url: SITE_ORIGIN,
    inLanguage: 'es-ES',
    publisher: { '@id': ORGANIZATION_ID }
  };
}

export function webPageSchema({ url, name, description, type = 'WebPage', primaryImage, datePublished, dateModified } = {}) {
  return {
    '@type': type,
    '@id': `${absoluteUrl(url)}#webpage`,
    url: absoluteUrl(url),
    name,
    description,
    inLanguage: 'es-ES',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    primaryImageOfPage: primaryImage ? { '@type': 'ImageObject', url: absoluteUrl(primaryImage) } : undefined,
    datePublished,
    dateModified
  };
}

export function breadcrumbSchema(items = []) {
  const normalized = items.map((item) => ({
    name: item.name,
    url: absoluteUrl(item.url)
  })).filter((item) => item.name && item.url);

  if (!normalized.length) return null;

  return {
    '@type': 'BreadcrumbList',
    '@id': `${normalized[normalized.length - 1].url}#breadcrumb`,
    itemListElement: normalized.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function serviceSchema({ name, description, url, serviceType, audience, areaServed = DEFAULT_AREA_SERVED } = {}) {
  if (!name || !url) return null;

  return {
    '@type': 'Service',
    '@id': `${absoluteUrl(url)}#service`,
    name,
    description,
    serviceType,
    provider: { '@id': ORGANIZATION_ID },
    areaServed: areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
    audience: audience ? { '@type': 'Audience', audienceType: audience } : undefined,
    url: absoluteUrl(url)
  };
}

export function offerCatalogSchema({ url = '/nuestros-menus/', name = 'Nuestros menús digitales', offers } = {}) {
  const items = Array.isArray(offers) && offers.length ? offers : Object.entries(PACKS).map(([slug, pack]) => ({ slug, ...pack }));

  return {
    '@type': 'OfferCatalog',
    '@id': `${absoluteUrl(url)}#offer-catalog`,
    name,
    url: absoluteUrl(url),
    itemListElement: items.map((item) => ({
      '@type': 'Offer',
      name: item.name,
      description: item.description,
      url: absoluteUrl(item.url || `/nuestros-menus/${item.slug}/`),
      itemOffered: {
        '@type': 'Service',
        name: item.serviceName || item.name,
        provider: { '@id': ORGANIZATION_ID }
      }
    }))
  };
}

export function itemListSchema({ url, name, items = [] } = {}) {
  if (!items.length) return null;

  return {
    '@type': 'ItemList',
    '@id': `${absoluteUrl(url)}#item-list`,
    name,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url)
    }))
  };
}

export function blogPostingSchema({ post, title, description, url, image, categories = [], content, faqs = [] } = {}) {
  if (!title || !url) return null;

  const published = post?.date_gmt || post?.date;
  const modified = post?.modified_gmt || post?.modified || published;

  return [
    {
      '@type': 'BlogPosting',
      '@id': `${absoluteUrl(url)}#article`,
      mainEntityOfPage: { '@id': `${absoluteUrl(url)}#webpage` },
      headline: title,
      description,
      image: image?.url ? [absoluteUrl(image.url)] : undefined,
      datePublished: published,
      dateModified: modified,
      inLanguage: 'es-ES',
      author: { '@id': ORGANIZATION_ID },
      publisher: { '@id': ORGANIZATION_ID },
      articleSection: categories,
      keywords: categories,
      wordCount: content ? wordCount(content) : undefined,
      url: absoluteUrl(url)
    },
    faqPageSchema({ url, faqs })
  ];
}

export function faqPageSchema({ url, faqs = [] } = {}) {
  const items = Array.isArray(faqs) ? faqs.filter((item) => item?.q && item?.a) : [];
  if (!items.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(url)}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: stripHtml(item.q),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(item.a)
      }
    }))
  };
}

export function caseStudySchema({ title, description, url, image, client, service } = {}) {
  if (!title || !url) return null;

  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(url)}#case-study`,
    headline: title,
    description,
    image: image ? [absoluteUrl(image)] : undefined,
    inLanguage: 'es-ES',
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    about: [
      client ? { '@type': 'Organization', name: client } : null,
      service ? { '@type': 'Service', name: service, provider: { '@id': ORGANIZATION_ID } } : null
    ].filter(Boolean),
    mainEntityOfPage: { '@id': `${absoluteUrl(url)}#webpage` },
    url: absoluteUrl(url)
  };
}

export function schemaForPath(pathname = '/') {
  const path = normalizePath(pathname);
  const page = staticPageData(path);

  if (path.startsWith('/api/')) return null;
  if (path.startsWith('/assets/')) return null;

  const common = [organizationSchema(), websiteSchema()];

  if (page) {
    return schemaGraph([
      common,
      webPageSchema(page),
      breadcrumbSchema(page.breadcrumb),
      page.extra
    ]);
  }

  const serviceMatch = matchSlug(path, '/el-menu/');
  if (serviceMatch && SERVICES[serviceMatch]) {
    const item = SERVICES[serviceMatch];
    const url = `/el-menu/${serviceMatch}/`;
    return schemaGraph([
      common,
      webPageSchema({ url, name: item.name, description: item.description, type: 'ServicePage' }),
      breadcrumbSchema([{ name: 'Inicio', url: '/' }, { name: 'El Menú', url: '/el-menu/' }, { name: item.name, url }]),
      serviceSchema({ ...item, url })
    ]);
  }

  const packMatch = matchSlug(path, '/nuestros-menus/');
  if (packMatch && PACKS[packMatch]) {
    const item = PACKS[packMatch];
    const url = `/nuestros-menus/${packMatch}/`;
    return schemaGraph([
      common,
      webPageSchema({ url, name: item.name, description: item.description }),
      breadcrumbSchema([{ name: 'Inicio', url: '/' }, { name: 'Nuestros menús', url: '/nuestros-menus/' }, { name: item.name, url }]),
      offerCatalogSchema({ url: '/nuestros-menus/', offers: [{ slug: packMatch, ...item }] })
    ]);
  }

  const sectorMatch = matchSlug(path, '/sectores/');
  if (sectorMatch && SECTORS[sectorMatch]) {
    const item = SECTORS[sectorMatch];
    const url = `/sectores/${sectorMatch}/`;
    return schemaGraph([
      common,
      webPageSchema({ url, name: item.name, description: item.description, type: 'ServicePage' }),
      breadcrumbSchema([{ name: 'Inicio', url: '/' }, { name: 'Sectores', url: '/sectores/' }, { name: item.name, url }]),
      serviceSchema({ ...item, url })
    ]);
  }

  const caseMatch = matchSlug(path, '/casos-de-exito/');
  if (caseMatch && CASES[caseMatch]) {
    const item = CASES[caseMatch];
    const url = `/casos-de-exito/${caseMatch}/`;
    return schemaGraph([
      common,
      webPageSchema({ url, name: item.name, description: item.description }),
      breadcrumbSchema([{ name: 'Inicio', url: '/' }, { name: 'Casos de éxito', url: '/casos-de-exito/' }, { name: item.name, url }]),
      caseStudySchema({ title: item.name, description: item.description, url, client: item.name, service: item.service })
    ]);
  }

  return null;
}

function staticPageData(path) {
  const pages = {
    '/': {
      url: '/',
      name: 'Salero Digital',
      description: 'Agencia digital para negocios locales que quieren mejorar su web, SEO, redes sociales y campañas con estrategia y cercanía.',
      type: 'HomePage',
      breadcrumb: [{ name: 'Inicio', url: '/' }],
      extra: [
        itemListSchema({
          url: '/',
          name: 'Servicios principales de Salero Digital',
          items: Object.entries(SERVICES).map(([slug, item]) => ({ name: item.name, url: `/el-menu/${slug}/` }))
        })
      ]
    },
    '/el-menu/': {
      url: '/el-menu/',
      name: 'El Menú',
      description: 'Servicios digitales de Salero Digital: desarrollo web, SEO local, redes sociales y campañas de publicidad digital.',
      type: 'CollectionPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'El Menú', url: '/el-menu/' }],
      extra: itemListSchema({
        url: '/el-menu/',
        name: 'Servicios digitales',
        items: Object.entries(SERVICES).map(([slug, item]) => ({ name: item.name, url: `/el-menu/${slug}/` }))
      })
    },
    '/nuestros-menus/': {
      url: '/nuestros-menus/',
      name: 'Nuestros menús',
      description: 'Packs comerciales de Salero Digital para empezar con presencia digital, crecer o activar una estrategia integral.',
      type: 'CollectionPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Nuestros menús', url: '/nuestros-menus/' }],
      extra: offerCatalogSchema()
    },
    '/sectores/': {
      url: '/sectores/',
      name: 'Sectores',
      description: 'Marketing digital para sectores que mueven la comarca: hostelería, comercio local, pymes, almazaras y aceite.',
      type: 'CollectionPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Sectores', url: '/sectores/' }],
      extra: itemListSchema({
        url: '/sectores/',
        name: 'Sectores trabajados',
        items: Object.entries(SECTORS).map(([slug, item]) => ({ name: item.name, url: `/sectores/${slug}/` }))
      })
    },
    '/casos-de-exito/': {
      url: '/casos-de-exito/',
      name: 'Casos de éxito',
      description: 'Portfolio y casos de éxito de Salero Digital en estrategia, desarrollo web, campañas, contenidos y marketing digital.',
      type: 'CollectionPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'Casos de éxito', url: '/casos-de-exito/' }],
      extra: itemListSchema({
        url: '/casos-de-exito/',
        name: 'Casos de éxito',
        items: Object.entries(CASES).map(([slug, item]) => ({ name: item.name, url: `/casos-de-exito/${slug}/` }))
      })
    },
    '/la-rebotica/': {
      url: '/la-rebotica/',
      name: 'La Rebotica',
      description: 'Blog de Salero Digital con guías, ideas y consejos de marketing digital, SEO local, redes sociales y desarrollo web.',
      type: 'Blog',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'La Rebotica', url: '/la-rebotica/' }]
    },
    '/hablamos/': {
      url: '/hablamos/',
      name: '¿Hablamos?',
      description: 'Página de contacto de Salero Digital para solicitar una cata digital y revisar oportunidades de mejora online.',
      type: 'ContactPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: '¿Hablamos?', url: '/hablamos/' }]
    },
    '/hablamos/gracias/': {
      url: '/hablamos/gracias/',
      name: 'Gracias por contactar',
      description: 'Confirmación de envío del formulario de contacto de Salero Digital.',
      type: 'WebPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: '¿Hablamos?', url: '/hablamos/' }, { name: 'Gracias', url: '/hablamos/gracias/' }]
    },
    '/la-receta/': {
      url: '/la-receta/',
      name: 'La Receta',
      description: 'La filosofía, el enfoque y la forma de trabajar de Salero Digital como agencia cercana, senior y orientada a negocio.',
      type: 'AboutPage',
      breadcrumb: [{ name: 'Inicio', url: '/' }, { name: 'La Receta', url: '/la-receta/' }]
    }
  };

  return pages[path] || null;
}

function matchSlug(path, basePath) {
  if (!path.startsWith(basePath)) return null;
  const rest = path.slice(basePath.length).replace(/^\/+|\/+$/g, '');
  if (!rest || rest.includes('/')) return null;
  return rest;
}

function normalizePath(pathname = '/') {
  const urlPath = String(pathname || '/').split('?')[0].split('#')[0];
  if (urlPath === '/') return '/';
  return `/${urlPath.replace(/^\/+|\/+$/g, '')}/`;
}

function absoluteUrl(value = '/') {
  if (!value) return SITE_ORIGIN;
  const string = String(value);
  if (/^https?:\/\//i.test(string)) return string;
  return `${SITE_ORIGIN}${string.startsWith('/') ? string : `/${string}`}`;
}

function flatten(items = []) {
  return items.flatMap((item) => Array.isArray(item) ? flatten(item) : item);
}

function cleanSchema(value) {
  if (Array.isArray(value)) {
    return value.map(cleanSchema).filter((item) => item !== undefined && item !== null && !(Array.isArray(item) && !item.length));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanSchema(item)])
        .filter(([, item]) => {
          if (item === undefined || item === null || item === '') return false;
          if (Array.isArray(item) && !item.length) return false;
          if (typeof item === 'object' && !Array.isArray(item) && !Object.keys(item).length) return false;
          return true;
        })
    );
  }

  return value;
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(value = '') {
  return stripHtml(value).split(/\s+/).filter(Boolean).length;
}
