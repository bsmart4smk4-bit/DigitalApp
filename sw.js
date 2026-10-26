const CACHE_NAME = 'b-smart-4-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Proses Install: Simpan file wadah ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cache dibuka:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Proses Activate: Hapus cache versi lama jika ada update
self.addEventListener('activate', event => {
  const whitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(n => {
          if (whitelist.indexOf(n) === -1) {
            console.log('[SW] Hapus cache lama:', n);
            return caches.delete(n);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Proses Fetch: Ambil dari cache untuk file lokal, tapi biarkan GAS selalu fresh
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ⚠️ SANGAT PENTING: Jangan pernah cache request ke Google Apps Script
  // Agar data tabungan, saldo, dan transaksi selalu yang paling baru.
  if (url.indexOf('script.google.com') >= 0 ||
      url.indexOf('googleusercontent.com') >= 0) {
    return;
  }

  // Hanya proses request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Jika ada di cache, tampilkan dulu (biar cepat), lalu update di belakang layar
        fetch(event.request)
          .then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(c => c.put(event.request, res));
            }
          })
          .catch(() => {});
        return cached;
      }
      // Jika tidak ada di cache, ambil dari internet
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
