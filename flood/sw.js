const CACHE_NAME = 'cwc-wet-v71';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './map-dev.html',
  './map-experiment.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url || '';
  const isExternalApi = !url.startsWith(self.location.origin) ||
    url.includes('api.tidesandcurrents.noaa.gov') ||
    url.includes('api.weather.gov') ||
    url.includes('waterservices.usgs.gov') ||
    url.includes('api.open-meteo.com') ||
    url.includes('epqs.nationalmap.gov') ||
    url.includes('nominatim.openstreetmap.org');

  // Always Network-First (never stale cache) for external telemetry/alerts and HTML pages
  if (event.request.mode === 'navigate' || url.includes('.html') || isExternalApi) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.startsWith(self.location.origin)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Local static assets (icons, manifest) cache first
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
  }
});
