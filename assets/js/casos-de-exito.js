const SALERO_CASOS_FALLBACK = [
  {
    title: 'Gestamp Digital Summit',
    slug: 'gestamp-digital-summit',
    sector: 'Industria y formación corporativa',
    service: 'Desarrollo web, evento digital y experiencia privada',
    proof: 'Tecnología para un evento corporativo de alta exigencia',
    excerpt: 'Desarrollo de una experiencia digital para centralizar información, acceso a sesiones, contenidos y recursos de un evento corporativo de alta exigencia.'
  },
  {
    title: 'Fundación ONCE',
    slug: 'fundacion-once',
    sector: 'Formación, eventos e impacto social',
    service: 'Campañas digitales multicanal',
    proof: 'Campañas nacionales con estrategia y segmentación por plataforma',
    excerpt: 'Estrategia y ejecución de campañas para dar visibilidad a eventos, cursos e iniciativas formativas, adaptando mensaje, público y canal según cada objetivo.'
  },
  {
    title: 'Muebles Sarria',
    slug: 'muebles-sarria',
    sector: 'Retail, decoración y climatización',
    service: 'Google Ads, email, SMS, WhatsApp, contenidos y landings',
    proof: 'Sistema de captación multicanal para retail local',
    excerpt: 'Activación de campañas y contenidos para diferentes líneas de negocio, combinando buscadores, redes sociales, email, SMS, WhatsApp y páginas orientadas a conversión.'
  },
  {
    title: 'Comercial Vázquez',
    slug: 'comercial-vazquez',
    sector: 'Electrodomésticos, cocinas y comercio local',
    service: 'Contenidos, campañas, estrategia social y posicionamiento',
    proof: 'Comunicación digital para productos y servicios de alto valor',
    excerpt: 'Estrategia de contenidos y comunicación para acercar productos, proyectos de cocina y campañas comerciales a una audiencia local con alta intención de compra.'
  },
  {
    title: 'Enoro',
    slug: 'enoro',
    sector: 'Aceite de oliva virgen extra y agroalimentación',
    service: 'Web, ecommerce, soporte digital y marca',
    proof: 'Presencia digital para una marca agroalimentaria con producto de origen',
    excerpt: 'Trabajo digital orientado a reforzar la marca, mejorar su presencia online y acompañar el canal comercial de una empresa agroalimentaria con producto propio.'
  },
  {
    title: 'Museo de la Cal de Morón',
    slug: 'museo-de-la-cal-de-moron',
    sector: 'Cultura, turismo y patrimonio',
    service: 'Web, ecommerce y experiencia digital',
    proof: 'Digitalización de un proyecto cultural con raíz local',
    excerpt: 'Mejora de la presencia digital de un espacio cultural y patrimonial, con una estructura preparada para informar, vender, captar visitas y reforzar su valor turístico.'
  }
];

function saleroCasoField(item = {}, keys = [], fallback = '') {
  const acf = getAcf(item);
  for (const key of keys) {
    if (acf && acf[key]) return stripHtml(String(acf[key]));
    if (item && item[key]) return stripHtml(String(item[key]));
  }
  return fallback;
}

function saleroCasoTitle(item = {}) {
  if (item.title && item.title.rendered) return stripHtml(item.title.rendered);
  return item.title || '';
}

function saleroCasoExcerpt(item = {}) {
  if (item.excerpt && item.excerpt.rendered) return stripHtml(item.excerpt.rendered);
  return item.excerpt || saleroCasoField(item, ['resumen', 'resumen_del_reto', 'descripcion_corta', 'descripcion'], '');
}

function renderCasoCard(item = {}) {
  const title = saleroCasoTitle(item);
  const slug = item.slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sector = saleroCasoField(item, ['sector', 'sector_cliente', 'tipo_de_cliente'], 'Caso de éxito');
  const service = saleroCasoField(item, ['servicio_principal', 'servicios', 'servicio'], 'Estrategia digital');
  const proof = saleroCasoField(item, ['resultado', 'dato_destacado', 'mejora_conseguida'], 'Proyecto real de Salero Digital');
  const excerpt = saleroCasoExcerpt(item);
  const url = `/casos-de-exito/${slug}/`;

  return `<article class="caso-card">
    <div class="caso-card-top">
      <span class="caso-sector">${escapeHtml(sector)}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(excerpt).slice(0,230)}</p>
    </div>
    <div class="caso-meta">
      <div class="caso-service">
        <small>Servicio principal</small>
        <strong>${escapeHtml(service)}</strong>
      </div>
      <div class="caso-proof">
        <small>Qué demuestra</small>
        <strong>${escapeHtml(proof)}</strong>
      </div>
      <a class="caso-link" href="${url}" aria-label="Ver caso de éxito de ${escapeHtml(title)}">Ver caso</a>
    </div>
  </article>`;
}

async function renderCasosPage() {
  const root = document.querySelector('[data-casos]');
  if (!root) return;

  root.innerHTML = '<div class="loading">Cargando casos de éxito desde el CMS...</div>';

  try {
    const endpoint = (SALERO_CONFIG.endpoints && SALERO_CONFIG.endpoints.casos) ? 'casos' : 'casos-exito';
    const items = await getCollection(endpoint);
    const validItems = Array.isArray(items) ? items.filter(Boolean) : [];
    root.innerHTML = (validItems.length ? validItems : SALERO_CASOS_FALLBACK).map(renderCasoCard).join('');
  } catch (error) {
    console.warn('No se pudieron cargar los casos desde WordPress. Se usa contenido provisional.', error);
    root.innerHTML = SALERO_CASOS_FALLBACK.map(renderCasoCard).join('');
  }
}

document.addEventListener('DOMContentLoaded', renderCasosPage);
