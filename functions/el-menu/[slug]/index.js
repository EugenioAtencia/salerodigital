import { snapshotPage } from '../../_shared/snapshot-page.js';
import { handleServiceRequest } from '../../_shared/service-renderer.js';

export async function onRequest(context) {
  return snapshotPage(context, 'el-menu', handleServiceRequest);
}
