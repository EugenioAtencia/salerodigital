import {spawnSync} from 'node:child_process';
import {pagesWorkerUpload} from '../../integrations/cloudflare/editorial-promoter/pages-worker-upload.mjs';
import {fail} from './editorial-push-snapshot.mjs';

// Validate the final upload representation, including every JS module inside
// Wrangler's MIME container, before attesting or transferring any artifact.
export async function validatePagesWorkerUpload(bytes) {
  const {field, blob} = pagesWorkerUpload(bytes);
  const modules = [];
  let mainModule;
  if (field === '_worker.bundle') {
    let parts, metadata;
    try {
      parts = await new Response(blob).formData();
      metadata = JSON.parse(parts.get('metadata'));
    } catch { fail('functions_bundle_format'); }
    mainModule = metadata?.main_module;
    if (typeof mainModule !== 'string' || !parts.get(mainModule) || typeof parts.get(mainModule) === 'string') fail('functions_bundle_entry');
    const names = new Set();
    for (const [name, part] of parts) {
      if (names.has(name)) fail('functions_bundle_format');
      names.add(name);
      if (name === 'metadata') continue;
      if (typeof part === 'string') fail('functions_bundle_format');
      if (/^(?:application\/javascript(?:\+module)?|text\/javascript)$/.test(part.type)) modules.push({name, content: await part.text()});
      else if (name === mainModule || /\.[cm]?js$/.test(name)) fail('functions_bundle_module');
    }
    if (!modules.some(module => module.name === mainModule)) fail('functions_bundle_entry');
  } else {
    mainModule = 'worker.mjs';
    modules.push({name: mainModule, content: await blob.text()});
  }
  for (const module of modules) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input: module.content, encoding: 'utf8'});
    if (result.status !== 0) fail('functions_bundle_syntax');
  }
  return {field, mainModule, modules};
}
