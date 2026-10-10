const CACHE = '__CACHE_NAME__';
const SCOPE_PREFIX = '/s/__TENANT_SLUG__/';
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([SCOPE_PREFIX]))); self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => { const request = event.request; if (request.method !== 'GET' || !new URL(request.url).pathname.startsWith(SCOPE_PREFIX)) return; event.respondWith(fetch(request).then((response) => { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(request, copy)); return response; }).catch(() => caches.match(request).then((cached) => cached ?? caches.match(SCOPE_PREFIX)))); });
