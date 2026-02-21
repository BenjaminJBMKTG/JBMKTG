const CACHE = 'linkdrop-v1';
const ASSETS = ['/', '/link-saver/', '/link-saver/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for assets
  if (e.request.url.includes('supabase.co') || e.request.url.includes('allorigins')) {
    return; // let network handle API calls
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
