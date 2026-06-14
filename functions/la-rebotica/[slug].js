import { handleBlogPostRequest } from '../_shared/blog-renderer.js';

export async function onRequest(context) {
  return handleBlogPostRequest(context);
}
