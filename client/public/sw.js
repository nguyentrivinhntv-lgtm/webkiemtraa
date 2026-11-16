const CACHE_NAME = 'quizmaster-pwa-v1';
const DATA_CACHE_NAME = 'quizmaster-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// 1. Install event: pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Failed to cache some static assets during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: Network-first for APIs with fallback, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests or browser extension requests
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Handle Quiz API requests (/api/quiz) for Offline study & Flashcard review
  if (url.pathname.startsWith('/api/quiz')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // If valid response, clone and cache in DATA_CACHE_NAME
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(req, copy);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed (offline): try to serve from data cache
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({
                error: 'Bạn đang ngoại tuyến (Offline). Chỉ các bài thi đã mở trước đó mới khả dụng.',
                offline: true
              }),
              { headers: { 'Content-Type': 'application/json' }, status: 503 }
            );
          });
        })
    );
    return;
  }

  // B. Handle SPA Navigation requests (HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // C. Handle static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.woff2') ||
            url.origin === self.location.origin)
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return networkResponse;
      });
    })
  );
});

