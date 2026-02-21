const CACHE_NAME = 'zeroane-v1';
const OFFLINE_PAGE = '/404.html';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/404.html',
  '/index.html',
];

// ── Install: pre-cache critical assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first with 404 fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts, APIs, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If server returns a real 404, serve our custom page
        if (response.status === 404) {
          return caches.match(OFFLINE_PAGE);
        }

        // Cache successful responses for later offline use
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }

        return response;
      })
      .catch(() => {
        // Network completely failed (offline, DNS error, timeout)
        return caches.match(event.request).then(
          (cachedResponse) => cachedResponse || caches.match(OFFLINE_PAGE)
        );
      })
  );
});
