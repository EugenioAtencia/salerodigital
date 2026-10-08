import { createSign } from 'node:crypto';
import { fail } from '../../../scripts/lib/editorial-push-snapshot.mjs';
export function installationToken(env, fetchImpl = fetch) {
  let cached = null;
  return async () => {
    if (cached && cached.expires > Date.now() + 60000) return cached.token;
    if (!/^\d+$/.test(env.GITHUB_APP_ID || '') || !/^\d+$/.test(env.GITHUB_INSTALLATION_ID || '') || !env.GITHUB_APP_PRIVATE_KEY) fail('github_configuration');
    const at = Math.floor(Date.now() / 1000), encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: at - 60, exp: at + 540, iss: env.GITHUB_APP_ID })}`;
    const signature = createSign('RSA-SHA256').update(payload).sign(env.GITHUB_APP_PRIVATE_KEY).toString('base64url');
    let response;
    try { response = await fetchImpl(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${payload}.${signature}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10' },
      body: JSON.stringify({ repositories: [env.GITHUB_REPOSITORY], permissions: { contents: 'write' } }) }); } catch { fail('github_authentication'); }
    if (response.status !== 201 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) fail('github_authentication');
    // Token responses are bounded; no response body is logged or returned to WordPress/Pages.
    const reader = response.body.getReader(), parts = []; let bytes = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 16384) { await reader.cancel(); fail('github_authentication'); } parts.push(value); }
    const text = Buffer.concat(parts).toString('utf8');
    let data; try { data = JSON.parse(text); } catch { fail('github_authentication'); }
    const expires = Date.parse(data.expires_at);
    if (!data.token || !Number.isFinite(expires) || expires <= Date.now() + 60000 || data.permissions?.contents !== 'write') fail('github_authentication');
    cached = { token: data.token, expires }; return cached.token;
  };
}
