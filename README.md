# Kids Games

A gallery of small games, hosted on GitHub Pages. The home page shows one big button per game; tap it to play. Each game has a 🏠 button to come back.

## Layout

```
index.html, gallery.css, gallery.js   the home page
games.js                              the list of games shown on the home page
version.js                            bump this on every push
sw.js, manifest.webmanifest           offline support + "Add to Home Screen"
icon-192.png, icon-512.png            the home-screen icon
games/<name>/                         one folder per game, fully standalone
  index.html                          (required)
  icon.png                            the picture on its home-page button (optional)
```

## Add a game

1. Make a folder `games/<name>/` with an `index.html` (plus any css/js/images it needs). Use only relative paths inside it.
2. Add a 🏠 link so she can get back:
   ```html
   <a href="../../" style="position:fixed;top:10px;left:10px;font-size:32px;text-decoration:none;z-index:10">🏠</a>
   ```
3. Add a line to `games.js`:
   ```js
   { folder: "<name>", title: "My Game", icon: "icon.png", emoji: "🚀", color: "#ff9d00" },
   ```
   `icon` is optional; without it the button shows the `emoji`.
4. Bump the number in `version.js`, commit, push.

## Hide or remove a game

- **Hide:** put `//` in front of its line in `games.js`. The files stay, so you can bring it back.
- **Remove:** delete its line in `games.js` and its folder in `games/`.

Bump `version.js` either way.

## Try it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. (The offline service worker is off on localhost, so edits show up right away.)

## Publish

GitHub repo → Settings → Pages → Deploy from branch → `main`, folder `/ (root)`.
