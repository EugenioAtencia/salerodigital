import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from './editorial-push-snapshot.mjs';

// Covers the entire handoff, including unaffected pages and Functions.
export async function artifactDigest(root) {
  const entries = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(root, relative), {withFileTypes: true})) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) entries.push([name, sha256(await readFile(path.join(root, name)))]);
      else throw Error('artifact_file_type');
    }
  }
  await walk();
  if (!entries.length) throw Error('artifact_empty');
  entries.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return sha256(JSON.stringify(entries));
}
