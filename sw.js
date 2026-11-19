/* =========================================================================
   SERVICE WORKER: makes the app open with no network.
   On first visit it copies the app's own files (the list below) into a
   cache named after this build. After that the app is served from that
   copy. When a new build is published this file changes, the browser
   installs it in the background, and the next reload shows the new build.
   Songs are never touched: they play from the device, not from here.
   The list and version are written by  node engine/sw-build.js .
   ========================================================================= */
/* BUILD:START (written by engine/sw-build.js; do not edit by hand) */
var VERSION = '0.2.0-dev-ddb287f94f';
var FILES = [
  'css/styles.css',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-32.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'index.html',
  'js/core/analysis.js',
  'js/core/app.js',
  'js/core/audio-engine.js',
  'js/core/canvas-core.js',
  'js/core/fx.js',
  'js/core/icons.js',
  'js/core/install.js',
  'js/core/mode-registry.js',
  'js/core/settings.js',
  'js/core/state.js',
  'js/core/taps.js',
  'js/core/themes.js',
  'js/core/utils.js',
  'js/games/game-cards.js',
  'js/games/game-survivor.js',
  'js/games/game-tower-defense.js',
  'js/games/games-host.js',
  'js/games/games-shared.js',
  'js/main.js',
  'js/modes/mode-aqua.js',
  'js/modes/mode-basic.js',
  'js/modes/mode-clock.js',
  'js/modes/mode-emoji.js',
  'js/modes/mode-fire.js',
  'js/modes/mode-ice.js',
  'js/modes/mode-liquid.js',
  'js/modes/mode-nature.js',
  'js/modes/mode-piano.js',
  'js/modes/mode-rain.js',
  'js/modes/mode-strings.js',
  'js/pages/page-games.js',
  'js/pages/page-guide.js',
  'js/pages/page-music.js',
  'js/pages/page-settings.js',
  'js/pages/pages-mount.js',
  'js/player/background.js',
  'js/player/folders.js',
  'js/player/library.js',
  'js/player/playlist.js',
  'js/player/transport.js',
  'js/tools/tool-sandbox.js',
  'manifest.webmanifest'
];
/* BUILD:END */
var CACHE = 'mvo-' + VERSION;

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      // cache: 'reload' skips the browser's own cache, so a new build never stores old files
      return Promise.all(FILES.map(function(f){
        return fetch(new Request(f, { cache: 'reload' })).then(function(res){
          if (!res.ok) throw new Error(f + ': ' + res.status);
          return cache.put(f, res);
        });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k.indexOf('mvo-') === 0 && k !== CACHE ? caches.delete(k) : null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var scope = new URL('./', self.location).pathname;
  if (url.pathname.indexOf(scope) !== 0) return;
  var rel = url.pathname.slice(scope.length) || 'index.html';
  if (FILES.indexOf(rel) === -1) return;          // not one of the app's files: the network handles it
  e.respondWith(
    caches.open(CACHE).then(function(cache){
      return cache.match(rel).then(function(hit){ return hit || fetch(req); });
    })
  );
});
