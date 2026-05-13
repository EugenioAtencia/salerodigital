function cardText(item){
  const a=getAcf(item);
  return a.claim||a.subtitulo_comercial||a.titular_seo||a.meta_description||excerpt(item)||'';
}
function technicalName(item){
  const a=getAcf(item);
  return a.nombre_tecnico||a.ideal_para||'Salero Digital';
}
function renderServiceRow(item,index){
  const title=itemTitle(item);
  const desc=stripHtml(cardText(item)).slice(0,220);
  const meta=technicalName(item);
  return `<article class="service-row">
    <span class="service-index">${String(index+1).padStart(2,'0')}</span>
    <div><div class="service-meta">${escapeHtml(stripHtml(meta))}</div><h3>${escapeHtml(title)}</h3></div>
    <p>${escapeHtml(desc)}</p>
    <a class="editorial-link" href="/el-menu/${item.slug}/">Ver servicio</a>
  </article>`;
}
function renderMenuCard(item,index){
  const title=itemTitle(item);
  const desc=stripHtml(cardText(item)).slice(0,230);
  const a=getAcf(item);
  const ideal=stripHtml(a.ideal_para||'').slice(0,110);
  const featured=title.toLowerCase().includes('media') ? ' featured' : '';
  return `<article class="menu-card${featured}">
    <span class="tag">${index===1?'Recomendado':'Menú'}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(desc)}</p>
    ${ideal?`<p><strong>Ideal para:</strong> ${escapeHtml(ideal)}</p>`:''}
    <a class="card-link editorial-link" href="/nuestros-menus/${item.slug}/">Ver ${escapeHtml(title)}</a>
  </article>`;
}
function renderSectorCard(item){
  const title=itemTitle(item);
  const desc=stripHtml(cardText(item)).slice(0,180);
  return `<article class="sector-card">
    <span class="tag">Sector</span>
    <h3>${escapeHtml(title.replace('Marketing para ',''))}</h3>
    <p>${escapeHtml(desc)}</p>
    <a class="editorial-link" href="/sectores/${item.slug}/">Ver sector</a>
  </article>`;
}
async function renderHome(){
  const sg=document.querySelector('[data-home-servicios]'),mg=document.querySelector('[data-home-menus]'),tg=document.querySelector('[data-home-sectores]');
  try{
    const [servicios,menus,sectores]=await Promise.all([
      getCollection(SALERO_CONFIG.endpoints.servicios),
      getCollection(SALERO_CONFIG.endpoints.menus),
      getCollection(SALERO_CONFIG.endpoints.sectores)
    ]);
    if(sg)sg.innerHTML=servicios.map(renderServiceRow).join('');
    if(mg)mg.innerHTML=menus.map(renderMenuCard).join('');
    if(tg)tg.innerHTML=sectores.map(renderSectorCard).join('');
  }catch(e){
    console.error(e);
    [sg,mg,tg].forEach(g=>{if(g)g.innerHTML='<div class="error">No se pudo cargar el contenido desde WordPress.</div>'})
  }
}
document.addEventListener('DOMContentLoaded',renderHome);
