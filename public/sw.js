const CACHE_NAME = 'gel-ferramentaria-v2';
const ASSETS = [
  './',
  './index.html',
  './logo.png',
  './favicon.svg',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Erro ao pré-armazenar assets em cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  // Only handle http/https requests (skip chrome-extension://, data:, blob:)
  if (!e.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(e.request.url);

  // Bypass all external APIs, Firebase, Google APIs, and telemetry
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('googletagmanager.com') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate: update cache in background for local assets
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          }
        }).catch(() => {
          // Ignore background fetch errors (e.g. offline)
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline/network fails and it's a page navigation, return index.html fallback
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html').then((indexFallback) => {
              if (indexFallback) return indexFallback;
              return caches.match('./');
            });
          }
          // Return a safe error response instead of rejecting unhandled
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});

