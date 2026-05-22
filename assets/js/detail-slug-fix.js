function currentSlugFromPath(){
  const params=new URLSearchParams(window.location.search||'');
  const paramSlug=params.get('slug');
  if(paramSlug)return paramSlug.trim().replace(/^\/+|\/+$/g,'');

  const parts=window.location.pathname.split('/').filter(Boolean);
  if(parts[0]==='sectores'&&parts[1]&&parts[1]!=='detalle')return parts[1];
  if(parts[0]==='sector-detail'&&parts[1])return parts[1];
  return '';
}
