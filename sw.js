// Service worker for the hosted copy of สมุดบัญชี: the app is a single HTML file, so caching it
// (plus manifest and icons) lets the app open with no internet after the first visit.
const CACHE = 'samud-banchi-43e4470d54';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('samud-banchi-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
// Cache first (instant, works offline), then refresh the cached copy in the background so the
// next launch picks up a newly uploaded version.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' || url.pathname.endsWith('/') ? './index.html' : req;
  const network = fetch(req).then(async (res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); const c = await caches.open(CACHE); await c.put(key, copy); }
    return res;
  }).catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith(
    caches.match(key, { ignoreSearch: true }).then((hit) => hit || network.then((res) => res || caches.match('./index.html')).then((res) => res || Response.error())),
  );
});
