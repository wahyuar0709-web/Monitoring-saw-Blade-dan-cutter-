/**
 * Service worker — Monitoring Saw Blade & Cutter
 * Cuma cache app shell (HTML/CSS/JS/ikon) supaya install & buka cepat.
 * Panggilan API ke Apps Script (script.google.com) SENGAJA tidak
 * dicache — data stok/transaksi harus selalu real-time dari sheet.
 *
 * [FIX — index.html tidak pernah update walau server sudah diganti]
 * Root cause: strategi lama cache-first UNTUK SEMUA app shell termasuk
 * index.html -- begitu index.html kepakai sekali, SW akan TERUS
 * menyajikan versi cache itu selamanya dan tidak pernah cek ke server
 * lagi, walau file di server sudah diupdate berkali-kali dan user sudah
 * hard refresh (Ctrl+Shift+R) -- hard refresh browser tidak melewati
 * service worker yang sudah aktif. Bug ini yang bikin semua perbaikan
 * app.js/index.html sebelumnya "kelihatan tidak ngefek" di device yang
 * sudah pernah buka situsnya.
 * Fix: index.html (& navigasi apapun) sekarang NETWORK-FIRST -- selalu
 * coba ambil versi terbaru dari server dulu, fallback ke cache cuma
 * kalau offline. Asset yang jarang berubah (ikon, manifest) tetap
 * cache-first seperti semula supaya tetap cepat. CACHE_NAME juga
 * dinaikkan supaya install pertama SW versi baru ini otomatis membuang
 * cache lama yang basi.
 */
const CACHE_NAME = 'saw-blade-monitor-v8.26.0';
const APP_SHELL = [
  './',
  './index.html',
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

  // [FIX] Navigasi (buka/reload halaman) & index.html: NETWORK-FIRST.
  // Ini yang bikin update kode selalu langsung kepakai begitu file di
  // server diganti, tanpa perlu user tahu cara unregister service worker
  // manual. Fallback ke cache HANYA kalau network benar2 gagal (offline),
  // supaya app tetap bisa dibuka tanpa koneksi seperti tujuan awal PWA ini.
  const isNavigation = event.request.mode === 'navigate' || url.indexOf('index.html') !== -1;
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, resClone);
          });
          return res;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Asset lain (ikon, manifest, dll) yang jarang berubah: cache-first
  // seperti semula, biar tetap cepat & hemat kuota.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
