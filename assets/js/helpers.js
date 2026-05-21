function stripHtml(html=''){const d=document.createElement('div');d.innerHTML=html;return d.textContent||d.innerText||''}
function escapeHtml(v=''){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function hasHtml(v=''){return /<\/?[a-z][\s\S]*>/i.test(String(v))}
function normalizeUrl(v=''){if(!v)return SALERO_CONFIG.contactUrl;if(v.startsWith('http'))return v;if(v.startsWith('/'))return v;return `/${v.replace(/^\/+|\/+$/g,'')}/`}
function getAcf(item={}){return item.salero_acf || item.acf || {}}
function featuredImage(item={}){if(item.featured_image_url)return item.featured_image_url;const m=item._embedded&&item._embedded['wp:featuredmedia'];return m&&m[0]&&m[0].source_url?m[0].source_url:null}
function formatText(v=''){const t=String(v||'').trim();if(!t)return '';if(hasHtml(t))return t;return t.split(/\n{2,}/).map(p=>`<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('')}
function formatList(v=''){const t=String(v||'').trim();if(!t)return '';if(hasHtml(t))return t;return `<ul>${t.split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`}
function formatFaqs(v=''){const t=String(v||'').trim();if(!t)return '';const blocks=t.split(/(?=###\s)/).map(b=>b.trim()).filter(Boolean);if(blocks.length>1||t.startsWith('###'))return `<div class="faq-list">${blocks.map(b=>{let lines=b.split(/\n+/).map(l=>l.trim()).filter(Boolean);let q=(lines.shift()||'').replace(/^###\s*/,'');return `<details><summary>${escapeHtml(q)}</summary>${formatText(lines.join('\n\n'))}</details>`}).join('')}</div>`;return `<div class="faq-list"><details open><summary>Preguntas frecuentes</summary>${formatText(t)}</details></div>`}
function itemTitle(item={}){return item.title&&item.title.rendered?stripHtml(item.title.rendered):''}
function excerpt(item={}){if(item.excerpt&&item.excerpt.rendered)return stripHtml(item.excerpt.rendered);const a=getAcf(item);return a.claim||a.subtitulo_comercial||a.titular_seo||a.meta_description||''}
function setSeoFromItem(item={}){const a=getAcf(item);const title=a.meta_title||a.og_title||itemTitle(item);const desc=a.meta_description||a.og_description||excerpt(item);if(title)document.title=`${stripHtml(title)} | Salero Digital`;const meta=document.querySelector('meta[name="description"]');if(meta&&desc)meta.setAttribute('content',stripHtml(desc).slice(0,160))}
function sectorCardKind(item={}){const t=`${item.slug||''} ${itemTitle(item)}`.toLowerCase();if(t.includes('hosteler')||t.includes('turismo')||t.includes('restaurante')||t.includes('alojamiento'))return 'hosteleria';if(t.includes('comercio')||t.includes('pyme')||t.includes('pymes')||t.includes('tienda'))return 'comercio';if(t.includes('almazara')||t.includes('aceite')||t.includes('olivar')||t.includes('oliva'))return 'aceite';return 'generico'}
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
  return `<article class="card">${label?`<span class="tag">${escapeHtml(label)}</span>`:''}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(stripHtml(desc)).slice(0,170)}</p><a class="card-link" href="${basePath}/${item.slug}/">Ver más</a></article>`
}
function setActiveNav(){const current=window.location.pathname.replace(/\/$/,'')||'/';document.querySelectorAll('.nav a').forEach(l=>{const h=(l.getAttribute('href')||'').replace(/\/$/,'')||'/';if(h===current||(h!=='/'&&current.startsWith(h)))l.classList.add('is-active')})}

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
  const close=()=>{document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false');b.textContent='☰'};
  const open=()=>{document.body.classList.add('menu-open');b.setAttribute('aria-expanded','true');b.textContent='×'};
  b.setAttribute('aria-expanded','false');
  b.addEventListener('click',()=>document.body.classList.contains('menu-open')?close():open());
  if(nav)nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
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

  window.addEventListener('load',()=>{
    if('requestIdleCallback' in window){
      requestIdleCallback(load,{timeout:1800});
    }else{
      setTimeout(load,600);
    }
  },{once:true});
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
  setActiveNav();
  initHeaderScroll();
  initMenuToggle();
  initHeroVideo();
  initHeroNotesMotion();
  initHeroCardNavigation();
  initLazySectionVideos();
});
