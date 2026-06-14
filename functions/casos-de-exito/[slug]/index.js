import { handleCasoRequest } from '../../_shared/caso-renderer-static.js';

export async function onRequest(context) {
  return handleCasoRequest(context);
}
