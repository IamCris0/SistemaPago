/**
 * Service Worker para Mawewe E-commerce
 * Version: 1.3 - Completamente corregido
 * PWA Support
 */

const CACHE_NAME = 'mawewe-v1.3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/app.js'
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
      .catch(err => console.log('[SW] Install error:', err))
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

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  
  // ✅ NO cachear estas URLs
  if (url.startsWith('chrome-extension://') ||
      url.startsWith('chrome://') ||
      url.startsWith('moz-extension://') ||
      url.includes('paypal.com') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('unsplash.com') ||
      url.includes('cloudflare') ||
      url.includes('/cdn-cgi/')) {
    return;
  }
  
  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Solo cachear respuestas exitosas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // Clone response
        const responseClone = response.clone();
        
        // Update cache (sin bloquear la respuesta)
        caches.open(CACHE_NAME)
          .then(cache => {
            // Solo cachear si es una URL HTTP válida
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