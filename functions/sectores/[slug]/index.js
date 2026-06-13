import { handleSafeSectorRequest } from '../../_shared/sector-safe-handler.js';

export async function onRequest(context) {
  return handleSafeSectorRequest(context);
}
