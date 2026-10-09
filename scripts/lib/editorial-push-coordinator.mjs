// Shared synchronous transition model; adapters own durable transactions and asynchronous storage.
// The staging Worker persists transitions in SQLite; the terminal deployment monitor remains a trusted adapter.
import { canonical, fail, sha256, verifySnapshot } from './editorial-push-snapshot.mjs';
export class EditorialPushCoordinator {
  constructor({ store, key, codeSha, state = null, publishEnvironment = 'production', branch = 'main' }) {
    this.store = store; this.key = key; this.codeSha = codeSha; this.publishEnvironment = publishEnvironment; this.branch = branch;
    this.state = state ? structuredClone(state) : { generation: 0, window: null, permits: {}, head: null, active: null, published: null, jobs: {} };
  }
  checkpoint() { return structuredClone(this.state); }
  begin(batchId) {
    if (!/^[a-z0-9-]{1,80}$/.test(batchId)) fail('batch_identity');
    const prior = this.state.permits[batchId];
    if (prior) {
      if (prior.closed || this.state.window?.batchId !== batchId) fail('permit_closed');
      return structuredClone(prior);
    }
    if (this.state.active && this.state.active.phase !== 'building') fail('publication_locked');
    if (this.state.window) fail('edit_window_busy');
    const permit = { batchId, generation: ++this.state.generation, closed: false };
    this.state.permits[batchId] = permit; this.state.window = { ...permit };
    return structuredClone(permit);
  }
  validateOffer(packet) {
    verifySnapshot(packet, this.key);
    const identity = { batchId: packet.batchId, generation: packet.generation, snapshotId: packet.snapshotId,
      revision: packet.revision, sha256: packet.sha256, counts: structuredClone(packet.counts) };
    if (!this.state.window && JSON.stringify(canonical(this.state.head)) === JSON.stringify(canonical(identity))) return { identity, duplicate: true };
    this.checkOffer(identity);
    return { identity, duplicate: false };
  }
  checkOffer(identity) {
    if (identity.generation !== this.state.generation || identity.batchId !== this.state.window?.batchId) fail('obsolete_snapshot');
    if (this.state.active && this.state.active.phase !== 'building') fail('publication_locked');
  }
  commitOffer(identity) {
    if (!this.state.window && JSON.stringify(canonical(this.state.head)) === JSON.stringify(canonical(identity))) return { accepted: true, duplicate: true };
    this.checkOffer(identity);
    this.state.head = identity; this.state.permits[identity.batchId].closed = true; this.state.window = null;
    return { accepted: true, duplicate: false };
  }
  offer(packet) {
    const { identity, duplicate } = this.validateOffer(packet);
    if (duplicate) return { accepted: true, duplicate: true };
    // R2 equivalent: finish immutable object first. A lost ACK leaves no published head.
    this.store.put(packet.snapshotId, packet.body);
    if (sha256(this.store.get(packet.snapshotId)) !== packet.sha256) fail('stored_integrity');
    return this.commitOffer(identity); // Fence again after asynchronous storage in the real adapter.
  }
  claim(jobId, codeSha, expectedGeneration = null) {
    if (codeSha !== this.codeSha) fail('code_revision');
    if (expectedGeneration !== null && (!Number.isSafeInteger(expectedGeneration) || expectedGeneration !== this.state.generation)) fail('obsolete_job');
    if (!/^[a-z0-9-]{1,80}$/.test(jobId)) fail('job_identity');
    if (/-r\d+$/.test(jobId)) this.checkRetry(jobId);
    if (this.state.active?.jobId === jobId) return structuredClone(this.state.active);
    if (this.state.jobs[jobId]) fail('job_completed');
    if (this.state.active) fail('build_busy');
    if (this.state.window || !this.state.head || this.state.head.generation !== this.state.generation) fail('editorial_blocked');
    if (this.state.published?.generation === this.state.head.generation && this.state.published.codeSha === codeSha) fail('already_published');
    this.state.active = { ...structuredClone(this.state.head), jobId, codeSha, phase: 'building' };
    return structuredClone(this.state.active);
  }
  notify(jobId, generation) {
    if (this.state.window || generation !== this.state.generation || this.state.head?.generation !== generation) fail('obsolete_job');
    const expected = 'blog-' + sha256(this.state.head.snapshotId + ':' + generation);
    if (this.state.jobs[jobId]) fail('job_completed');
    if (jobId !== expected) this.checkRetry(jobId);
    const notifications = this.state.notifications ||= {};
    return notifications[jobId] ||= { jobId, generation, codeSha: this.codeSha, dispatched: false };
  }
  prepareRetry(previousJobId, generation, snapshotId, deploymentId) {
    // Explicit second attempt only. Never revive a terminal job or manufacture a new editorial generation.
    const head = this.state.head;
    if (this.state.window || generation !== this.state.generation || head?.generation !== generation || head.snapshotId !== snapshotId) fail('obsolete_job');
    if (this.state.active) fail('publication_locked');
    if (this.state.published?.generation === generation) fail('already_published');
    const original = 'blog-' + sha256(snapshotId + ':' + generation);
    if (previousJobId !== original) fail('retry_identity');
    const prior = this.state.jobs[previousJobId], notification = this.state.notifications?.[previousJobId];
    if (prior?.status !== 'failure' || prior.generation !== generation || prior.deploymentId !== deploymentId
      || !/^[a-z0-9-]{1,80}$/.test(deploymentId || '') || notification?.generation !== generation || !notification.dispatched) fail('retry_not_terminal');
    const retry = { jobId: original + '-r2', attempt: 2, previousJobId, previousDeploymentId: deploymentId,
      generation, batchId: head.batchId, snapshotId, sha256: head.sha256, codeSha: this.codeSha };
    const existing = this.state.retryAttempts?.[retry.jobId];
    if (existing && JSON.stringify(canonical(existing)) !== JSON.stringify(canonical(retry))) fail('retry_conflict');
    const attempts = this.state.retryAttempts ||= {};
    attempts[retry.jobId] ||= retry;
    return structuredClone(attempts[retry.jobId]);
  }
  checkRetry(jobId) {
    const retry = this.state.retryAttempts?.[jobId], head = this.state.head;
    if (!retry) fail('retry_not_authorized');
    if (this.state.window || retry.generation !== this.state.generation || head?.generation !== retry.generation
      || head.snapshotId !== retry.snapshotId || head.sha256 !== retry.sha256 || head.batchId !== retry.batchId) fail('obsolete_job');
    if (retry.codeSha !== this.codeSha) fail('code_revision');
    if (this.state.published?.generation === retry.generation) fail('already_published');
    return structuredClone(retry);
  }
  check(jobId) {
    const active = this.state.active;
    if (!active || active.jobId !== jobId) fail('job_identity');
    if (this.state.window || active.generation !== this.state.generation || active.snapshotId !== this.state.head?.snapshotId) fail('obsolete_build');
    return structuredClone(active);
  }
  sealArtifact(jobId, digest) {
    const active = this.check(jobId);
    if (active.phase !== 'building' || !/^[a-f0-9]{64}$/.test(digest || '')) fail('artifact_identity');
    if (this.state.active.artifactDigest && this.state.active.artifactDigest !== digest) fail('artifact_conflict');
    this.state.active.artifactDigest = digest;
    return structuredClone(this.state.active);
  }
  preparePromotion(jobId, digest) {
    const active = this.check(jobId);
    if (active.phase !== 'building') fail('job_phase');
    if (active.artifactDigest && active.artifactDigest !== digest) fail('artifact_identity');
    this.state.active.promotionAuthorized = true; this.state.active.phase = 'publishing'; // Locks new edits through deployment's terminal outcome.
    return structuredClone(this.state.active);
  }
  uncertain(jobId) {
    if (this.state.active?.jobId !== jobId) fail('job_identity');
    this.state.active.phase = 'unknown'; // No automatic lease timeout/unlock.
  }
  settle(jobId, deployment) {
    // A monitor may lose the ACK after this transaction commits. Reconcile the exact same outcome only.
    const outcomeDigest = sha256(JSON.stringify(canonical(deployment || null)));
    const terminal = this.state.jobs[jobId];
    if (terminal?.outcomeDigest) {
      if (terminal.outcomeDigest !== outcomeDigest) fail('deployment_identity');
      return { settled: true, duplicate: true };
    }
    const a = this.state.active;
    if (!a || a.jobId !== jobId || deployment?.jobId !== jobId || deployment.codeSha !== a.codeSha || deployment.environment !== this.publishEnvironment
      || !/^[a-z0-9-]{1,80}$/.test(deployment.id || '') || !['success', 'failure'].includes(deployment.status)) fail('deployment_identity');
    if (deployment.status === 'success') {
      this.check(jobId);
      if (!a.promotionAuthorized || !['publishing', 'unknown'].includes(a.phase)) fail('promotion_not_authorized');
      const r = deployment.receipt;
      if (!r || r.jobId !== jobId || r.generation !== a.generation || r.snapshotId !== a.snapshotId || r.revision !== a.revision
        || r.commit !== a.codeSha || r.branch !== this.branch || r.mode !== 'snapshot-coordinated'
        || r.buildSuccess !== true || r.snapshotConsistent !== true || r.tests !== 'passed'
        || JSON.stringify(canonical(r.counts)) !== JSON.stringify(canonical(a.counts))) fail('receipt_invalid');
      this.state.published = { ...structuredClone(a), deploymentId: deployment.id };
    }
    this.state.jobs[jobId] = { status: deployment.status, generation: a.generation, deploymentId: deployment.id, outcomeDigest };
    this.state.active = null;
    return { settled: true, duplicate: false };
  }
  abort(jobId) {
    if (!this.state.active || this.state.active.jobId !== jobId || this.state.active.phase !== 'building') fail('publication_locked');
    this.state.jobs[jobId] = { status: 'build-failure', generation: this.state.active.generation };
    this.state.active = null;
    return { aborted: true };
  }
  status() {
    return { generation: this.state.generation, editing: !!this.state.window, active: this.state.active?.phase || null,
      ready: !this.state.window && !!this.state.head && this.state.head.generation === this.state.generation,
      publishedGeneration: this.state.published?.generation || null };
  }
}
