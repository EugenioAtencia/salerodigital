import { handleCasoRequest } from '../../_shared/caso-renderer-ajax.js';

export async function onRequest(context) {
  return handleCasoRequest(context);
}
