export async function onRequest(context) {
  return Response.redirect(new URL('/nuestros-menus/', context.request.url).toString(), 301);
}
