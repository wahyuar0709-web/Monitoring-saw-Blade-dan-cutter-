/**
 * Service worker — Monitoring Saw Blade & Cutter
 * Cuma cache app shell (HTML/CSS/JS/ikon) supaya install & buka cepat.
 * Panggilan API ke Apps Script (script.google.com) SENGAJA tidak
 * dicache — data stok/transaksi harus selalu real-time dari sheet.
 */
const CACHE_NAME = 'saw-blade-monitor-v8.23.5';
const APP_SHELL = [
  './',
  './index.html',
  './src/css/main.css',
  './src/js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const url = event.request.url;

  // Jangan pernah cache panggilan ke backend Apps Script — selalu network.
  if (url.indexOf('script.google.com') !== -1 || url.indexOf('googleusercontent.com') !== -1) {
    return; // biarkan lewat ke network apa adanya
  }

  // App shell: cache-first, fallback ke network.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});