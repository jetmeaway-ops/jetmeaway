// JetMeAway Service Worker — PUSH NOTIFICATIONS ONLY.
//
// ⚠ LAW — learned the hard way, twice: NEVER add a `fetch` event handler to
// this file. Not network-first, not cache-first, not "just for assets".
//
// Why (2026-08-08 cold-start investigation): when ANY fetch handler exists,
// the browser must dispatch every request through the service worker — even
// requests the handler ignores pay the SW wake-up. After the site/app sits
// idle the SW process is killed; delivering the first fetch event into a
// dead/waking SW can stall for many seconds (a documented failure class on
// low-memory Android and in WebKit, observed here as 15-20s), and the
// un-timed respondWith(fetch()) then gated the tap on that stall. Second
// tap: SW warm → instant. Server was measured healthy the whole time
// (TTFB 0.2-0.5s cold, curl 2026-08-08).
//
// PR#47 (2026-07-26) exempted `mode === 'navigate'` requests for the same
// symptom — but Next.js App Router tab clicks are NOT navigations, they are
// RSC payload fetches (/route?_rsc=…), so the main interaction path was
// still gated on the SW. Confirmed live on production: the /hotels?_rsc
// fetch and every _next/static chunk showed workerStart > 0 (via-SW).
//
// The fetch handler bought us nothing: this is a live-price travel site, so
// an offline cache of stale pages has no value, PWA installability no longer
// requires a fetch handler (Chrome dropped that requirement in 2023), and the
// iOS/Android apps are native wrappers anyway. Push notifications — the one
// thing the SW is genuinely for — do not need fetch interception.
//
// With NO fetch handler the browser skips the SW entirely for every request:
// zero SW-induced latency, on every path, forever.

self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate — delete ALL caches this SW ever created. Earlier versions cached
// every page, RSC payload and JS chunk into 'jetmeaway-v2' with no size cap
// or cleanup, so long-lived devices are carrying megabytes of stale entries.
// Nothing reads these caches any more; reclaim the space.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  // Still NOT calling self.clients.claim() — with no fetch handler there is
  // nothing to claim control FOR, and claiming mid-session has bitten us
  // before (see PR#47).
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
