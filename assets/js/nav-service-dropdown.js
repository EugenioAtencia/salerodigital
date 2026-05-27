(function(){
  const SERVICE_ITEMS = [
    { href: '/el-menu/cimientos-digitales/', label: 'Cimientos Digitales' },
    { href: '/el-menu/el-pregonero/', label: 'El Pregonero' },
    { href: '/el-menu/gracia-y-presencia/', label: 'Gracia y Presencia' },
    { href: '/el-menu/el-empujon/', label: 'El Empujón' }
  ];

  function normalize(path){
    const clean = String(path || '/').split('?')[0].split('#')[0].replace(/\/+$/,'');
    return clean || '/';
  }

  function isMobile(){
    return window.matchMedia('(max-width:880px)').matches;
  }

  function enhanceElMenuDropdown(){
    const nav = document.querySelector('.site-header .nav');
    if(!nav || nav.querySelector('[data-service-menu-dropdown]')) return;

    const current = normalize(window.location.pathname);
    const elMenuLink = [...nav.children].find(node => {
      if(!(node instanceof HTMLElement)) return false;
      if(!node.matches('a')) return false;
      return normalize(node.getAttribute('href')) === '/el-menu';
    });

    if(!elMenuLink) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'nav-dropdown';
    dropdown.dataset.navDropdown = '';
    dropdown.dataset.navSection = 'el-menu';
    dropdown.dataset.serviceMenuDropdown = '';

    const toggle = document.createElement('a');
    toggle.className = 'nav-dropdown-toggle';
    toggle.href = '/el-menu/';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = '<span>El Menú</span><span class="nav-caret" aria-hidden="true">▾</span>';

    const submenu = document.createElement('div');
    submenu.className = 'nav-submenu';
    submenu.setAttribute('aria-label','Servicios de El Menú');

    SERVICE_ITEMS.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      if(current === normalize(item.href)) link.classList.add('is-active');
      submenu.appendChild(link);
    });

    if(current === '/el-menu' || current.startsWith('/el-menu/')){
      dropdown.classList.add('is-active');
      toggle.classList.add('is-active');
    }

    dropdown.appendChild(toggle);
    dropdown.appendChild(submenu);
    elMenuLink.replaceWith(dropdown);

    toggle.addEventListener('click', event => {
      if(!isMobile()) return;
      event.preventDefault();
      const isOpen = dropdown.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    submenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('menu-open');
        const button = document.querySelector('[data-menu-toggle]');
        if(button){
          button.setAttribute('aria-expanded','false');
          button.setAttribute('aria-label','Abrir menú');
          button.textContent = '☰';
        }
      });
    });
  }

  function run(){
    enhanceElMenuDropdown();
    setTimeout(enhanceElMenuDropdown, 80);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  }else{
    run();
  }
})();
