import { signCommand } from './editorial-push-rpc.mjs';
import { fail } from './editorial-push-snapshot.mjs';

// Explicit staging client only. Retrying reuses operation identity with a fresh nonce.
export async function stagingCommand({ url, role, operation, args, key, timeoutMs = 5000, fetchImpl = fetch }) {
  const endpoint = new URL(url);
  const local = ['localhost', '127.0.0.1'].includes(endpoint.hostname);
  if (endpoint.pathname !== '/rpc' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password
    || (!local && (endpoint.protocol !== 'https:' || !/^salero-push-staging\.[a-z0-9-]+\.workers\.dev$/.test(endpoint.hostname)))
    || (local && !['http:', 'https:'].includes(endpoint.protocol))) fail('staging_endpoint');
  const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs), headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(signCommand(role, operation, args, key, Math.floor(Date.now() / 1000))) });
  if (response.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) fail('coordinator_unavailable');
  const data = await response.json();
  if (data?.ok !== true) fail(/^[a-z_]{1,60}$/.test(data?.error || '') ? data.error : 'coordinator_unconfirmed');
  return data.value;
}
