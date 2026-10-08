import assert from 'node:assert/strict';
import { readEditorialRevision } from '../scripts/lib/editorial-revision.mjs';
const url = 'https://cms.example.com/wp-json/salero-pages/v1/revision?private=fixture-secret';
const valid = { revision: 'a'.repeat(64), editing: false };
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
let checks = 0;
const cases = [
  ['http-status', () => new Response('<html><script></script></html>'.padEnd(262, ' '), { status: 202, headers: { 'Content-Type': 'text/html' } })],
  ['http-status', () => new Response(JSON.stringify(valid), { status: 202, headers: { 'Content-Type': 'application/json' } })],
  ['http-status', () => new Response('fixture-secret', { status: 403, headers: { 'Content-Type': 'text/html' } })],
  ['content-type', () => new Response('<html>fixture-secret</html>', { headers: { 'Content-Type': 'text/html' } })],
  ['json-parse', () => new Response('fixture-secret', { headers: { 'Content-Type': 'application/json' } })],
  ['missing-revision', () => json({ editing: false })],
  ['invalid-revision-format', () => json({ ...valid, revision: 'fixture-secret' })],
  ['invalid-revision-format', () => json({ ...valid, revision: 123 })],
  ['missing-editing', () => json({ revision: valid.revision })],
  ['invalid-editing', () => json({ ...valid, editing: true })],
  ['invalid-editing', () => json({ ...valid, editing: 'false' })],
  ['redirect', () => new Response('fixture-secret', { status: 302, headers: { Location: 'https://other.example/private/fixture-secret?token=fixture-secret' } })],
  ['timeout', () => { throw new DOMException('fixture-secret', 'TimeoutError'); }],
  ['network', () => { throw new TypeError('fixture-secret'); }]
];
for (const [code, fetchImpl] of cases) {
  await assert.rejects(readEditorialRevision(url, { fetchImpl }), error => {
    assert.equal(error.revisionDiagnostic.logicalCode, code);
    assert.equal(JSON.stringify(error.revisionDiagnostic).includes('fixture-secret'), false);
    assert.equal(JSON.stringify(error.revisionDiagnostic).includes('?'), false);
    if (code === 'http-status') assert.ok([202,403].includes(error.revisionDiagnostic.httpStatus));
    if (code === 'redirect') { assert.equal(error.revisionDiagnostic.redirected, true); assert.equal(error.revisionDiagnostic.finalUrl.path, '[other-path]'); }
    return true;
  }); checks++;
}
let requests=0, metadata;
assert.equal(await readEditorialRevision(url, { fetchImpl: async (_, options) => {
  requests++; assert.equal(options.redirect, 'manual'); assert.equal(options.cache, 'no-store'); assert.equal(options.headers.Accept,'application/json');
  return json(valid);
}, onRead: info => { metadata=info; } }),valid.revision);
assert.equal(requests,1); assert.equal(metadata.editing,false); assert.equal(metadata.logicalCode,'valid');
assert.equal(metadata.responseBytes,Buffer.byteLength(JSON.stringify(valid)));
assert.equal(metadata.contentType,'application/json'); checks++;
console.log(`PASS: editorial revision — ${checks} scenarios; safe metadata, strict validation and no redirects`);
