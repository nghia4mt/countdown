---
name: Countdown Verify
description: Verify the countdown project before reporting work done — lint, node tests, Vite build, and Chrome screenshots at 360/390/1440 with WebGL, overflow, and console assertions
---

# Countdown Verify

Run this before saying a change is done. Working directory: `D:\workSpace\countdown`.

## 1. Static checks

```powershell
npm run lint
npm test
npm run build
```

`npm test` is `node --test --test-isolation=none src`. If Vite fails with
`spawn EPERM` (DSH sandbox on Windows), rerun:

```powershell
$env:NODE_OPTIONS='--import ./scripts/vite-sandbox-shim.mjs'
npm run build
```

All three must pass with zero warnings. Never claim success without the real
output.

## 2. Screenshots

Start the dev server (`npm run dev`, expected at
`http://localhost:5173/countdown/`) and keep it running while shooting.

```powershell
node scripts/shot.mjs --width 360 --height 800  --out .shots/mobile-360.png --mobile
node scripts/shot.mjs --width 390 --height 844  --out .shots/mobile-390.png --mobile
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/desktop.png
```

Extra states when relevant:

```powershell
# celebration / expired state with reduced motion
node scripts/shot.mjs --width 390 --height 844 --out .shots/expired-reduced.png --mobile --expired --reduced
# flip reduced-motion live (WebGL must rebuild as a static frame)
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/toggle-reduced.png --toggle-reduced
```

Chrome must run outside the sandbox; `scripts/shot.mjs` auto-detects the Scoop
shim at `C:/Users/minhn/scoop/shims/chrome.exe` or honors `CHROME_PATH`.

## 3. Pass criteria

The JSON printed by `shot.mjs` must show:

- `pageErrors: []`
- `horizontalOverflow: false`, `overflowers: []`
- `nebula: {"canvas": true, "webgl": true, "fallback": false}` when the WebGL
  layer is in scope (with `--toggle-reduced`, `fallback` must stay `false`)
- a non-empty screenshot file that looks correct when opened

## 4. Failure playbook

- Black page / `isPaused is not defined` after many edits: stop the dev server,
  delete `node_modules/.vite` and `.vite`, then `npm run dev -- --force`.
- `fallback: true` means WebGL crashed: inspect the console errors in the JSON
  and the `NebulaScene.jsx` init/cleanup path.
- Chrome not found: set `CHROME_PATH` to the executable and rerun.
