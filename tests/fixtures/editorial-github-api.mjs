// Offline GitHub API fixture only. No credentials or remote repository are used.
import { createHash, createVerify, randomBytes } from 'node:crypto';
export class LocalGitHubAPI {
  constructor(publicKey) {
    this.publicKey = publicKey; this.token = randomBytes(32).toString('hex'); this.private = true; this.calls = []; this.blobs = new Map(); this.trees = new Map(); this.commits = new Map();
    this.head = this.object(this.commits, { tree: { sha: this.object(this.trees, []) } }); this.dispatches = [];
    this.fault = null;
  }
  hash(value) { return createHash('sha1').update(JSON.stringify(value)).digest('hex'); }
  object(map, value) { const sha = this.hash(value); map.set(sha, structuredClone(value)); return sha; }
  async fetch(request, options) {
    if (typeof request === 'string' || request instanceof URL) request = new Request(request, options);
    const url = new URL(request.url), method = request.method, path = url.pathname;
    if (url.hostname !== 'api.github.com') throw new Error('unexpected_network');
    if (request.headers.get('user-agent') !== 'Salero-Editorial-Staging') return Response.json({}, {status:403});
    this.calls.push({ method, path });
    const fault = this.fault && path.endsWith(this.fault.path) && (!this.fault.method || this.fault.method === method) ? this.fault : null;
    if (fault) this.fault = null;
    if (fault?.status) return Response.json({ message: 'simulated' }, { status: fault.status, headers: fault.status === 403 ? { 'x-ratelimit-remaining': '0' } : {} });
    const body = method === 'GET' ? null : await request.json();
    const send = (data, status = 200) => { if (fault?.lost) throw new Error('lost_ack'); return Response.json(data, { status }); };
    if (path === '/app/installations/2/access_tokens') {
      const jwt = request.headers.get('authorization')?.replace('Bearer ', '').split('.');
      if (jwt?.length !== 3 || !createVerify('RSA-SHA256').update(`${jwt[0]}.${jwt[1]}`).verify(this.publicKey, Buffer.from(jwt[2], 'base64url'))) return Response.json({}, { status: 401 });
      if (JSON.stringify(body) !== JSON.stringify({ repositories: ['salero-editorial-snapshots-staging'], permissions: { contents: 'write' } })) return Response.json({}, { status: 403 });
      return send({ token: this.token, expires_at: new Date(Date.now() + 3600000).toISOString(), permissions: { contents: 'write' } }, 201);
    }
    if (request.headers.get('authorization') !== `Bearer ${this.token}`) return Response.json({}, { status: 401 });
    const base = '/repos/local-test/salero-editorial-snapshots-staging';
    if (!path.startsWith(base)) throw new Error('unexpected_repository');
    const route = path.slice(base.length);
    if (route === '/dispatches' && method === 'POST') {
      this.dispatches.push(body);
      if (fault?.lost) throw new Error('lost_ack');
      return new Response(null, { status: 204 });
    }
    if (!route) return send({ private: this.private, name: 'salero-editorial-snapshots-staging', owner: { login: 'local-test' } });
    if (route === '/git/blobs' && method === 'POST') {
      const content = Buffer.from(body.content, 'base64'), sha = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex'); this.blobs.set(sha, content);
      return send({ sha }, 201);
    }
    if (route.startsWith('/git/blobs/') && method === 'GET') {
      const sha = route.split('/').at(-1), blob = this.blobs.get(sha); if (!blob) return Response.json({}, { status: 404 });
      return send({ sha, encoding: 'base64', content: blob.toString('base64'), size: blob.length });
    }
    if (route === '/git/trees' && method === 'POST') {
      const entries = new Map((this.trees.get(body.base_tree) || []).map(x => [x.path, x]));
      for (const entry of body.tree) entries.set(entry.path, entry);
      return send({ sha: this.object(this.trees, [...entries.values()].sort((a,b) => a.path.localeCompare(b.path))) }, 201);
    }
    if (route.startsWith('/git/trees/') && method === 'GET') { const sha = route.split('/').at(-1); return send({ sha, truncated: false, tree: this.trees.get(sha) }); }
    if (route === '/git/commits' && method === 'POST') return send({ sha: this.object(this.commits, { ...body, tree: { sha: body.tree } }) }, 201);
    if (route.startsWith('/git/commits/') && method === 'GET') { const sha = route.split('/').at(-1); return send({ sha, ...this.commits.get(sha) }); }
    if (route === '/git/ref/heads/snapshots') return send({ object: { sha: this.head } });
    if (route === '/git/refs/heads/snapshots' && method === 'PATCH') {
      if (body.force !== false || this.commits.get(body.sha)?.parents?.[0] !== this.head) return Response.json({}, { status: 409 });
      this.head = body.sha; return send({ object: { sha: this.head } });
    }
    return Response.json({}, { status: 404 });
  }
}
