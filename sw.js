// Mini Weather Service Worker
// Offline support, caching strategy, background sync

const CACHE_NAME = 'mini-weather-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/manifest.json',
    '/sw.js'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', event => {
    const { request } = event;
    const { method, url } = request;

    // Skip non-GET requests
    if (method !== 'GET') {
        return;
    }

    // Handle API requests - network first
    if (url.includes('api.open-meteo.com') || url.includes('nominatim.openstreetmap.org')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fall back to cache
                    return caches.match(request).then(response => {
                        return response || new Response('Network error. Please try again.', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                })
        );
        return;
    }

    // Handle app assets - cache first, network fallback
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request).then(response => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Return offline page for HTML requests
                if (request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            })
    );
});

// Handle messages from clients
self.addEventListener('message', event => {
    const { type } = event.data;

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }

    if (type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data;
        self.registration.showNotification(title, {
            ...options,
            badge: '/favicon.ico',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231e88e5" width="192" height="192" rx="45"/><circle cx="96" cy="96" r="50" fill="%23FFB300"/></svg>'
        });
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Background sync (for future use)
self.addEventListener('sync', event => {
    if (event.tag === 'update-weather') {
        event.waitUntil(
            fetch('https://api.open-meteo.com/v1/forecast')
                .then(response => response.json())
                .then(data => {
                    // Handle synced data
                    console.log('Background sync: Weather updated', data);
                })
                .catch(error => {
                    console.error('Background sync failed:', error);
                })
        );
    }
});

console.log('✓ Service Worker loaded');
