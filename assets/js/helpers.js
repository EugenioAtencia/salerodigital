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
function renderCard(item,basePath,label=''){const a=getAcf(item),title=itemTitle(item),desc=a.claim||a.subtitulo_comercial||a.titular_seo||excerpt(item);return `<article class="card">${label?`<span class="tag">${escapeHtml(label)}</span>`:''}<h3>${title}</h3><p>${escapeHtml(stripHtml(desc)).slice(0,170)}</p><a class="card-link" href="${basePath}/${item.slug}/">Ver más</a></article>`}
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
  if(window.innerWidth<900)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const src=media.dataset.videoSrc||'/assets/video/hero-salero.mp4';
  const load=()=>{
    if(media.querySelector('video'))return;
    const video=document.createElement('video');
    video.className='hero-bg-video';
    video.autoplay=true;
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.preload='metadata';
    video.setAttribute('aria-hidden','true');
    video.innerHTML=`<source src="${src}" type="video/mp4">`;
    media.appendChild(video);
  };
  window.addEventListener('load',()=>setTimeout(load,280),{once:true});
}

function initHeroNotesMotion(){
  const hero=document.querySelector('.hero-video-section');
  const cards=document.querySelectorAll('.hero-notes .visual-card');
  if(!hero||!cards.length)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(window.innerWidth<=880)return;
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

document.addEventListener('DOMContentLoaded',()=>{
  setActiveNav();
  initHeaderScroll();
  initMenuToggle();
  initHeroVideo();
  initHeroNotesMotion();
});

/* Navegación de fichas del hero - v23 */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.hero-notes .visual-card');

  cards.forEach((card) => {
    const button = card.querySelector('.visual-card-button');
    const url = card.dataset.url;

    if (!button || !url) return;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = url;
    });
  });
});
