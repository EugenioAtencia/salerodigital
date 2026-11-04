import { canonical, sha256, fail, verifySnapshot } from './editorial-push-snapshot.mjs';
const gitSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const json = value => JSON.stringify(canonical(value));
const identity = packet => { const { body, ...metadata } = packet; return metadata; };

// Git is persistence only. Caller owns durable intent checkpoints and generation fences.
export class GitHubSnapshotStore {
  constructor({ owner, repository, branch = 'snapshots', token, fetchImpl = (...args) => fetch(...args), timeoutMs = 5000, key }) {
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(owner || '') || !/^salero-editorial-snapshots(?:-staging)?$/.test(repository || '') || branch !== 'snapshots') fail('github_repository');
    Object.assign(this, { owner, repository, branch, token, fetchImpl, timeoutMs, key });
    this.base = `/repos/${owner}/${repository}`;
  }
  async api(path, method = 'GET', body) {
    const token = await this.token(); if (typeof token !== 'string' || !token) fail('github_authentication');
    let response;
    try { response = await this.fetchImpl(`https://api.github.com${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Salero-Editorial-Staging' },
      body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch { fail('github_unavailable'); }
    if (response.status >= 500) fail('github_unavailable');
    if (response.status === 409 || response.status === 422) fail('github_conflict');
    if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) fail('github_rate_limit');
    if (response.status !== 200 && response.status !== 201) fail('github_http');
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) fail('github_json');
    // Bound the API envelope as well as decoded snapshot size.
    const reader = response.body.getReader(), parts = []; let length = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length;
      if (length > 2000000) { await reader.cancel(); fail('github_response_size'); } parts.push(value); }
    let data; try { data = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { fail('github_json'); }
    return data;
  }
  async isolated() {
    const repo = await this.api(this.base);
    if (repo.private !== true || repo.name !== this.repository || repo.owner?.login?.toLowerCase() !== this.owner.toLowerCase() || repo.archived || repo.disabled) fail('github_isolation');
  }
  async dispatch(notification) {
    await this.isolated();
    const token = await this.token();
    let response;
    try { response = await this.fetchImpl(`https://api.github.com${this.base}/dispatches`, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Salero-Editorial-Staging' },
      body: JSON.stringify({ event_type: 'salero-rebotica-staging', client_payload: { job_id: notification.jobId, generation: notification.generation, code_sha: notification.codeSha } }) }); }
    catch { fail('github_unavailable'); }
    if (response.status !== 204) fail(response.status === 429 ? 'github_rate_limit' : 'github_unavailable');
  }
  async blob(body) {
    const r = await this.api(`${this.base}/git/blobs`, 'POST', { content: Buffer.from(body).toString('base64'), encoding: 'base64' });
    if (!gitSha(r.sha)) fail('github_identity'); return r.sha;
  }
  async readBlob(id) {
    if (!gitSha(id)) fail('github_identity');
    const r = await this.api(`${this.base}/git/blobs/${id}`);
    if (r.sha !== id || r.encoding !== 'base64' || typeof r.content !== 'string' || !Number.isSafeInteger(r.size) || r.size < 1 || r.size > 1048576) fail('github_blob');
    const compact = r.content.replace(/[\r\n]/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) fail('github_blob');
    const bytes = Buffer.from(compact, 'base64'); if (bytes.length !== r.size || bytes.toString('base64') !== compact) fail('github_blob');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); return text;
  }
  async read(locator) {
    if (![locator?.commit, locator?.tree, locator?.blob, locator?.manifest].every(gitSha)) fail('github_identity');
    await this.isolated();
    const commit = await this.api(`${this.base}/git/commits/${locator.commit}`);
    if (commit.sha !== locator.commit || commit.tree?.sha !== locator.tree) fail('github_commit');
    const tree = await this.api(`${this.base}/git/trees/${locator.tree}?recursive=1`);
    if (tree.sha !== locator.tree || tree.truncated !== false || !Array.isArray(tree.tree)) fail('github_tree');
    const member = (path, sha) => tree.tree.filter(x => x.path === path && x.type === 'blob' && x.mode === '100644' && x.sha === sha).length === 1;
    if (!member(locator.path, locator.blob) || !member(locator.manifestPath, locator.manifest)) fail('github_membership');
    const body = await this.readBlob(locator.blob), manifestBody = await this.readBlob(locator.manifest);
    if (sha256(manifestBody) !== locator.manifestHash) fail('github_manifest');
    let metadata; try { metadata = JSON.parse(manifestBody); } catch { fail('github_manifest'); }
    const packet = { ...metadata, body }; verifySnapshot(packet, this.key);
    if (packet.snapshotId !== locator.snapshotId || locator.path !== `snapshots/${packet.sha256}.json`
      || locator.manifestPath !== `manifests/${packet.generation}-${packet.batchId}.json`) fail('github_manifest');
    return packet;
  }
  async put(packet, journal, checkpoint, fence) {
    verifySnapshot(packet, this.key); await this.isolated(); await fence();
    if (journal.snapshotId !== packet.snapshotId || journal.generation !== packet.generation || journal.batchId !== packet.batchId) fail('github_intent');
    // Persist each successful stage. A lost create ACK is safely retried using deterministic content.
    const save = async change => { journal = { ...journal, ...change }; await checkpoint(journal); };
    if (!journal.parent) {
      const ref = await this.api(`${this.base}/git/ref/heads/${this.branch}`);
      if (!gitSha(ref.object?.sha)) fail('github_reference'); await save({ parent: ref.object.sha });
    }
    if (!journal.parentTree) {
      const c = await this.api(`${this.base}/git/commits/${journal.parent}`);
      if (c.sha !== journal.parent || !gitSha(c.tree?.sha)) fail('github_commit'); await save({ parentTree: c.tree.sha });
    }
    if (!journal.blob) await save({ blob: await this.blob(packet.body) });
    const manifestBody = json(identity(packet));
    if (!journal.manifest) await save({ manifest: await this.blob(manifestBody), manifestHash: sha256(manifestBody),
      path: `snapshots/${packet.sha256}.json`, manifestPath: `manifests/${packet.generation}-${packet.batchId}.json` });
    if (!journal.tree) {
      const r = await this.api(`${this.base}/git/trees`, 'POST', { base_tree: journal.parentTree, tree: [
        { path: journal.path, mode: '100644', type: 'blob', sha: journal.blob },
        { path: journal.manifestPath, mode: '100644', type: 'blob', sha: journal.manifest } ] });
      if (!gitSha(r.sha)) fail('github_tree'); await save({ tree: r.sha });
    }
    if (!journal.commit) {
      const author = { name: 'Salero editorial coordinator', email: 'editorial@users.noreply.github.com', date: journal.createdAt };
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(journal.createdAt || '')) fail('github_intent');
      const r = await this.api(`${this.base}/git/commits`, 'POST', { message: `Snapshot ${packet.generation} ${packet.sha256}`, tree: journal.tree,
        parents: [journal.parent], author, committer: author });
      if (!gitSha(r.sha)) fail('github_commit'); await save({ commit: r.sha });
    }
    await fence();
    const ref = await this.api(`${this.base}/git/ref/heads/${this.branch}`);
    if (ref.object?.sha !== journal.commit) {
      if (ref.object?.sha !== journal.parent) fail('github_conflict');
      const updated = await this.api(`${this.base}/git/refs/heads/${this.branch}`, 'PATCH', { sha: journal.commit, force: false });
      if (updated.object?.sha !== journal.commit) fail('github_reference');
    }
    const confirmed = await this.read(journal);
    if (json(identity(confirmed)) !== json(identity(packet))) fail('github_manifest');
    await fence(); return journal;
  }
}
