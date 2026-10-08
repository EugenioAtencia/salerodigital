// Local Phase 1 protocol. No network, credentials, activation or production wiring.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ENDPOINTS, validateItem } from './cms-collections.mjs';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function fail(code) { throw new Error(code); }
export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const signedMetadata = packet => ({ formatVersion: packet.formatVersion, revision: packet.revision, counts: packet.counts,
  sha256: packet.sha256, snapshotId: packet.snapshotId, bytes: packet.bytes, generation: packet.generation, batchId: packet.batchId });
export function signSnapshot(snapshot, generation, batchId, key) {
  const packet = { ...structuredClone(snapshot), generation, batchId };
  packet.signature = createHmac('sha256', key).update(JSON.stringify(canonical(signedMetadata(packet)))).digest('hex');
  return packet;
}
export function verifySnapshot(packet, key, maxBytes = 1024 * 1024) {
  if (!packet || typeof packet !== 'object' || typeof packet.body !== 'string' || packet.formatVersion !== 1) fail('snapshot_format');
  if (!Number.isSafeInteger(packet.bytes) || packet.bytes <= 0 || packet.bytes > maxBytes || Buffer.byteLength(packet.body) !== packet.bytes) fail('snapshot_size');
  if (!Number.isSafeInteger(packet.generation) || packet.generation < 1 || !/^[a-z0-9-]{1,80}$/.test(packet.batchId || '')) fail('snapshot_identity');
  if (typeof packet.signature !== 'string' || !/^[a-f0-9]{64}$/.test(packet.signature)) fail('authentication');
  const expected = createHmac('sha256', key).update(JSON.stringify(canonical(signedMetadata(packet)))).digest();
  if (!timingSafeEqual(expected, Buffer.from(packet.signature, 'hex'))) fail('authentication');
  if (!/^[a-f0-9]{64}$/.test(packet.sha256 || '') || packet.snapshotId !== `sha256:${packet.sha256}` || sha256(packet.body) !== packet.sha256) fail('snapshot_integrity');
  let payload; try { payload = JSON.parse(packet.body); } catch { fail('snapshot_json'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.formatVersion !== 1 || typeof payload.revision !== 'string' || !/^[a-f0-9]{64}$/.test(payload.revision) || payload.revision !== packet.revision) fail('snapshot_revision');
  const keys = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...ENDPOINTS].sort().join(',');
  if (!keys(payload.collections) || !keys(payload.counts) || !keys(packet.counts)) fail('snapshot_collections');
  const ids = new Set();
  for (const type of ENDPOINTS) {
    const items = payload.collections[type], count = payload.counts[type];
    if (!Array.isArray(items) || !Number.isSafeInteger(count) || count < 0 || count !== items.length || packet.counts[type] !== count) fail('snapshot_counts');
    const slugs = new Set();
    for (const item of items) {
      try { validateItem(item, type); } catch { fail('snapshot_record'); }
      if (type === 'posts' && (typeof item.content?.rendered !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(item.date) || new Date(`${item.date}Z`).toISOString().slice(0, 19) !== item.date)) fail('snapshot_record');
      if (item.password || item.content?.protected || item.excerpt?.protected) fail('snapshot_protected');
      let slug; try { slug = decodeURIComponent(item.slug).toLowerCase(); } catch { fail('snapshot_record'); }
      if (['detalle','page','index'].includes(slug)) fail('snapshot_record');
      if (ids.has(item.id) || slugs.has(slug)) fail('snapshot_duplicate');
      ids.add(item.id); slugs.add(slug);
    }
  }
  return payload;
}
