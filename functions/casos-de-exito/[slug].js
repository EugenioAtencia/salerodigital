import { handleCasoRequest } from '../_shared/caso-renderer-v4.js';

export async function onRequest(context) {
  return handleCasoRequest(context);
}
