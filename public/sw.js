// JetMeAway Service Worker — PWA + Push Notifications

const CACHE_NAME = 'jetmeaway-v2';
const OFFLINE_URL = '/';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/jetmeaway-logo.png',
];

// Install — pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// NOTE: we intentionally do NOT call self.clients.claim() on activate. Claiming
// makes this SW seize control of the very first page load mid-session, which
// disrupted first-visit navigations (dead taps for 15-20s). Without claim the
// SW only controls from the next navigation onward, by which point it is warm.

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Deliberately NOT calling self.clients.claim() — see install note above.
});

// Fetch — static assets only, network-first with cache fallback.
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API/analytics requests
  if (event.request.method !== 'GET') return;

  // NEVER intercept page navigations. A SW-proxied navigation runs
  // serially through SW cold-boot → fetch → network (navigation preload is
  // off), which gated every tap on the SW and made first-visit navigations
  // feel dead for 15-20s on mobile. Let the browser handle navigations
  // directly — this is the fast path and cannot be slower than the network.
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/asset responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  let data = { title: 'JetMeAway', body: 'You have a new deal!', url: '/' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: { url: data.url },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'View Deal' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// Notification clicked — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});
