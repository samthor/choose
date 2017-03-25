
// nb. SW needs a delta change on every site update.

const disabled = false;

const VERSION = 'choose-v1';
const CACHE_NAME = 'cache';
const PRECACHE = [
  '/', '/styles.css', '/elements.js', '/ic_fullscreen_white_24px.svg', '/manifest.json',
  'https://cdn.rawgit.com/GoogleChrome/pwacompat/v1.0.3/pwacompat.min.js',
];

self.addEventListener('activate', ev => {
  // Claim all clients immediately.
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('install', ev => {
  const precache = caches.open(CACHE_NAME).then(cache => {
    const requests = PRECACHE.map(url => {
      // TODO: do we need cors to cache rawgit correctly?
      return fetch(url, {mode: 'cors'}).then(response => {
        if (response.status === 200) {
          cache.put(new Request(url), response);
        } else {
          return Promise.reject('couldn\'t cache: ' + url);
        }
      });
    });
    return Promise.all(requests);
  });
  ev.waitUntil(precache.then(self.skipWaiting()));
});

self.addEventListener('fetch', ev => {
  if (disabled || ev.request.method !== 'GET') {
    return;
  }
  const url = new URL(ev.request.url);
  ev.respondWith(caches.open(CACHE_NAME)
      .then(cache => cache.match(url))
      .then(response => {
        return response || fetch(ev.request);
      }));
});

self.addEventListener('message', ev => {
  if (ev.data === 'version') {
    ev.ports[0].postMessage(VERSION);
  }
});
