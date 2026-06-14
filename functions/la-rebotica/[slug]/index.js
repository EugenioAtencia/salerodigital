import { handleBlogPostRequest } from '../../_shared/blog-renderer-client.js';

export async function onRequest(context) {
  return handleBlogPostRequest(context);
}
