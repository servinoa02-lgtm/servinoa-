// Service worker minimal para habilitar la instalación de PWA.
// No almacena datos offline por el momento, pero aprueba los requisitos de Chromium.

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
});

self.addEventListener('fetch', (event) => {
  // Passthrough a la red
  event.respondWith(fetch(event.request));
});
