// Service worker: network-first.
// Online  -> always loads the newest files (skips the browser HTTP cache).
// Offline -> uses the last copy that was saved.
// Every game lives under this folder, so this one worker covers them all.
// Files are saved the first time they load, so a game works offline after it has been played once.
importScripts("version.js"); // defines APP_VERSION. A new version number also makes this file "new".
importScripts("games.js");   // defines GAMES

var CACHE = "games-v" + APP_VERSION;
var FILES = [
  "./", "index.html", "gallery.css", "gallery.js", "games.js", "version.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png"
];
GAMES.forEach(function (g) {
  FILES.push("games/" + g.folder + "/");
  if (g.icon) { FILES.push("games/" + g.folder + "/" + g.icon); }
});

self.addEventListener("install", function (event) {
  self.skipWaiting(); // do not wait for old tabs to close
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(FILES.map(function (f) {
        return fetch(f, { cache: "reload" }).then(function (res) {
          if (res.ok) { return cache.put(f, res); }
        }).catch(function () {}); // one missing file should not stop the rest
      }));
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                             .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }) // take over open pages now
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) { return; }

  event.respondWith(
    fetch(req, { cache: "no-cache" }).then(function (res) {
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
    })
  );
});
