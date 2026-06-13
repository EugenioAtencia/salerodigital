import { handleDynamicDetailRequest } from '../../_shared/dynamic-detail-renderer.js';

export async function onRequest(context) {
  return handleDynamicDetailRequest(context, 'menu');
}
