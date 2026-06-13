export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = '/sectores/detalle/index.html';
  return context.env.ASSETS.fetch(new Request(url.toString(), context.request));
}
