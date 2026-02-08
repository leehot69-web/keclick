// Service worker para funcionamiento offline
const CACHE_NAME = 'sistema-pedidos-v4';

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// INSTALACIÓN: Cachear recursos críticos
self.addEventListener('install', event => {
  // Obligar al SW a activarse inmediatamente (sin esperar a que se cierren pestañas)
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// ACTIVACIÓN: Limpiar caches viejas y tomar control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando cache vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Reclamar clientes inmediatamente para controlarlos sin recargar
  return self.clients.claim();
});

// INTERCEPTOR DE RED (FETCH)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // ESTRATEGIA 1: NETWORK FIRST (Para HTML / Navegación)
  // Siempre intentar ir a la red primero para obtener la última versión de la App.
  // Si falla (offline), usar cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ESTRATEGIA 2: STALE-WHILE-REVALIDATE (Para otros recursos)
  // Devuelve el cache rápido, pero actualiza en el fondo si hay internet.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Guardar copia fresca en cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(err => {
          // Ignorar errores de red en background fetch
          // console.warn('Fetch background failed', err);
        });

        // Devolver cache si existe, sino esperar a la red
        return cachedResponse || fetchPromise;
      })
  );
});
