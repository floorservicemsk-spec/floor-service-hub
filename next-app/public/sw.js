/**
 * Service Worker for Floor Service Hub
 * 
 * Provides:
 * - Offline caching of static assets
 * - API response caching with stale-while-revalidate
 * - Background sync for failed requests
 */

const CACHE_NAME = 'floor-service-hub-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/home',
  '/chat',
  '/faq',
  '/calculator',
];

// API routes to cache with stale-while-revalidate
const CACHEABLE_API_ROUTES = [
  '/api/faq',
  '/api/faq/categories',
  '/api/home-banners',
  '/api/advice/articles',
  '/api/advice/categories',
  '/api/video',
  '/api/video/categories',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, update in background
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) return;

  // API requests - stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
      event.respondWith(staleWhileRevalidate(request, API_CACHE));
      return;
    }
    // Don't cache other API routes (chat, auth, etc.)
    return;
  }

  // Static assets - cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - network first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }
});

// Cache strategies

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline page if available
    const offlinePage = await caches.match('/');
    if (offlinePage) return offlinePage;
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Revalidate failed:', error);
    return null;
  });

  // Return cached immediately if available
  if (cached) {
    return cached;
  }

  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  return networkResponse || new Response('Offline', { status: 503 });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
