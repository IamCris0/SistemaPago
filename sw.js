/**
 * Service Worker para Mawewe E-commerce
 * Version: 1.1 - Fixed
 * PWA Support
 */

const CACHE_NAME = 'mawewe-v1.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/site.webmanifest'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.log('[SW] Cache error:', err))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // ✅ FILTROS MEJORADOS - Skip chrome extensions and external requests
  const url = event.request.url;
  
  // Lista de URLs que NO deben ser cacheadas
  if (url.startsWith('chrome-extension://') ||
      url.startsWith('chrome://') ||
      url.startsWith('moz-extension://') ||
      url.includes('paypal.com') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('unsplash.com') ||
      url.includes('cloudflare') ||
      url.includes('/cdn-cgi/')) {
    return; // No hacer nada con estas peticiones
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Solo cachear respuestas exitosas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // Clone the response
        const responseClone = response.clone();
        
        // Update cache
        caches.open(CACHE_NAME)
          .then(cache => {
            // Verificar que la URL sea cacheab

le
            if (event.request.url.startsWith('http')) {
              cache.put(event.request, responseClone);
            }
          })
          .catch(err => console.log('[SW] Cache put error:', err));
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // Return offline page for navigations
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for failed purchases
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-purchases') {
    event.waitUntil(syncPurchases());
  }
});

async function syncPurchases() {
  console.log('[SW] Syncing purchases...');
  // Implement purchase sync logic here
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva oferta disponible',
    icon: '/android-chrome-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'mawewe-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'explore',
        title: 'Ver ofertas'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Mawewe', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
