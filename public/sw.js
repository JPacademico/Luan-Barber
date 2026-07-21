/*
 * Luan Studio Barber — service worker (hand-written, no build plugin).
 *
 * Strategy:
 *   - Navigations (HTML): network-first, falling back to the cached app shell so the installed
 *     app opens offline and always picks up a fresh index.html (and its new hashed asset refs)
 *     when online.
 *   - Hashed build assets under /assets/: cache-first — the filename changes on every deploy, so
 *     a cached file is never stale.
 *   - Other same-origin GETs (icons, manifest): stale-while-revalidate.
 *   - Everything cross-origin (Supabase API, Google Fonts) is left untouched by the SW.
 *
 * Bump CACHE_VERSION to force old caches out on the next deploy.
 */

const CACHE_VERSION = 'luan-studio-v5';
const APP_SHELL = [
  '/manifest.webmanifest',
  '/manifest-admin.webmanifest',
  '/logo.svg',
  '/logo-maskable.svg',
  '/app-icon-admin.svg',
  '/favicon-admin.svg',
  '/apple-touch-icon.png',
  '/apple-touch-icon-admin.png',
  // Precached so a notification arriving offline still has its artwork.
  '/notification-icon.png',
  '/notification-badge.png',
];

/**
 * The two HTML documents, as [url to fetch, cache key]. The public site and the admin panel are
 * separate documents (see admin.html) because iOS only honours the manifest of the document it
 * loaded. Caching them under distinct keys matters: serving index.html at /admin offline would
 * hand the admin PWA the PUBLIC manifest and undo the separation.
 */
const SHELLS = [
  ['/', '/index.html'],
  ['/admin', '/admin.html'],
];

/** Which cached document should answer a navigation to `pathname`. */
const shellKeyFor = (pathname) => (pathname.startsWith('/admin') ? '/admin.html' : '/index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // Best-effort: a single 404 must not abort the whole install.
        Promise.allSettled([
          ...APP_SHELL.map((url) => cache.add(url)),
          // Fetched by URL but stored under the document key the navigation handler looks up.
          ...SHELLS.map(([url, key]) =>
            fetch(url).then((response) => (response.ok ? cache.put(key, response) : undefined))
          ),
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Lets the page tell a waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Show a notification when a push arrives (fired even when the app is closed).
self.addEventListener('push', (event) => {
  let data = { title: 'Luan Studio Barber', body: 'Novo agendamento', url: '/admin' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Not JSON, or no payload: keep the defaults.
  }

  event.waitUntil(
    // PNG, not SVG: Android/Chrome silently refuse to rasterise an SVG notification icon and
    // fall back to a blank square, which is what these two files exist to fix.
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data: { url: data.url },
      tag: 'novo-agendamento',
    })
  );
});

// Focus (or open) the admin panel when the notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/admin'));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs; the API and fonts must reach the network directly.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(request)) {
    const shellKey = shellKeyFor(url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(shellKey, copy));
          return response;
        })
        // Fall back to this route's own document, never the other one's.
        .catch(() => caches.match(shellKey).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Hashed, immutable build output: serve from cache once seen.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
