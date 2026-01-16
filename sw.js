/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔄 Service Worker - PWA Offline Shell
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'iag-fayoum-v1';
const OFFLINE_SHELL = [
  '/',
  '/index.html',
  '/main.html',
  '/admin.html',
  '/assets/js/api.js',
  '/assets/icons/icon-192.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  // Network First for API calls
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache First for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
