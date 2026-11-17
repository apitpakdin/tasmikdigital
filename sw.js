/* Tasmik Digital — service worker (offline) */
var VERSI = 'td-3.7.0';
var SHELL = ['./', 'index.html', 'manifest.json', 'css/app.css?v=3.7.0', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/tasmik-core.js?v=3.7.0', 'js/store-memori.js?v=3.7.0', 'js/data.js?v=3.7.0', 'js/ui.js?v=3.7.0', 'js/demo.js?v=3.7.0',
  'js/api.js?v=3.7.0', 'js/app.js?v=3.7.0', 'js/cetak.js?v=3.7.0', 'js/shell.js?v=3.7.0', 'js/ibubapa.js?v=3.7.0', 'js/transkrip.js?v=3.7.0', 'js/laporangb.js?v=3.7.0', 'js/sasarankhatam.js?v=3.7.0', 'js/berganda.js?v=3.7.0', 'js/semakperingkat.js?v=3.7.0',
  'js/pages/utama.js?v=3.7.0', 'js/pages/rekod.js?v=3.7.0', 'js/pages/khatam.js?v=3.7.0', 'js/pages/kbs.js?v=3.7.0',
  'js/pages/amaran.js?v=3.7.0', 'js/pages/murid.js?v=3.7.0', 'js/pages/guru.js?v=3.7.0', 'js/pages/laporan.js?v=3.7.0',
  'js/pages/data.js?v=3.7.0', 'js/pages/tahun.js?v=3.7.0', 'js/pages/tetapan.js?v=3.7.0', 'js/main.js?v=3.7.0',
  'vendor/qrcode.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (x) { return x !== VERSI; }).map(function (x) { return caches.delete(x); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // API (POST) tidak dicache
  var url = new URL(req.url);
  if (url.hostname.indexOf('script.google') >= 0) return;
  var luar = url.origin !== location.origin;
  if (luar) {
    // CDN & fon: guna cache, kemas kini di belakang
    e.respondWith(caches.open(VERSI).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  // Fail aplikasi: rangkaian dahulu (supaya kemas kini GitHub cepat sampai), cache bila offline
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(VERSI).then(function (c) { c.put(req, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('index.html') }).then(function (hit) {
      return hit || caches.match('index.html');
    });
  }));
});
