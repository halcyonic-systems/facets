// Facets minimal app-shell service worker.
// Goal: "pin to home screen" works offline-ish and repeat opens are instant.
// Strategy: network-first for navigations (so shared /a/<id> links + updates stay fresh),
// stale-while-revalidate for the static font/KaTeX assets, cache-first for our own icons.

// v2: the facets.systems merge — chat moved to /chat/ under the portal. Bump this
// name on any structural change; the precached shell only refreshes when sw.js's
// bytes change, so an unbumped cache serves the old UI to offline users forever.
// v3: Frost unification — fonts self-hosted via /shared/ (no more Google Fonts),
// so the shared sheet + faces join the precached shell.
// v4: identity (facets#369) — the shell now carries the vendored auth SDK.
const CACHE = 'facets-shell-v4';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './vendor/supabase.js',
  '../shared/frost.css',
  '../shared/fonts/cormorant-garamond-latin.woff2',
  '../shared/fonts/inter-latin.woff2',
  '../shared/fonts/jetbrains-mono-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAssetHost(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net'
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App navigations: network-first, fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fonts + KaTeX: stale-while-revalidate.
  if (isAssetHost(url)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Same-origin static assets (icons, etc.): cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
