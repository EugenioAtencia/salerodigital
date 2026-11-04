import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,symlink} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {artifactDigest} from '../scripts/lib/editorial-artifact-digest.mjs';
const dir=await mkdtemp(path.join(os.tmpdir(),'salero-handoff-'));
try{
 await assert.rejects(artifactDigest(dir),/artifact_empty/);
 await writeFile(path.join(dir,'index.html'),'unchanged home');
 await mkdir(path.join(dir,'la-rebotica'));await writeFile(path.join(dir,'la-rebotica/index.html'),'blog');
 const first=await artifactDigest(dir);assert.equal(first,await artifactDigest(dir));
 await writeFile(path.join(dir,'index.html'),'altered home');assert.notEqual(first,await artifactDigest(dir));
 await writeFile(path.join(dir,'index.html'),'unchanged home');assert.equal(first,await artifactDigest(dir));
 await writeFile(path.join(dir,'extra.html'),'injected');assert.notEqual(first,await artifactDigest(dir));await rm(path.join(dir,'extra.html'));
 await symlink(path.join(dir,'index.html'),path.join(dir,'link'));await assert.rejects(artifactDigest(dir),/artifact_file_type/);
 console.log('PASS artifact handoff: empty, deterministic, altered non-blog page, extra file, symlink rejected');
}finally{await rm(dir,{recursive:true,force:true});}
