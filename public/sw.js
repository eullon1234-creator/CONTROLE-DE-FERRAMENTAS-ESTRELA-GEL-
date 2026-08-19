const CACHE_NAME = 'gel-ferramentaria-v4';
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
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  // Only handle http/https requests
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

  // 1. Navigation requests (HTML / page loads): NETWORK FIRST to ensure fresh deployment updates
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, fallback to cached index.html
          return caches.match('./index.html').then((cachedIndex) => {
            if (cachedIndex) return cachedIndex;
            return caches.match('./');
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images): Cache First with background revalidation
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update in background
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
