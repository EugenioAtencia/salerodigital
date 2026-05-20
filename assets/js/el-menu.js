function initMenuHeroVideo(){
  const media=document.querySelector('.el-menu-hero-media');
  if(!media)return;
  if(window.innerWidth<1024)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const src=media.dataset.menuVideoSrc||'/assets/video/menu-hero.mp4';

  const load=()=>{
    if(media.querySelector('video'))return;

    const video=document.createElement('video');
    video.autoplay=true;
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.preload='none';
    video.poster='/assets/img/menu-hero-poster.jpg';
    video.setAttribute('aria-hidden','true');
    video.innerHTML=`<source src="${src}" type="video/mp4">`;

    media.appendChild(video);
  };

  window.addEventListener('load',()=>{
    window.requestIdleCallback ? requestIdleCallback(load) : setTimeout(load,600);
  },{once:true});
}

document.addEventListener('DOMContentLoaded',()=>{
  initMenuHeroVideo();
});
