// Builds the home page buttons from the GAMES list in games.js.
(function () {
  "use strict";

  var grid = document.getElementById("games");

  (window.GAMES || []).forEach(function (game) {
    var link = document.createElement("a");
    link.className = "game";
    link.href = "games/" + game.folder + "/";
    link.style.setProperty("--tile", game.color || "#ff9d00");

    var art = document.createElement("span");
    art.className = "art";
    if (game.icon) {
      var img = document.createElement("img");
      img.src = "games/" + game.folder + "/" + game.icon;
      img.alt = "";
      img.onerror = function () { art.textContent = game.emoji || "🎮"; }; // missing picture -> emoji
      art.appendChild(img);
    } else {
      art.textContent = game.emoji || "🎮";
    }

    var name = document.createElement("span");
    name.className = "name";
    name.textContent = game.title;

    link.appendChild(art);
    link.appendChild(name);
    grid.appendChild(link);
  });

  document.getElementById("version").textContent = "v" + (window.APP_VERSION || "?");

  // ---------- offline support (service worker) ----------
  // Only on the real website (https). Not on localhost, so your edits always show up.
  // It covers every game, because they all live under this folder.
  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]";
  if ("serviceWorker" in navigator && location.protocol === "https:" && !isLocal) {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(function () {});
  }
})();
