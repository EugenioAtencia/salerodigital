import { snapshotPage } from '../_shared/snapshot-page.js';
import { handleBlogPostRequest } from '../_shared/blog-renderer-client.js';

export async function onRequest(context) {
  return snapshotPage(context, 'la-rebotica', handleBlogPostRequest);
}
