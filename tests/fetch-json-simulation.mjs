import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const apiSource = readFileSync(new URL('../assets/js/api.js', import.meta.url), 'utf8');

function createFetchJson(responseFactory) {
  const calls = [];
  const context = {
    console,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return responseFactory(url, options);
    },
    Headers,
    Response,
    URL,
    window: {
      location: { origin: 'https://agenciaconsalero.es' }
    },
    SALERO_CONFIG: {
      apiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
      cmsApiBase: 'https://cms.webagencia360.com/wp-json/wp/v2',
      endpoints: {}
    }
  };

  vm.createContext(context);
  vm.runInContext(apiSource, context);

  return { fetchJson: context.window.saleroFetchJson, calls };
}

async function assertRejectsWith(fetchJson, expected) {
  try {
    await fetchJson('https://cms.webagencia360.com/wp-json/wp/v2/posts?token=secret-token');
  } catch (error) {
    Object.entries(expected).forEach(([key, value]) => assert.equal(error[key], value));
    assert.equal(error.url.includes('secret-token'), false);
    assert.equal(error.url.includes('token=%5Bredacted%5D') || error.url.includes('token=[redacted]'), true);
    return error;
  }

  throw new Error('Expected fetchJson to reject');
}

{
  const { fetchJson } = createFetchJson(() => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
  const data = await fetchJson('https://cms.webagencia360.com/wp-json/wp/v2/posts');
  assert.equal(data.ok, true);
}

{
  const { fetchJson } = createFetchJson(() => new Response('<!doctype html><html><body>WordPress</body></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  }));
  const error = await assertRejectsWith(fetchJson, {
    status: 200,
    contentType: 'text/html; charset=utf-8',
    responseType: 'HTML'
  });
  assert.match(error.message, /respuesta inesperada HTML/);
  assert.equal(error.bodySample.includes('<!doctype html>'), true);
}

{
  const { fetchJson } = createFetchJson(() => new Response(JSON.stringify({ code: 'not_found' }), {
    status: 404,
    statusText: 'Not Found',
    headers: { 'Content-Type': 'application/json' }
  }));
  const error = await assertRejectsWith(fetchJson, {
    status: 404,
    statusText: 'Not Found',
    contentType: 'application/json',
    responseType: 'JSON'
  });
  assert.match(error.message, /estado 404/);
}

{
  const { fetchJson } = createFetchJson(() => new Response('<html><body>Error</body></html>', {
    status: 500,
    statusText: 'Internal Server Error',
    headers: { 'Content-Type': 'text/html' }
  }));
  const error = await assertRejectsWith(fetchJson, {
    status: 500,
    statusText: 'Internal Server Error',
    contentType: 'text/html',
    responseType: 'HTML'
  });
  assert.match(error.message, /estado 500/);
}

{
  const { fetchJson } = createFetchJson(() => new Response('{bad json', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
  const error = await assertRejectsWith(fetchJson, {
    status: 200,
    contentType: 'application/json',
    responseType: 'JSON malformado'
  });
  assert.match(error.message, /JSON malformado/);
}

{
  const controller = new AbortController();
  const { fetchJson, calls } = createFetchJson(() => new Response('[]', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
  await fetchJson('https://cms.webagencia360.com/wp-json/wp/v2/posts', { signal: controller.signal });
  assert.equal(calls[0].options.signal, controller.signal);
}

console.log('fetchJson simulations passed');
