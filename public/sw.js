const CACHE_VERSION = '2026-06-05-bugfix-v3';
const CACHE_NAME = 'mugtuon-v' + CACHE_VERSION;
const STATIC_ASSETS = [
  '/',
  '/css/design-system.css',
  '/css/layouts.css',
  '/css/pages.css',
  '/js/bundle.js',
  '/images/logo-icon.png',
  '/images/logo-horizontal.png',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.pathname.indexOf('/api/') !== -1) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      if (response.ok && e.request.method === 'GET') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/');
      });
    })
  );
});
