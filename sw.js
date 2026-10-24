const CACHE_VERSION = 'azael-v39';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_RUNTIME = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/', '/index.html', '/historias.html', '/generos.html', '/relatos.html',
  '/blog.html', '/redes.html', '/donaciones.html', '/biografia.html',
  '/perfil.html', '/styles.css', '/main.js', '/favicon.svg',
  '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()).catch((err) => console.warn('[SW] Error cacheando:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key.startsWith('azael-') && key !== CACHE_STATIC && key !== CACHE_RUNTIME).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase') || url.hostname.includes('google-analytics') || url.hostname.includes('googletagmanager') || url.hostname.includes('google.com') || url.hostname.includes('unpkg.com') || url.hostname.includes('jsdelivr.net')) return;

  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
