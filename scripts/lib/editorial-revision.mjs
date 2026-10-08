// Revision diagnostics never include response bodies, query strings or credentials.
export async function readEditorialRevision(url, { fetchImpl = fetch, timeoutMs = 15000, onRead = () => {} } = {}) {
  const expected = new URL(url);
  const safeUrl = value => {
    try {
      const u = new URL(value, expected);
      return { hostname: u.hostname, path: u.pathname === expected.pathname ? u.pathname : '[other-path]' };
    } catch { return { hostname: null, path: null }; }
  };
  const info = { httpStatus: null, contentType: null, redirected: false, finalUrl: safeUrl(url), responseBytes: null };
  const fail = (logicalCode, message = 'Editorial revision unavailable') => {
    const error = new Error(message);
    error.revisionDiagnostic = { ...info, logicalCode };
    throw error;
  };
  try {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', redirect: 'manual', headers: { Accept: 'application/json' } });
    info.httpStatus = r.status;
    const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    info.contentType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(type) ? type : '[missing-or-invalid]';
    info.redirected = r.redirected || (r.status >= 300 && r.status < 400);
    info.finalUrl = safeUrl(r.url || url);
    const body = await r.text();
    info.responseBytes = Buffer.byteLength(body);
    if (type === 'text/html') info.responseKind = /\/\.well-known\/sgcaptcha\/|sgcaptcha|__sg_tk/i.test(body) ? 'siteground-challenge' : /captcha|challenge/i.test(body) ? 'challenge-html' : /<script/i.test(body) ? 'script-html' : 'other-html';
    if (info.redirected) {
      info.finalUrl = safeUrl(r.headers.get('location') || r.url || url);
      fail('redirect');
    }
    if (r.status !== 200) fail('http-status');
    if (type !== 'application/json') fail('content-type');
    let data;
    try { data = JSON.parse(body); } catch { fail('json-parse'); }
    if (!data || typeof data !== 'object' || !Object.hasOwn(data, 'revision')) fail('missing-revision');
    if (typeof data.revision !== 'string' || !/^[a-f0-9]{64}$/.test(data.revision)) fail('invalid-revision-format');
    if (!Object.hasOwn(data, 'editing')) fail('missing-editing');
    if (data.editing !== false) fail('invalid-editing', 'Editorial revision invalid or edit in progress');
    onRead({ ...info, logicalCode: 'valid', revision: data.revision, editing: false });
    return data.revision;
  } catch (error) {
    if (error.revisionDiagnostic) throw error;
    const timeout = ['AbortError', 'TimeoutError'].includes(error.name) || /timeout/i.test(error.message || '') || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(error.cause?.code);
    fail(timeout ? 'timeout' : 'network');
  }
}
