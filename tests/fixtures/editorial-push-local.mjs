// Durable/local adapters for simulations ONLY. No WordPress hook coverage is implied.
import { fail, sha256, signSnapshot } from '../../scripts/lib/editorial-push-snapshot.mjs';
export class MemorySnapshotStore {
  constructor() { this.objects = new Map(); this.fault = null; this.onPut = null; }
  put(id, body) {
    if (this.fault === 'before-write') fail('upload_unavailable');
    if (this.objects.has(id) && this.objects.get(id) !== body) fail('immutable_collision');
    this.objects.set(id, body);
    if (this.onPut) this.onPut();
    if (this.fault === 'lost-ack') fail('upload_unknown');
  }
  get(id) { if (!this.objects.has(id)) fail('object_missing'); return this.objects.get(id); }
}
export class LocalEditor {
  constructor(rpc, state = null) {
    this.rpc = rpc;
    this.state = state ? structuredClone(state) : { batchCounter: 0, intent: null, permit: null, gate: 'closed', version: 0, events: {}, outbox: null };
  }
  checkpoint() { return structuredClone(this.state); }
  open() {
    if (this.state.gate === 'editing') return structuredClone(this.state.permit);
    if (this.state.gate === 'frozen') fail('export_frozen');
    if (!this.state.intent) this.state.intent = `batch-${++this.state.batchCounter}`;
    const permit = this.rpc(this.state.intent); // A lost ACK never authorizes local writes.
    this.state.permit = permit; this.state.intent = null; this.state.gate = 'editing';
    return structuredClone(permit);
  }
  start(id) {
    if (this.state.gate !== 'editing' || !this.state.permit) fail('editorial_unannounced');
    if (this.state.events[id]) fail('event_duplicate');
    this.state.events[id] = { complete: false }; this.state.version++;
  }
  finish(id) {
    if (!this.state.events[id] || this.state.events[id].complete) fail('event_identity');
    this.state.events[id].complete = true;
  }
  save(id, mutate = () => {}) { this.start(id); mutate(); this.finish(id); }
  revision() { return { revision: this.state.version ? sha256(`local-editorial:${this.state.version}`) : 'a'.repeat(64),
    editing: Object.values(this.state.events).some(event => !event.complete) }; }
  freeze() {
    if (this.state.gate !== 'editing' || this.revision().editing) fail('local_incomplete');
    this.state.gate = 'frozen';
    return this.revision().revision;
  }
  prepare(snapshot, key) {
    if (this.state.gate !== 'frozen' || snapshot.revision !== this.revision().revision) fail('local_export_revision');
    this.state.outbox = signSnapshot(snapshot, this.state.permit.generation, this.state.permit.batchId, key);
    return structuredClone(this.state.outbox);
  }
  acknowledge() {
    if (this.state.gate !== 'frozen' || !this.state.outbox) fail('local_outbox_missing');
    this.state.permit = null; this.state.outbox = null; this.state.events = {}; this.state.gate = 'closed';
  }
}
export function replacePayload(snapshot, change) {
  const payload = JSON.parse(snapshot.body); change(payload);
  const body = JSON.stringify(payload), hash = sha256(body);
  return { ...snapshot, revision: payload.revision, counts: payload.counts, body, bytes: Buffer.byteLength(body), sha256: hash, snapshotId: `sha256:${hash}` };
}
