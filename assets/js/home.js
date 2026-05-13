(function(){
  const cfg = (typeof SALERO_CONFIG !== 'undefined') ? SALERO_CONFIG : {
    apiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
    endpoints: { menus:'menu-packs', servicios:'servicios', sectores:'sectores' }
  };

  function endpointUrl(endpoint){
    if(endpoint.startsWith('http')) return endpoint;
    if(endpoint.startsWith('salero/')) return `${cfg.apiBase.replace('/wp/v2','')}/${endpoint}`;
    return `${cfg.apiBase}/${endpoint}`;
  }

  async function fetchCollection(endpoint){
    const url = new URL(endpointUrl(endpoint));
    url.searchParams.set('per_page','100');
    url.searchParams.set('_embed','1');
    const res = await fetch(url.toString(), { mode:'cors' });
    if(!res.ok) throw new Error(`${endpoint} respondió ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error(`${endpoint} no devolvió una lista`);
    return data;
  }

  async function fetchWithFallback(endpoints){
    const list = Array.isArray(endpoints) ? endpoints : [endpoints];
    let lastError;
    for(const endpoint of list){
      try{
        const data = await fetchCollection(endpoint);
        if(data.length || endpoint === list[list.length-1]) return data;
      }catch(error){
        lastError = error;
        console.warn('Salero Digital: no se pudo cargar', endpoint, error);
      }
    }
    throw lastError || new Error('No se pudo cargar la colección');
  }

  function strip(value=''){
    if(typeof stripHtml === 'function') return stripHtml(value);
    const el = document.createElement('div');
    el.innerHTML = value || '';
    return el.textContent || el.innerText || '';
  }

  function esc(value=''){
    if(typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function acf(item={}){ return item.salero_acf || item.acf || {}; }
  function title(item={}){ return strip(item?.title?.rendered || ''); }
  function excerpt(item={}){ return strip(item?.excerpt?.rendered || ''); }
  function cardText(item={}){
    const a = acf(item);
    return a.claim || a.subtitulo_comercial || a.titular_seo || a.meta_description || excerpt(item) || '';
  }

  function renderServiceRow(item,index){
    const a = acf(item);
    const name = title(item);
    const meta = a.nombre_tecnico || 'Servicio digital';
    const desc = strip(cardText(item)).slice(0,230);
    return `<article class="service-row">
      <span class="service-index">${String(index+1).padStart(2,'0')}</span>
      <div><div class="service-meta">${esc(meta)}</div><h3>${esc(name)}</h3></div>
      <p>${esc(desc)}</p>
      <a class="editorial-link" href="/el-menu/${item.slug}/">Ver servicio</a>
    </article>`;
  }

  function renderMenuCard(item){
    const a = acf(item);
    const name = title(item);
    const desc = strip(cardText(item)).slice(0,240);
    const ideal = strip(a.ideal_para || '').slice(0,130);
    const featured = name.toLowerCase().includes('media') ? ' featured' : '';
    const tag = name.toLowerCase().includes('media') ? 'Recomendado' : 'Menú';
    return `<article class="menu-card${featured}">
      <span class="tag">${tag}</span>
      <h3>${esc(name)}</h3>
      <p>${esc(desc)}</p>
      ${ideal ? `<p><strong>Ideal para:</strong> ${esc(ideal)}</p>` : ''}
      <a class="card-link editorial-link" href="/nuestros-menus/${item.slug}/">Ver ${esc(name)}</a>
    </article>`;
  }

  function renderSectorCard(item){
    const name = title(item);
    const desc = strip(cardText(item)).slice(0,190);
    return `<article class="sector-card">
      <span class="tag">Sector</span>
      <h3>${esc(name.replace('Marketing para ',''))}</h3>
      <p>${esc(desc)}</p>
      <a class="editorial-link" href="/sectores/${item.slug}/">Ver sector</a>
    </article>`;
  }

  async function renderSection(selector,endpoints,renderer,label){
    const container = document.querySelector(selector);
    if(!container) return;
    try{
      const items = await fetchWithFallback(endpoints);
      container.innerHTML = items.length
        ? items.map(renderer).join('')
        : '<div class="error">Todavía no hay contenido publicado en WordPress.</div>';
    }catch(error){
      console.error(`Salero Digital: error cargando ${label}`, error);
      container.innerHTML = `<div class="error">No se pudo cargar ${esc(label)} desde WordPress. Revisa la consola del navegador.</div>`;
    }
  }

  function renderHome(){
    renderSection('[data-home-servicios]', cfg.endpoints?.servicios || 'servicios', renderServiceRow, 'servicios');
    renderSection('[data-home-menus]', [cfg.endpoints?.menus || 'menu-packs','menus','salero/v1/menu-packs'], renderMenuCard, 'menús');
    renderSection('[data-home-sectores]', cfg.endpoints?.sectores || 'sectores', renderSectorCard, 'sectores');
  }

  document.addEventListener('DOMContentLoaded', renderHome);
})();
