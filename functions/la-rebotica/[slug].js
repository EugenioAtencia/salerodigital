import { handleBlogPostRequest } from '../_shared/blog-renderer-static.js';

export async function onRequest(context) {
  return handleBlogPostRequest(context);
}
