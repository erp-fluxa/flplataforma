const CACHE_NAME = 'fluxa-erp-v11';

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

  // Apenas processa esquemas HTTP e HTTPS (ignora chrome-extension, moz-extension, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // APIs, Supabase, rotas dinâmicas e WebSocket: bypass direto para rede sem interceptação
  if (
    url.includes('supabase.co') ||
    url.includes('/api/') ||
    url.includes('data:') ||
    url.includes('blob:')
  ) {
    return;
  }

  // Navegação SPA: Network-first com fallback seguro para a rede ou cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(async () => {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        return fetch(e.request);
      })
    );
    return;
  }

  // Assets Estáticos: Network-First com cache seguro
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return new Response('', { status: 408, statusText: 'Request Timeout / Offline' });
      })
  );
});
