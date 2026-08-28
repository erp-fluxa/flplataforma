const CACHE_NAME = 'fluxa-erp-v7';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Nunca cacheia chamadas ao Supabase, APIs dinâmicas, data URLs, logos ou requisições de navegação HTML
  if (url.includes('supabase.co') || url.includes('/api/') || url.includes('data:') || url.includes('logo') || url.includes('?v=') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Network First com fallback para cache em assets estáticos
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200 && !url.includes('?v=')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
