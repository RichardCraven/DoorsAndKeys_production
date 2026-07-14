// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Service worker must listen to fetch events to satisfy PWA installation criteria
  event.respondWith(fetch(event.request));
});
