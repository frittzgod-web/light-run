// Light Run service worker: offline play + versioned caching.
// Bump VERSION on every release: the new worker precaches fresh files and deletes old caches.
const VERSION = 'lr-v14.2.0';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/toon.js', 'js/chibi.js', 'js/props.js', 'js/look.js', 'js/meta.js', 'js/content.js', 'js/books.js', 'js/worlds.js', 'js/lb-config.js', 'js/models.js', 'js/progress.js', 'js/post.js', 'js/vendor/three.min.js',
  'assets/vehicles/danfo.glb', 'assets/vehicles/danfo_lod1.glb', 'assets/vehicles/okada.glb', 'assets/vehicles/okada_lod1.glb',
  'assets/vendor/three-addons/loaders/GLTFLoader.js', 'assets/vendor/three-addons/utils/BufferGeometryUtils.js', 'assets/vendor/three-addons/utils/SkeletonUtils.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
  'classic/', 'classic/index.html', 'classic/style.css', 'classic/game.js',
];
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // v14: if an older version was installed, its open pages are still running OLD cached code. Reload them into
  // this version straight away (the first open after an update used to play the previous build for a whole session).
  e.waitUntil(caches.keys().then(keys => { const old = keys.filter(k => k !== VERSION);
    return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => !old.length ? 0 :
      self.clients.matchAll({ type: 'window' }).then(cs => Promise.all(cs.map(c => c.navigate(c.url).catch(() => {}))))); }));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;           // leaderboard API etc. go straight to the network
  if (req.mode === 'navigate') {
    // pages: network first (so updates show up), cached copy when offline
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // v14: code + styles are NETWORK FIRST (an update is picked up on the very next load, never a stale build);
  // the cache is only the offline fallback. Heavy immutable assets (three.js, models, icons) stay cache first.
  const heavy = /\.(glb|png|webmanifest)$/.test(url.pathname) || url.pathname.includes('/vendor/');
  if (!heavy) {
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; });
    const slow = new Promise(res => setTimeout(res, 4000)).then(() => caches.match(req, { ignoreSearch: true })).then(r => r || net);   // very slow network: use the offline copy
    e.respondWith(Promise.race([net, slow]).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Response.error())));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })));
});
