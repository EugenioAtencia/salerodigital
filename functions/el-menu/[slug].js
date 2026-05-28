import { handleServiceRequest } from '../_shared/service-renderer.js';

export async function onRequest(context) {
  return handleServiceRequest(context);
}
