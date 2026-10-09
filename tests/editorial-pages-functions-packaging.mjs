import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp, cp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {StagingPages} from '../integrations/cloudflare/editorial-promoter/pages.mjs';
import {pagesWorkerUpload} from '../integrations/cloudflare/editorial-promoter/pages-worker-upload.mjs';
import {validatePagesWorkerUpload} from '../scripts/lib/editorial-pages-worker-validation.mjs';
import {BRANCH} from '../integrations/cloudflare/editorial-promoter/policy.mjs';
const require = createRequire(new URL('../integrations/cloudflare/push-staging/package.json', import.meta.url));
const {Miniflare, convertV4MiniflareOptions} = require('miniflare');
const dir = await mkdtemp(path.join(os.tmpdir(), 'salero-functions-packaging-'));
let mf, passed = 0;
async function test(name, run) { await run(); passed++; console.log('PASS ' + name); }
function syntax(bytes) { return spawnSync(process.execPath, ['--input-type=module', '--check'], {input: bytes, encoding: 'utf8'}); }
try {
  await cp('functions', path.join(dir, 'functions'), {recursive: true});
  // The exact builder command, with real Pages Functions and the same outfile.
  const result = spawnSync(process.execPath, [path.resolve('integrations/cloudflare/push-staging/node_modules/wrangler/bin/wrangler.js'), 'pages', 'functions', 'build', path.join(dir, 'functions'), '--outfile', path.join(dir, '_worker.js'), '--build-output-directory', dir, '--output-routes-path', path.join(dir, '_routes.json'), '--compatibility-date', '2026-10-09'], {encoding: 'utf8', env: {...process.env, WRANGLER_SEND_METRICS: 'false'}});
  assert.equal(result.status, 0, result.stderr);
  const bytes = await readFile(path.join(dir, '_worker.js'));
  await test('old upload reproduces the exact prefix-operation syntax error', () => {
    const old = syntax(bytes);
    assert.equal(old.status, 1);
    assert.match(old.stderr, /Invalid left-hand side expression in prefix operation/);
    assert.match(bytes.toString('utf8', 0, 100), /^------formdata-undici-/);
  });
  let decoded;
  await test('all JavaScript in the real final MIME bundle passes syntax validation', async () => {
    decoded = await validatePagesWorkerUpload(bytes);
    assert.equal(decoded.field, '_worker.bundle');
    assert(decoded.modules.length > 0);
  });
  await test('serialized deployment request uses _worker.bundle and preserves every byte', async () => {
    const codeSha = 'a'.repeat(40), jobId = 'test-functions-packaging';
    const pages = new StagingPages('local-dummy-token', async (url, options) => {
      if (!url.endsWith('/deployments')) return Response.json({success: true, result: {name: 'salerodigital-staging', production_branch: 'codex/cms-auto-deploy'}});
      const uploaded = await new Request(url, {method: 'POST', body: options.body}).formData();
      assert.equal(uploaded.has('_worker.js'), false);
      assert.equal(uploaded.get('branch'), BRANCH);
      const file = uploaded.get('_worker.bundle');
      assert.match(file.type, /^multipart\/form-data; boundary=/);
      assert.deepEqual(Buffer.from(await file.arrayBuffer()), bytes);
      const nested = await new Response(file).formData();
      const metadata = JSON.parse(nested.get('metadata'));
      assert.equal(syntax(await nested.get(metadata.main_module).text()).status, 0);
      return Response.json({success: true, result: {id: 'local-only', environment: 'preview', url: 'https://1234abcd.salerodigital-staging.pages.dev', deployment_trigger: {metadata: {commit_hash: codeSha, commit_message: 'editorial-job:' + jobId}}}});
    });
    await pages.create({codeSha, jobId, files: [], special: {'_worker.js': bytes.toString('base64')}});
  });
  await test('real compiled Pages module starts and serves ASSETS in workerd', async () => {
    const main = decoded.modules.find(module => module.name === decoded.mainModule);
    assert.equal(decoded.modules.length, 1);
    mf = new Miniflare(convertV4MiniflareOptions({modules: true, script: main.content, compatibilityDate: '2026-10-09', serviceBindings: {ASSETS: () => new Response('local assets only', {headers: {'Content-Type': 'text/plain'}})}, outboundService: () => {throw Error('unexpected_remote_request');}}));
    const response = await mf.dispatchFetch('https://staging.invalid/functions-syntax-probe.txt');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'local assets only');
  });
  await test('invalid JavaScript inside a valid MIME container fails closed', async () => {
    const parts = new FormData(); parts.set('metadata', JSON.stringify({main_module: 'worker.mjs'}));
    parts.set('worker.mjs', new Blob(['++--invalid'], {type: 'application/javascript+module'}), 'worker.mjs');
    await assert.rejects(validatePagesWorkerUpload(Buffer.from(await new Response(parts).arrayBuffer())), /functions_bundle_syntax/);
  });
  await test('invalid secondary JS module is checked even with a valid entrypoint', async () => {
    const parts = new FormData(); parts.set('metadata', JSON.stringify({main_module: 'worker.mjs'}));
    parts.set('worker.mjs', new Blob(['export default {};'], {type: 'application/javascript+module'}), 'worker.mjs');
    parts.set('dependency.js', new Blob(['<html>not JavaScript</html>'], {type: 'application/javascript+module'}), 'dependency.js');
    await assert.rejects(validatePagesWorkerUpload(Buffer.from(await new Response(parts).arrayBuffer())), /functions_bundle_syntax/);
  });
  await test('HTML, missing entrypoint, truncated and malformed MIME fail closed', async () => {
    await assert.rejects(validatePagesWorkerUpload(Buffer.from('<html>challenge</html>')), /functions_bundle_syntax/);
    const parts = new FormData(); parts.set('metadata', JSON.stringify({main_module: 'missing.js'}));
    await assert.rejects(validatePagesWorkerUpload(Buffer.from(await new Response(parts).arrayBuffer())), /functions_bundle_entry/);
    assert.throws(() => pagesWorkerUpload(bytes.subarray(0, bytes.length - 20)), /functions_bundle_format/);
    assert.throws(() => pagesWorkerUpload(Buffer.from('--bad\nnot a bundle')), /functions_bundle_format/);
  });
  await test('plain Module Worker JavaScript remains supported', async () => {
    assert.equal((await validatePagesWorkerUpload(Buffer.from('export default {fetch(){return new Response("ok")}}'))).field, '_worker.js');
  });
  console.log(JSON.stringify({passed, remoteCalls: 0, deployments: 0, realFunctions: true, workerd: true}));
} finally { if (mf) await mf.dispose(); await rm(dir, {recursive: true, force: true}); }
