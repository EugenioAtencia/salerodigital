import { handleCasoRequest } from '../_shared/caso-renderer.js';

export async function onRequest(context) {
  const response = await handleCasoRequest(context);

  if (response && response.status >= 500 && typeof context.next === 'function') {
    return context.next();
  }

  return response;
}
