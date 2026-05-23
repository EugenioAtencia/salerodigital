function stripHtml(html=''){
  const d=document.createElement('div');
  d.innerHTML=html;
  return d.textContent||d.innerText||'';
}

function escapeHtml(v=''){
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function hasHtml(v=''){
  return /<\/?[a-z][\s\S]*>/i.test(String(v));
}

function normalizeUrl(v=''){
  if(!v)return SALERO_CONFIG.contactUrl;
  if(v.startsWith('http'))return v;
  if(v.startsWith('/'))return v;
  return `/${v.replace(/^\/+|\/+$/g,'')}/`;
}

function getAcf(item={}){
  return item.salero_acf || item.acf || {};
}

function featuredImage(item={}){
  if(item.featured_image_url)return item.featured_image_url;
  const m=item._embedded&&item._embedded['wp:featuredmedia'];
  return m&&m[0]&&m[0].source_url?m[0].source_url:null;
}

function formatText(v=''){
  const t=String(v||'').trim();
  if(!t)return '';
  if(hasHtml(t))return t;
  return t.split(/\n{2,}/).map(p=>`<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
}

function formatList(v=''){
  const t=String(v||'').trim();
  if(!t)return '';
  if(hasHtml(t))return t;
  return `<ul>${t.split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}

function formatFaqs(v=''){
  const t=String(v||'').trim();
  if(!t)return '';
  const blocks=t.split(/(?=###\s)/).map(b=>b.trim()).filter(Boolean);
  if(blocks.length>1||t.startsWith('###')){
    return `<div class="faq-list">${blocks.map(b=>{
      let lines=b.split(/\n+/).map(l=>l.trim()).filter(Boolean);
      let q=(lines.shift()||'').replace(/^###\s*/,'');
      return `<details><summary>${escapeHtml(q)}</summary>${formatText(lines.join('\n\n'))}</details>`;
    }).join('')}</div>`;
  }
  return `<div class="faq-list"><details open><summary>Preguntas frecuentes</summary>${formatText(t)}</details></div>`;
}

function itemTitle(item={}){
  return item.title&&item.title.rendered?stripHtml(item.title.rendered):'';
}

function excerpt(item={}){
  if(item.excerpt&&item.excerpt.rendered)return stripHtml(item.excerpt.rendered);
  const a=getAcf(item);
  return a.claim||a.subtitulo_comercial||a.titular_seo||a.meta_description||'';
}

function setSeoFromItem(item={}){
  const a=getAcf(item);
  const title=a.meta_title||a.og_title||itemTitle(item);
  const desc=a.meta_description||a.og_description||excerpt(item);
  if(title)document.title=`${stripHtml(title)} | Salero Digital`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta&&desc)meta.setAttribute('content',stripHtml(desc).slice(0,160));
}

function sectorCardKind(item={}){
  const t=`${item.slug||''} ${itemTitle(item)}`.toLowerCase();
  if(t.includes('hosteler')||t.includes('turismo')||t.includes('restaurante')||t.includes('alojamiento'))return 'hosteleria';
  if(t.includes('comercio')||t.includes('pyme')||t.includes('pymes')||t.includes('tienda'))return 'comercio';
  if(t.includes('almazara')||t.includes('aceite')||t.includes('olivar')||t.includes('oliva'))return 'aceite';
  return 'generico';
}

function sectorCardLabel(kind='generico'){
  if(kind==='hosteleria')return 'Reservas, imagen y reputación';
  if(kind==='comercio')return 'Visibilidad local y ventas';
  if(kind==='aceite')return 'Origen, producto y marca';
  return 'Estrategia sectorial';
}

function renderSectorIcon(kind='generico'){
  const attrs='viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"';
  if(kind==='hosteleria')return `<svg ${attrs}><path d="M18 35c0-9.4 6.2-17 14-17s14 7.6 14 17" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M14 36h36" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M20 44h24" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M32 14v4" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M29 14h6" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>`;
  if(kind==='comercio')return `<svg ${attrs}><path d="M16 29h32l-3-12H19l-3 12Z" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M20 29v18h24V29" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M28 47V36h8v11" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M16 29c0 4 3.2 6 6.3 6 2.8 0 4.8-1.7 5.7-4 .9 2.3 2.9 4 5.7 4s4.8-1.7 5.7-4c.9 2.3 2.9 4 5.7 4 3.1 0 6.3-2 6.3-6" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if(kind==='aceite')return `<svg ${attrs}><path d="M18 48c13-9 21-20 28-34" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M27 39c-8 1-13-2-15-8 7-2 13 0 15 8Z" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M35 30c-8 1-13-2-15-8 7-2 13 0 15 8Z" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M43 21c-7 1-12-2-14-8 7-2 12 0 14 8Z" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/><path d="M37 39c7 0 12 3 14 9-7 2-12-.4-14-9Z" stroke="currentColor" stroke-width="3.8" stroke-linejoin="round"/></svg>`;
  return `<svg ${attrs}><path d="M18 18h28v28H18V18Z" stroke="currentColor" stroke-width="3.8"/><path d="M32 18v28M18 32h28" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>`;
}

function renderCard(item,basePath,label=''){
  const a=getAcf(item),title=itemTitle(item),desc=a.claim||a.subtitulo_comercial||a.titular_seo||excerpt(item);
  const isSector=(String(basePath||'').replace(/\/$/,'')==='/sectores')||String(label||'').toLowerCase()==='sector';
  if(isSector){
    const kind=sectorCardKind(item);
    const sectorLabel=sectorCardLabel(kind);
    return `<article class="card sector-card-dynamic sector-card-${kind}"><span class="sector-card-icon" aria-hidden="true">${renderSectorIcon(kind)}</span><span class="tag sector-value-tag">${escapeHtml(sectorLabel)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(stripHtml(desc)).slice(0,170)}</p><a class="card-link" href="${basePath}/${item.slug}/" aria-label="Ver estrategia de ${escapeHtml(title)}">Ver estrategia</a></article>`;
  }
  return `<article class="card">${label?`<span class="tag">${escapeHtml(label)}</span>`:''}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(stripHtml(desc)).slice(0,170)}</p><a class="card-link" href="${basePath}/${item.slug}/">Ver más</a></article>`;
}

function injectGlobalNavStyles(){
  if(document.getElementById('salero-global-nav-styles'))return;
  const style=document.createElement('style');
  style.id='salero-global-nav-styles';
  style.textContent=`
    .nav-dropdown{position:relative;display:flex;align-items:center;padding-bottom:16px;margin-bottom:-16px}
    .nav-dropdown-toggle{position:relative;display:inline-flex;align-items:center;gap:6px;padding:8px 0;border:0;background:transparent;color:var(--soft);font:inherit;font-weight:700;line-height:1;text-shadow:0 1px 16px rgba(246,241,232,.55);cursor:inherit}
    .site-header.is-scrolled .nav-dropdown-toggle{text-shadow:none}
    .nav-caret{font-size:.72em;line-height:1;transition:transform .22s ease}
    .nav-dropdown-toggle:after{content:"";position:absolute;left:0;bottom:0;width:0;height:2px;background:var(--albero);border-radius:999px;transition:.22s}
    .nav-dropdown:hover .nav-dropdown-toggle:after,.nav-dropdown:focus-within .nav-dropdown-toggle:after,.nav-dropdown.is-active .nav-dropdown-toggle:after{width:100%}
    .nav-dropdown:hover .nav-caret,.nav-dropdown:focus-within .nav-caret,.nav-dropdown.is-open .nav-caret{transform:rotate(180deg)}
    .nav-submenu{position:absolute;top:100%;left:50%;z-index:180;min-width:270px;padding:14px;background:rgba(255,253,247,.96);border:1px solid rgba(31,42,36,.12);border-radius:22px;box-shadow:0 24px 70px rgba(31,42,36,.14);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transform:translateX(-50%) translateY(6px);transition:opacity .2s ease,visibility .2s ease,transform .2s ease}
    .nav-dropdown:hover .nav-submenu,.nav-dropdown:focus-within .nav-submenu,.nav-dropdown.is-open .nav-submenu{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(-50%) translateY(0)}
    .nav .nav-submenu a{display:block;padding:12px 14px;border-radius:14px;color:var(--ink);font-size:.9rem;font-weight:850;line-height:1.15;text-shadow:none;white-space:nowrap}
    .nav .nav-submenu a:after{display:none}
    .nav .nav-submenu a:hover,.nav .nav-submenu a.is-active{background:rgba(199,244,88,.24);color:var(--ink)}
    .nav-dropdown.is-active .nav-dropdown-toggle{color:var(--ink)}
    @media(max-width:880px){
      .nav{justify-content:flex-start !important;gap:clamp(16px,3vh,26px) !important;padding-top:118px !important}
      .nav-dropdown{display:block;width:100%;padding-bottom:0;margin-bottom:0}
      .nav-dropdown-toggle{width:100%;justify-content:flex-start;padding:0;border:0;background:transparent !important;font-family:var(--font-serif);font-size:clamp(2.45rem,13vw,5.6rem);font-weight:800;line-height:.9;letter-spacing:-.06em;color:var(--ink) !important;text-align:left;text-shadow:none !important}
      .nav-dropdown-toggle:after{display:none}
      .nav-caret{font-family:var(--font-sans);font-size:.24em;margin-left:.06em;transform:none}
      .nav-dropdown.is-open .nav-caret{transform:rotate(180deg)}
      .nav-submenu,.nav-dropdown:hover .nav-submenu,.nav-dropdown:focus-within .nav-submenu{position:static;min-width:0;width:100%;max-height:0;overflow:hidden;padding:0 0 0 18px;background:transparent;border:0;border-left:2px solid rgba(31,42,36,.16);border-radius:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;opacity:1;visibility:visible;pointer-events:auto;transform:none;transition:max-height .28s ease,padding .28s ease}
      .nav-dropdown.is-open .nav-submenu{max-height:320px;padding-top:10px;padding-bottom:2px}
      .nav .nav-submenu a{width:100%;padding:8px 0;border-radius:0;background:transparent !important;font-family:var(--font-sans) !important;font-size:.94rem !important;font-weight:900;line-height:1.2;letter-spacing:.035em;text-transform:uppercase;color:var(--soft) !important;text-align:left;white-space:normal}
      .nav .nav-submenu a:hover,.nav .nav-submenu a:focus-visible,.nav .nav-submenu a.is-active{color:var(--ink) !important}
    }
  `;
  document.head.appendChild(style);
}

function renderGlobalNav(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  nav.innerHTML=`
    <a href="/el-menu/">El Menú</a>
    <a href="/nuestros-menus/">Nuestros menús</a>
    <div class="nav-dropdown" data-nav-dropdown data-nav-section="sectores">
      <a class="nav-dropdown-toggle" href="/sectores/" aria-expanded="false">
        Sectores <span class="nav-caret" aria-hidden="true">▾</span>
      </a>
      <div class="nav-submenu" aria-label="Sectores">
        <a href="/sectores/marketing-para-hosteleria-turismo/">Hostelería y turismo</a>
        <a href="/sectores/marketing-para-comercios-pymes/">Comercios y pymes</a>
        <a href="/sectores/marketing-para-almazaras-aceite/">Almazaras y aceite</a>
      </div>
    </div>
    <a href="/casos-de-exito/">Casos de éxito</a>
    <a href="/la-rebotica/">La Rebotica</a>
    <a class="nav-mobile-contact" href="/hablamos/">¿Hablamos?</a>
    <a class="nav-mobile-cta" href="/hablamos/">Pide tu cata digital</a>`;

  const actions=document.querySelector('.header-actions');
  if(actions){
    let contact=actions.querySelector('.nav-contact');
    const toggle=actions.querySelector('[data-menu-toggle]');
    const primary=actions.querySelector('.btn-primary');
    if(!contact){
      contact=document.createElement('a');
      contact.className='nav-contact';
      contact.href='/hablamos/';
      contact.textContent='¿Hablamos?';
      actions.insertBefore(contact, primary||toggle||null);
    }
    if(primary){primary.href='/hablamos/';primary.textContent='Pide tu cata digital'}
  }
}

function setActiveNav(){
  const current=window.location.pathname.replace(/\/$/,'')||'/';
  document.querySelectorAll('.nav a').forEach(l=>{
    const h=(l.getAttribute('href')||'').replace(/\/$/,'')||'/';
    if(h===current||(h!=='/'&&current.startsWith(h)))l.classList.add('is-active');
  });
  document.querySelectorAll('[data-nav-section]').forEach(item=>{
    const section=item.dataset.navSection;
    if(section&&current.startsWith(`/${section}`))item.classList.add('is-active');
  });
}

function initNavDropdowns(){
  const dropdowns=[...document.querySelectorAll('[data-nav-dropdown]')];
  if(!dropdowns.length)return;
  const isMobile=()=>window.matchMedia('(max-width:880px)').matches;
  const closeAll=(except=null)=>dropdowns.forEach(drop=>{
    if(drop!==except){
      drop.classList.remove('is-open');
      const trigger=drop.querySelector('.nav-dropdown-toggle');
      if(trigger)trigger.setAttribute('aria-expanded','false');
    }
  });
  dropdowns.forEach(drop=>{
    const trigger=drop.querySelector('.nav-dropdown-toggle');
    if(!trigger)return;
    trigger.addEventListener('click',event=>{
      if(!isMobile())return;
      event.preventDefault();
      const isOpen=drop.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded',String(isOpen));
      closeAll(drop);
    });
  });
  document.addEventListener('click',event=>{if(!event.target.closest('[data-nav-dropdown]'))closeAll()});
  window.addEventListener('keydown',event=>{if(event.key==='Escape')closeAll()});
  window.addEventListener('resize',()=>{if(!isMobile())closeAll()});
}

function initHeaderScroll(){
  const header=document.querySelector('.site-header');
  if(!header)return;
  const update=()=>header.classList.toggle('is-scrolled', window.scrollY>24);
  update();
  window.addEventListener('scroll', update, {passive:true});
}

function initMenuToggle(){
  const b=document.querySelector('[data-menu-toggle]');
  const nav=document.querySelector('.nav');
  if(!b)return;
  const close=()=>{
    document.body.classList.remove('menu-open');
    b.setAttribute('aria-expanded','false');
    b.textContent='☰';
    document.querySelectorAll('[data-nav-dropdown]').forEach(drop=>{
      drop.classList.remove('is-open');
      const trigger=drop.querySelector('.nav-dropdown-toggle');
      if(trigger)trigger.setAttribute('aria-expanded','false');
    });
  };
  const open=()=>{
    document.body.classList.add('menu-open');
    b.setAttribute('aria-expanded','true');
    b.textContent='×';
  };
  b.setAttribute('aria-expanded','false');
  b.addEventListener('click',()=>document.body.classList.contains('menu-open')?close():open());
  if(nav)nav.querySelectorAll('a:not(.nav-dropdown-toggle)').forEach(link=>link.addEventListener('click',close));
  window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}

function initHeroVideo(){
  const media=document.querySelector('.hero-media');
  if(!media)return;
  const isDesktop=window.matchMedia('(min-width:1024px)').matches;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!isDesktop||reduceMotion)return;
  const src=media.dataset.videoSrc||'/assets/video/hero-salero.mp4';
  const load=()=>{
    if(media.querySelector('video'))return;
    const video=document.createElement('video');
    video.className='hero-bg-video';
    video.autoplay=true;
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.preload='none';
    video.poster='/assets/img/hero-poster-desktop.webp';
    video.setAttribute('aria-hidden','true');
    video.innerHTML=`<source src="${src}" type="video/mp4">`;
    media.appendChild(video);
  };
  window.addEventListener('load',()=>{'requestIdleCallback' in window?requestIdleCallback(load,{timeout:1800}):setTimeout(load,600)},{once:true});
}

function initHeroNotesMotion(){
  const hero=document.querySelector('.hero-video-section');
  const cards=document.querySelectorAll('.hero-notes .visual-card');
  if(!hero||!cards.length)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(window.innerWidth<1024)return;
  let ticking=false;
  const update=()=>{
    const rect=hero.getBoundingClientRect();
    const scrolled=Math.max(0,-rect.top);
    const range=Math.min(scrolled,380);
    cards.forEach(card=>{
      const speed=parseFloat(card.dataset.speed||'0.12');
      card.style.setProperty('--move',`${range*speed}px`);
    });
    ticking=false;
  };
  const onScroll=()=>{if(!ticking){window.requestAnimationFrame(update);ticking=true}};
  update();
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',update);
}

function initHeroCardNavigation(){
  const cards=document.querySelectorAll('.hero-notes .visual-card');
  cards.forEach(card=>{
    const button=card.querySelector('.visual-card-button');
    const url=card.dataset.url;
    if(!button||!url)return;
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      window.location.href=url;
    });
  });
}

function initLazySectionVideos(){
  const videoBlocks=document.querySelectorAll('[data-lazy-video]');
  if(!videoBlocks.length)return;
  if(window.innerWidth<1024)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const loadVideo=(block)=>{
    if(block.dataset.loaded==='true')return;
    const src=block.dataset.lazyVideo;
    if(!src)return;
    const video=document.createElement('video');
    video.autoplay=true;
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.preload='metadata';
    video.setAttribute('aria-hidden','true');
    video.innerHTML=`<source src="${src}" type="video/mp4">`;
    block.appendChild(video);
    block.dataset.loaded='true';
  };
  if(!('IntersectionObserver' in window)){
    videoBlocks.forEach(loadVideo);
    return;
  }
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      if(!entry.isIntersecting)return;
      loadVideo(entry.target);
      observer.unobserve(entry.target);
    });
  },{rootMargin:'450px 0px'});
  videoBlocks.forEach((block)=>observer.observe(block));
}

document.addEventListener('DOMContentLoaded',()=>{
  injectGlobalNavStyles();
  renderGlobalNav();
  setActiveNav();
  initNavDropdowns();
  initHeaderScroll();
  initMenuToggle();
  initHeroVideo();
  initHeroNotesMotion();
  initHeroCardNavigation();
  initLazySectionVideos();
});
