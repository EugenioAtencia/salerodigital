// Explicit isolated build adapter; existing production build entry point is untouched.
import { renderCollections } from '../generate-collections-ssg.mjs';
import { verifySnapshot, canonical, fail } from './editorial-push-snapshot.mjs';

function matchLease(lease, packet) {
  if (!lease || lease.phase !== 'building' || lease.generation !== packet.generation || lease.batchId !== packet.batchId
    || lease.snapshotId !== packet.snapshotId || lease.revision !== packet.revision || lease.sha256 !== packet.sha256
    || JSON.stringify(canonical(lease.counts)) !== JSON.stringify(canonical(packet.counts))) fail('build_snapshot_identity');
}
export async function renderVerifiedSnapshot({ root, packet, key, jobId, check }) {
  // Work on a private copy; neither caller mutation nor a new head can repin this build.
  packet = structuredClone(packet);
  const payload = verifySnapshot(packet, key);
  matchLease(await check(jobId), packet);
  const output = await renderCollections(root, payload.collections);
  matchLease(await check(jobId), packet);
  return { output, identity: { jobId, generation: packet.generation, revision: packet.revision,
    snapshotId: packet.snapshotId, sha256: packet.sha256, counts: payload.counts } };
}
