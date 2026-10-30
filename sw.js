/* GE 213 service worker: the site keeps working offline after the first visit.
   Bump VERSION whenever fonts, icons or vendor files change (they are served cache-first). */
const VERSION = 'ge213-v1';
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
    'assets/fonts/ibm-plex-sans-arabic-500-arabic.woff2',
    'assets/fonts/ibm-plex-sans-arabic-500-latin.woff2',
    'assets/fonts/ibm-plex-sans-arabic-700-arabic.woff2',
    'assets/fonts/ibm-plex-sans-arabic-700-latin.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

function fetchAndCache(request) {
  return fetch(request).then(response => {
    // Only complete same-origin responses are stored (PDF range requests return 206).
    if (response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  });
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

  // Everything else (pages, data, PDFs): network first so schedule updates show
  // immediately; the cache is the offline fallback.
  event.respondWith(
    fetchAndCache(request).catch(() =>
      caches.match(request, { ignoreSearch: true }).then(hit =>
        hit || (request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
