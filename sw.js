/* GE 213 service worker: the site keeps working offline after the first visit.
   Bump VERSION whenever fonts, icons or vendor files change (they are served cache-first),
   and keep CORE in step with the files on disk: `node tools/check-sw.mjs` checks both. */
const VERSION = 'ge213-v2';
const FILES_CACHE = 'ge213-files'; // PDFs the student saved with "حفظ للاستخدام دون اتصال"
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css', 'assets/css/pages.css',
  'assets/vendor/react.production.min.js', 'assets/vendor/react-dom.production.min.js',
  'assets/js/app.js',
  'assets/js/lib/react.js', 'assets/js/lib/storage.js', 'assets/js/lib/ar.js', 'assets/js/lib/dates.js', 'assets/js/lib/grading.js',
  'assets/js/components/icons.js', 'assets/js/components/ui.js',
  'assets/js/pages/calendar.js', 'assets/js/pages/files.js', 'assets/js/pages/calculator.js', 'assets/js/pages/guide.js',
  'assets/data/term-481.js', 'assets/data/files.js',
  'assets/icons/favicon.svg', 'assets/icons/icon-64.png', 'assets/icons/icon-192.png',
  'assets/fonts/alexandria-arabic.woff2',
  'assets/fonts/alexandria-latin.woff2',
  'assets/fonts/ibm-plex-sans-arabic-400-arabic.woff2',
  'assets/fonts/ibm-plex-sans-arabic-400-latin.woff2',
  'assets/fonts/ibm-plex-sans-arabic-700-arabic.woff2',
  'assets/fonts/ibm-plex-sans-arabic-700-latin.woff2',
];

self.addEventListener('install', event => {
  // One missing file must not abort the whole install: cache what we can, fetch the rest later.
  event.waitUntil(caches.open(VERSION)
    .then(cache => Promise.allSettled(CORE.map(url => cache.add(new Request(url, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FILES_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

const storable = response => response && response.status === 200 && response.type === 'basic';

function fetchAndCache(request) {
  return fetch(request).then(response => {
    // Only complete same-origin responses are stored (PDF range requests return 206).
    if (storable(response)) {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  });
}

/** Tells open pages that newer code or data is ready (they offer a one-tap reload). */
let notifiedAt = 0;
function announceUpdate() {
  if (Date.now() - notifiedAt < 10000) return; // one notice per burst of changed files
  notifiedAt = Date.now();
  self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.postMessage({ type: 'ge213:update' })));
}

/**
 * Stale-while-revalidate: answer from the cache at once, refresh it from the network
 * in the background, and announce an update when the new file differs from the old one.
 */
function staleWhileRevalidate(event) {
  const { request } = event;
  return caches.open(VERSION).then(cache => cache.match(request).then(hit => {
    const old = hit && hit.clone(); // the page consumes `hit`, so keep a copy to compare against
    // no-cache: revalidate with the server instead of taking the browser's HTTP-cached copy.
    const refresh = fetch(request, { cache: 'no-cache' }).then(async response => {
      if (!storable(response)) return response;
      if (old) {
        const [a, b] = await Promise.all([old.text(), response.clone().text()]);
        if (a !== b) announceUpdate();
      }
      await cache.put(request, response.clone());
      return response;
    });
    if (hit) {
      event.waitUntil(refresh.catch(() => {}));
      return hit;
    }
    return refresh;
  }));
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Fonts, icons and the React runtime rarely change: cache first.
  if (/\/assets\/(fonts|icons|vendor)\//.test(url.pathname)) {
    event.respondWith(caches.match(request).then(hit => hit || fetchAndCache(request)));
    return;
  }

  // Code, styles and the schedule: instant from the cache, refreshed in the background.
  if (/\/assets\/(js|css|data)\//.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event).catch(() => caches.match(request, { ignoreSearch: true })));
    return;
  }

  // Pages and PDFs: network first so the newest copy wins; the cache is the offline fallback.
  event.respondWith(
    fetchAndCache(request).catch(() =>
      caches.match(request, { ignoreSearch: true }).then(hit =>
        hit || (request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
