import { handleSectorStoryRequest } from '../_shared/sector-story-transformer.js';

export async function onRequest(context) {
  return handleSectorStoryRequest(context);
}
