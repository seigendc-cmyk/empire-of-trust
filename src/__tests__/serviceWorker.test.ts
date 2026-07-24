import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type FetchHandler = (event: {
  request: { method: string; url: string; mode: string };
  respondWith: (response: Promise<Response>) => void;
}) => void;

function serviceWorkerHarness(options: {
  fetchResult?: Response;
  fetchError?: Error;
  cachedIndex?: Response;
} = {}) {
  const listeners = new Map<string, (...args: never[]) => unknown>();
  const fetchMock = vi.fn(async () => {
    if (options.fetchError) throw options.fetchError;
    return options.fetchResult || new Response('network', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
    });
  });
  const cachesMock = {
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
    match: vi.fn(async (request: string | { url?: string }) => {
      if (request === '/index.html') return options.cachedIndex;
      return undefined;
    }),
    open: vi.fn(async () => ({
      addAll: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
    })),
  };
  const selfMock = {
    location: { origin: 'https://preview.example' },
    clients: { claim: vi.fn(async () => undefined) },
    skipWaiting: vi.fn(async () => undefined),
    addEventListener: (type: string, handler: (...args: never[]) => unknown) => {
      listeners.set(type, handler);
    },
  };
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
  runInNewContext(source, {
    self: selfMock,
    caches: cachesMock,
    fetch: fetchMock,
    Response,
    URL,
    Promise,
  });
  return {
    fetchHandler: listeners.get('fetch') as FetchHandler,
    fetchMock,
    cachesMock,
  };
}

async function dispatch(
  handler: FetchHandler,
  request: { method: string; url: string; mode: string },
) {
  let responsePromise: Promise<Response> | undefined;
  handler({
    request,
    respondWith: (response) => { responsePromise = response; },
  });
  return responsePromise;
}

describe('service worker fetch safety', () => {
  it.each([
    '/staff/login',
    '/staff/books',
    '/staff/series',
  ])('settles a failed navigation to %s with the cached SPA shell', async (path) => {
    const cached = new Response('cached shell', { status: 200 });
    const { fetchHandler } = serviceWorkerHarness({
      fetchError: new Error('offline'),
      cachedIndex: cached,
    });
    const response = await dispatch(fetchHandler, {
      method: 'GET',
      url: `https://preview.example${path}`,
      mode: 'navigate',
    });
    expect(response).toBe(cached);
  });

  it('settles a cache-miss network failure with a 503 response', async () => {
    const { fetchHandler } = serviceWorkerHarness({
      fetchError: new Error('offline'),
    });
    const response = await dispatch(fetchHandler, {
      method: 'GET',
      url: 'https://preview.example/assets/app.js',
      mode: 'cors',
    });
    expect(response).toMatchObject({ status: 503 });
  });

  it('settles a failed SQLite WASM fetch instead of rejecting respondWith', async () => {
    const { fetchHandler } = serviceWorkerHarness({
      fetchError: new Error('offline'),
    });
    const response = await dispatch(fetchHandler, {
      method: 'GET',
      url: 'https://preview.example/assets/sql-wasm-validHash.wasm',
      mode: 'cors',
    });
    expect(response).toMatchObject({ status: 503 });
  });

  it.each([
    'https://preview.example/api/staff/audit-logs',
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp',
    'https://firestore.googleapis.com/v1/projects/example/databases/(default)',
    'https://accounts.google.com/o/oauth2/auth',
  ])('does not intercept sensitive request %s', async (url) => {
    const { fetchHandler, fetchMock, cachesMock } = serviceWorkerHarness();
    const response = await dispatch(fetchHandler, { method: 'GET', url, mode: 'cors' });
    expect(response).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cachesMock.match).not.toHaveBeenCalled();
  });
});
