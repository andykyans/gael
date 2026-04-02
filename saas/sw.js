const CACHE_NAME = 'gaele-pro-v1.5.6';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './index.html',
        './manifest.json',
        './assets/style.css',
        './assets/app.js',
        './assets/map.js',
        './assets/icon.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Retourne le cache s'il existe, sinon fetch le réseau
      return response || fetch(e.request);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});
