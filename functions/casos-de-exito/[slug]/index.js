import { handleCasoRequest } from '../../_shared/caso-renderer.js';

export async function onRequest(context) {
  return handleCasoRequest(context);
}
