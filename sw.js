// Service worker for the hosted copy of สมุดบัญชี: the app is a single HTML file, so caching it
// (plus manifest and icons) lets the app open with no internet after the first visit.
const CACHE = 'samud-banchi-7799778356';
const SHELL = './index.html';
const ASSETS = [SHELL, './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

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
  // Opening sw.js or an icon straight in a tab is a navigation too, so the address decides what the
  // app shell is, not the request mode alone. Storing such a response under the shell entry would
  // leave the app showing that file's contents on the next launch.
  const isShell = req.mode === 'navigate' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  const key = isShell ? SHELL : req;
  const network = fetch(req).then(async (res) => {
    // second guard: whatever goes into the shell entry has to actually be the page
    const type = res && res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
    const wrongKind = isShell && type && !type.includes('text/html');
    if (res && res.ok && res.type === 'basic' && !res.redirected && !wrongKind) {
      const copy = res.clone(); const c = await caches.open(CACHE); await c.put(key, copy);
    }
    return res;
  }).catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith((async () => {
    const hit = await caches.match(key, { ignoreSearch: true });
    if (hit) return hit;
    const res = await network;
    if (res) return res;
    // only a request for the app itself falls back to the cached page
    return (isShell ? await caches.match(SHELL, { ignoreSearch: true }) : null) || Response.error();
  })());
});
