const CACHE_NAME = 'bebe-app-cache-v1';


// Recursos estáticos y librerías externas para cachear offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
  'https://unpkg.com/lucide@latest'
];


// Instalación del Service Worker y guardado inicial en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando archivos estáticos...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});


// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});


// Estrategia de respuesta: Cache First con fallback a Red
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;


  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar de la caché si está disponible
        return cachedResponse;
      }


      // Si no está en caché, realizar la petición de red
      return fetch(event.request).then((networkResponse) => {
        // Verificar validez de la respuesta
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }


        // Clonar y guardar en caché para futuros accesos offline
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });


        return networkResponse;
      }).catch(() => {
        // Fallback en caso de estar totalmente offline y sin recurso en caché
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});