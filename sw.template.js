/* Service worker template — the build (see vite.config.ts) fills in VERSION and PRECACHE. */
const VERSION = __VERSION__;
const PRECACHE = __PRECACHE__;
const CACHE = `bnaa-${VERSION}`;
const INDEX = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  // `cache: 'reload'` bypasses the HTTP cache so a new version never precaches stale files
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bnaa-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The app asks the waiting worker to take over once the user accepts the update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // The app uses hash routing, so every navigation is the same shell page.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match(INDEX).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
