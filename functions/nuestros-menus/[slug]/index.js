export async function onRequest(context) {
  const slug = String(context.params.slug || '').replace(/^\/+|\/+$/g, '');
  const target = slug ? `/nuestros-menus/detalle/?slug=${encodeURIComponent(slug)}` : '/nuestros-menus/';
  return Response.redirect(new URL(target, context.request.url).toString(), 302);
}
