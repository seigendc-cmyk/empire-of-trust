// Service Worker for Empire Of Trust Offline PWA
const CACHE_NAME = 'empire-of-trust-v3';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];
let sqliteWasmPath = null;

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SQLITE_WASM_URL' || typeof event.data.url !== 'string') return;
  try {
    sqliteWasmPath = new URL(event.data.url, self.location.origin).pathname;
  } catch {
    sqliteWasmPath = null;
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

function isHashedSqliteWasmPath(pathname) {
  return /^\/assets\/sql-wasm-[A-Za-z0-9_-]+\.wasm$/.test(pathname);
}

async function fetchVerifiedWasm(request) {
  const url = new URL(request.url);
  if (
    url.pathname === '/sql-wasm.wasm' ||
    !isHashedSqliteWasmPath(url.pathname) ||
    (sqliteWasmPath && url.pathname !== sqliteWasmPath)
  ) {
    return new Response('Unversioned or unexpected SQLite WASM asset.', {
      status: 410,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const response = await fetch(request, { cache: 'no-store' });
  const contentType = response.headers.get('Content-Type') || '';
  const contentRange = response.headers.get('Content-Range');
  if (
    !response.ok ||
    response.status !== 200 ||
    response.type === 'opaque' ||
    response.redirected ||
    contentRange ||
    !contentType.toLowerCase().startsWith('application/wasm')
  ) {
    throw new Error('Rejected invalid SQLite WASM response.');
  }
  return response;
}

function isSafeToCache(request, response) {
  if (
    !response ||
    response.status !== 200 ||
    response.type !== 'basic' ||
    response.redirected ||
    response.headers.get('Content-Range')
  ) {
    return false;
  }
  const contentType = response.headers.get('Content-Type') || '';
  return request.mode === 'navigate' || !contentType.toLowerCase().includes('text/html');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.endsWith('.wasm')) {
    // WASM is always network-only and is never written to Cache Storage.
    event.respondWith(fetchVerifiedWasm(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        void fetch(event.request)
          .then((networkResponse) => {
            if (isSafeToCache(event.request, networkResponse)) {
              return caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, networkResponse.clone()));
            }
          })
          .catch(() => undefined);
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (isSafeToCache(event.request, networkResponse)) {
          const responseToCache = networkResponse.clone();
          void caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
