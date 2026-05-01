const CACHE = 'inmo-v2'; // CAMBIADO: único para V1.01

const ARCHIVOS = [
  '/inmoseguimientoV1.01/',
  '/inmoseguimientoV1.01/index.html',
  '/inmoseguimientoV1.01/manifest.json',
  '/inmoseguimientoV1.01/icon-192.png',
  '/inmoseguimientoV1.01/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
