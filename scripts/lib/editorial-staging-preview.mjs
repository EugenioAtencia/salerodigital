import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './editorial-push-snapshot.mjs';

// Applied only to the isolated staging artifact. Source Functions and production
// builds retain their original middleware and SEO behavior.
export async function applyStagingPreview(directory, { scope, branch }) {
  if (scope !== 'rebotica' || branch !== 'codex/rebotica-editorial-staging') return false;
  const file = path.join(directory, 'functions/_middleware.js');
  const original = await readFile(file, 'utf8');
  const entry = 'export async function onRequest(context)';
  const gtm = "const GTM_ID = 'GTM-WSLMDJ8N';";
  if (!original.includes(entry) || !original.includes(gtm)) fail('staging_middleware_shape');
  const middleware = original.replace(entry, 'async function originalOnRequest(context)').replace(gtm, "const GTM_ID = '';");
  const wrapper = `
// Generated staging-only response policy. HTML hashes certify the ASSETS bytes
// before the existing middleware and this policy transform the response.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\\.)?salerodigital-staging\\.pages\\.dev$/.test(url.hostname)) {
    return new Response('Staging host required.', {status: 503, headers: {'X-Robots-Tag': 'noindex, nofollow'}});
  }
  const response = await originalOnRequest(context);
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (headers.has('location')) headers.set('location', headers.get('location').replaceAll('https://agenciaconsalero.es', url.origin));
  if (!(headers.get('content-type') || '').includes('text/html')) {
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
  let html = await response.text();
  html = html.replace(/<!-- Google Tag Manager(?: \\(noscript\\))? -->[\\s\\S]*?<!-- End Google Tag Manager(?: \\(noscript\\))? -->/g, '');
  html = html.replace(/<!-- Google Consent Mode v2 -->[\\s\\S]*?<!-- End Google Consent Mode v2 -->/g, '');
  html = html.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, tag => /googletagmanager\\.com|google-analytics\\.com|gtag\\(['"]config/.test(tag) ? '' : tag);
  html = html.replace(/<noscript\\b[^>]*>[\\s\\S]*?<\\/noscript>/gi, tag => /googletagmanager\\.com/.test(tag) ? '' : tag);
  html = html.replaceAll('https://agenciaconsalero.es', url.origin).replaceAll('https://salero.webagencia360.com', url.origin);
  html = html.replace(/<meta\\b[^>]*name=['"]robots['"][^>]*>/gi, '').replace('</head>', '<meta name="robots" content="noindex, nofollow">\\n</head>');
  headers.delete('content-length');
  return new Response(html, {status: response.status, statusText: response.statusText, headers});
}
`;
  await writeFile(file, middleware + wrapper);
  return true;
}
