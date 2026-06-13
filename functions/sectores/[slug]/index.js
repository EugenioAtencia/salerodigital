import { handleSectorRequest } from '../../_shared/sector-renderer-v2.js';

export async function onRequest(context) {
  return handleSectorRequest(context);
}
