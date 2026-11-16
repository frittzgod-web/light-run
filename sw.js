// Light Run service worker: offline play + versioned caching.
// Bump VERSION on every release: the new worker precaches fresh files and deletes old caches.
const VERSION = 'lr-v13.1.0';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/toon.js', 'js/chibi.js', 'js/props.js', 'js/look.js', 'js/meta.js', 'js/content.js', 'js/books.js', 'js/worlds.js', 'js/lb-config.js', 'js/models.js', 'js/progress.js', 'js/post.js', 'js/vendor/three.min.js',
  'assets/vehicles/danfo.glb', 'assets/vehicles/danfo_lod1.glb', 'assets/vehicles/okada.glb', 'assets/vehicles/okada_lod1.glb',
  'assets/vendor/three-addons/loaders/GLTFLoader.js', 'assets/vendor/three-addons/utils/BufferGeometryUtils.js', 'assets/vendor/three-addons/utils/SkeletonUtils.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
  'classic/', 'classic/index.html', 'classic/style.css', 'classic/game.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;           // leaderboard API etc. go straight to the network
  if (req.mode === 'navigate') {
    // pages: network first (so updates show up), cached copy when offline
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // assets: cache first (versioned), then network, caching what we fetch
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })));
});
