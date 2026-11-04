import { fail } from './editorial-push-snapshot.mjs';
// Retry the same logical operation using a fresh RPC nonce each time. State lives in DO/outbox.
export async function retryEditorial(operation, { attempts = 3, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), baseMs = 1000 } = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5 || !Number.isInteger(baseMs) || baseMs < 0 || baseMs > 10000) fail('retry_configuration');
  for (let n = 0; n < attempts; n++) {
    try { return await operation(); }
    catch (error) {
      const transient = ['github_unavailable','github_rate_limit','snapshot_unavailable','coordinator_unavailable','promoter_unavailable','pages_unavailable','deployment_outcome_unknown'].includes(error.message)
        || error.name === 'TimeoutError' || (error instanceof TypeError && error.message === 'fetch failed');
      if (!transient || n === attempts - 1) throw error;
      await wait(Math.min(baseMs * 2 ** n, 30000));
    }
  }
}
