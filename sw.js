// =============================================================================
// MAWEWE SERVICE WORKER — CORREGIDO
// Solo cachea archivos estáticos conocidos.
// Todo lo demás (API, imágenes externas) pasa directo a la red.
// =============================================================================

const CACHE_NAME = 'mawewe-sw-v2';

// Archivos estáticos que vale la pena cachear
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/css/features-advanced.css',
  './assets/css/modal-styles.css',
  './assets/css/checkout-styles.css',
  './assets/css/fix-modal-images.css',
  './assets/css/fix-spacing-hero-products.css',
  './assets/js/app.js',
  './assets/js/checkout.js',
  './assets/js/features-advanced.js'
];

// ── INSTALL: cachear solo los estáticos ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets estáticos...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Si algún archivo no existe aún no romper la instalación
        console.warn('[SW] Algunos assets no disponibles para cache:', err);
      });
    })
  );
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// ── ACTIVATE: borrar caches viejos ───────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Tomar control de todas las pestañas
  event.waitUntil(clients.claim());
});

// ── FETCH: estrategia selectiva ──────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) Llamadas a la API → siempre red (nunca cache)
  if (url.pathname.startsWith('/api/')) {
    // No interceptar: dejar que el browser haga la petición normal
    return;
  }

  // 2) Recursos externos (fonts, analytics, paypal, etc.) → no interceptar
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // 3) Solo para recursos del mismo origen: Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Solo cachear respuestas exitosas de tipo basic
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cachear solo assets estáticos conocidos
        const isStatic = STATIC_ASSETS.some((asset) =>
          event.request.url.endsWith(asset.replace('./', ''))
        );

        if (isStatic) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }

        return response;
      });
    })
  );
});