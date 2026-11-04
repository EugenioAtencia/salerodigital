import { createSign, createPrivateKey } from 'node:crypto';
import { fail } from '../../../scripts/lib/editorial-push-snapshot.mjs';

// Diagnostics never include exceptions, response bodies, credentials or JWTs.
export function installationToken(env, fetchImpl = (...args) => fetch(...args), { diagnostic = () => {}, now = Date.now } = {}) {
  let cached = null;
  return async () => {
    if (cached && cached.expires > now() + 60000) return cached.token;
    const started = now();
    const report = (category, response) => {
      const record = { category, durationMs: Math.max(0, Math.round(now() - started)) };
      if (response) {
        record.httpStatus = response.status;
        const id = response.headers.get('x-github-request-id');
        if (/^[A-Fa-f0-9:-]{1,128}$/.test(id || '')) record.requestId = id;
        const serverTime = Date.parse(response.headers.get('date'));
        if (Number.isFinite(serverTime)) record.clockOffsetMs = Math.round(serverTime - now());
      }
      try { diagnostic(record); } catch { /* Telemetry cannot change authentication outcomes. */ }
    };
    const reject = (code, response) => { report(code, response); fail(code); };
    if (!/^\d+$/.test(env.GITHUB_APP_ID || '') || !/^\d+$/.test(env.GITHUB_INSTALLATION_ID || '') || !env.GITHUB_APP_PRIVATE_KEY)
      reject('github_configuration');
    const at = Math.floor(now() / 1000), encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: at - 60, exp: at + 540, iss: env.GITHUB_APP_ID })}`;
    let signature;
    try {
      const key = createPrivateKey(env.GITHUB_APP_PRIVATE_KEY);
      if (key.asymmetricKeyType !== 'rsa') throw new Error();
      signature = createSign('RSA-SHA256').update(payload).sign(key).toString('base64url');
    } catch { reject('github_jwt_signature'); }
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${payload}.${signature}`, Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Salero-Editorial-Staging' },
        body: JSON.stringify({ repositories: [env.GITHUB_REPOSITORY], permissions: { contents: 'write' } })
      });
    } catch (error) {
      reject(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'github_timeout' : error instanceof TypeError ? 'github_network' : 'github_worker_error');
    }
    if (response.status !== 201) {
      const code = ({ 401: 'github_unauthorized', 403: 'github_forbidden', 404: 'github_not_found', 422: 'github_unprocessable', 429: 'github_rate_limit' })[response.status]
        || (response.status >= 500 ? 'github_server_error' : response.status >= 300 && response.status < 400 ? 'github_redirect' : 'github_http_error');
      // Dispose of the body without inspecting or logging GitHub messages.
      try { await response.body?.cancel(); } catch { /* Preserve the original HTTP diagnosis. */ }
      reject(code, response);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
      try { await response.body?.cancel(); } catch { /* Preserve the content-type diagnosis. */ }
      reject('github_content_type', response);
    }
    const parts = []; let bytes = 0;
    try {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.length;
        if (bytes > 16384) { await reader.cancel(); reject('github_response_size', response); }
        parts.push(value);
      }
    } catch (error) {
      if (error?.message === 'github_response_size') throw error;
      reject(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'github_timeout' : 'github_response_read', response);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { reject('github_token_response', response); }
    const expires = Date.parse(data?.expires_at);
    if (typeof data?.token !== 'string' || !data.token || !Number.isFinite(expires) || expires <= now() + 60000 || data.permissions?.contents !== 'write')
      reject('github_token_invalid', response);
    cached = { token: data.token, expires };
    report('github_token_created', response);
    return cached.token;
  };
}
