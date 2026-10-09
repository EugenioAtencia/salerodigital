import {fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';

// `pages functions build --outfile` writes a MIME bundle, regardless of the
// output filename. Pages must receive those bytes as _worker.bundle, not JS.
export function pagesWorkerUpload(bytes) {
  bytes = Buffer.from(bytes);
  const prefix = bytes.subarray(0, 128).toString('utf8');
  if (!prefix.startsWith('--')) return {field: '_worker.js', blob: new Blob([bytes], {type: 'application/javascript'})};
  const boundary = /^--([a-zA-Z0-9_-]{1,70})\r\n/.exec(prefix)?.[1];
  if (!boundary) fail('functions_bundle_format');
  const tail = bytes.subarray(-(boundary.length + 8)).toString('utf8');
  if (!tail.endsWith(`\r\n--${boundary}--\r\n`) && !tail.endsWith(`\r\n--${boundary}--`)) fail('functions_bundle_format');
  return {field: '_worker.bundle', blob: new Blob([bytes], {type: `multipart/form-data; boundary=${boundary}`})};
}
