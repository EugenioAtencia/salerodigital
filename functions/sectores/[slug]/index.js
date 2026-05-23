import { handleSectorRequest } from '../../_shared/sector-renderer.js';

export async function onRequest(context) {
  return handleSectorRequest(context);
}
