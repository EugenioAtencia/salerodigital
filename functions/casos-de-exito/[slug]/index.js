import { handleCasoRequest } from '../../_shared/caso-renderer-v2.js';

export async function onRequest(context) {
  return handleCasoRequest(context);
}
