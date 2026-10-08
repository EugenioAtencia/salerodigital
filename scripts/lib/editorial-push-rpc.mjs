// Authenticated in-process transport simulator. No HTTP endpoints are created.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { canonical, fail } from './editorial-push-snapshot.mjs';
const fields = request => ({ role: request.role, operation: request.operation, args: request.args, at: request.at, nonce: request.nonce });
export function signCommand(role, operation, args, key, at, nonce = randomUUID()) {
  const request = { role, operation, args, at, nonce };
  request.signature = createHmac('sha256', key).update(JSON.stringify(canonical(fields(request)))).digest('hex');
  return request;
}
export class AuthenticatedCoordinatorRPC {
  constructor(coordinator, keys, clock) { this.coordinator = coordinator; this.keys = keys; this.clock = clock; }
  invoke(request) {
    if (!['editor', 'builder', 'monitor'].includes(request?.role)) fail('rpc_authentication');
    const now = this.clock(), key = this.keys[request.role];
    if (!key || !Number.isSafeInteger(request.at) || Math.abs(now - request.at) > 60
      || !/^[a-z0-9-]{1,80}$/.test(request.nonce || '') || !Array.isArray(request.args)
      || !/^[a-f0-9]{64}$/.test(request.signature || '')) fail('rpc_authentication');
    const signature = createHmac('sha256', key).update(JSON.stringify(canonical(fields(request)))).digest();
    if (!timingSafeEqual(signature, Buffer.from(request.signature, 'hex'))) fail('rpc_authentication');
    const permitted = { editor: ['begin', 'offer', 'notify'], builder: ['claim', 'check', 'preparePromotion'], monitor: ['settle', 'uncertain', 'abort'] };
    if (!permitted[request.role]?.includes(request.operation)) fail('rpc_permission');
    const nonces = this.coordinator.state.nonces ||= {};
    for (const [nonce, expiry] of Object.entries(nonces)) if (expiry < now) delete nonces[nonce];
    if (nonces[request.nonce] !== undefined) fail('rpc_replay');
    nonces[request.nonce] = request.at + 60;
    return this.coordinator[request.operation](...request.args);
  }
}
