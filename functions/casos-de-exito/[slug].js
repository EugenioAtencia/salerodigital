import { snapshotPage } from '../_shared/snapshot-page.js';
import { handleCasoRequest } from '../_shared/caso-renderer-v4.js';

export async function onRequest(context) {
  return snapshotPage(context, 'casos-de-exito', handleCasoRequest);
}
