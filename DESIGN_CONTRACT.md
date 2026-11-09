# DESIGN CONTRACT — "Aurora Countdown" (06·12·2026)

Single source of truth for the interface. Read fully before changing styles or components.

## 1. Product goal

A single-screen, cinematic countdown to **06.12.2026**. It should feel like a premium product
launch page: deep-space aurora background, glassmorphic odometer digits, one-shot entrance
motion, a living progress rail. It must work offline after build (no external network assets),
be keyboard accessible, and respect `prefers-reduced-motion`.

## 2. Visual language

- Mood: deep space / aurora. Dark navy base, violet→cyan→pink→amber spectrum.
- A real 3D layer (three.js WebGL) sits under the content: parallax star depth, two dust
  orbits and coloured nebulae. It must stay atmosphere — never out-shout the digits.
- Glass + glow + grain. Soft 1px light borders, big radii, layered depth (no heavy shadows).
- Generous whitespace. One focal point: the three huge digits.
- Display face: `var(--font-display)` (Space Grotesk Variable). Body: `var(--font-body)` (Inter Variable).
- Digits: `font-variant-numeric: tabular-nums`, tight tracking, gradient fill + coloured glow.

### Tokens (defined in `src/index.css` — always use them, never hard-code colours)

```
--bg-0 #05060f   --bg-1 #0a0b1e   --bg-2 #12132b
--ink #f2f4ff    --ink-dim #a7aecb   --ink-faint #7d85a8   --ink-inverse #0a0618
--white #ffffff
--violet #8b5cf6 --violet-soft #b39bff
--cyan #22d3ee   --cyan-soft #7ff0ff
--pink #f472b6   --pink-soft #ffa6d1
--amber #fbbf24  --amber-soft #ffd980
--success #4ade80
--unit-days / --unit-hours / --unit-minutes
--glass --glass-hi --stroke --stroke-hi --shadow
--r-xl 28px --r-lg 22px --r-md 16px --r-pill 999px
--font-display --font-body
--ease-out cubic-bezier(.16,1,.3,1)  --ease-spring cubic-bezier(.34,1.56,.64,1)
--dur-fast 180ms --dur 320ms --dur-slow 720ms
--z-bg 0 --z-stars 1 --z-content 10 --z-overlay 100
```

`--ink-faint` is #7d85a8 (not #6a7296) so small uppercase meta text clears WCAG AA
4.5:1 on all three dark backgrounds; do not darken it back.

## 3. Functional areas

| Area | Files |
|---|---|
| **App shell** | `index.html`, `src/main.jsx`, `src/index.css`, `src/App.jsx`, `src/App.css`, `src/lib/countdown.js`, `vite.config.js`, `README.md`, `DESIGN_CONTRACT.md` |
| **Countdown UI** | `src/hooks/useCountdown.js`, `src/components/CountdownGrid.jsx`, `src/components/CountdownGrid.css`, `src/components/CountdownCard.jsx`, `src/components/CountdownCard.css`, `src/components/Odometer.jsx`, `src/components/Odometer.css`, `src/lib/use-reduced-motion.js` |
| **Background & atmosphere** | `src/components/BackgroundFX.jsx`, `src/components/BackgroundFX.css`, `src/components/NebulaScene.jsx`, `src/components/NebulaScene.css`, `src/components/StarField.jsx`, `src/components/ProgressRail.jsx`, `src/components/ProgressRail.css`, `src/components/Celebration.jsx`, `src/components/Celebration.css` |
| **Safety & tooling** | `src/components/ErrorBoundary.jsx`, `scripts/shot.mjs`, `src/lib/countdown.test.js`, `src/lib/motion-guard.test.js` |

Import CSS from its component (`import './CountdownCard.css'`). Named exports only.

## 4. Interfaces (JS + JSDoc, no TypeScript)

### `src/lib/countdown.js`

```js
export const TARGET_ISO, CAMPAIGN_START_ISO, TARGET_MS, CAMPAIGN_START_MS
export const TARGET_LABEL            // "06 · 12 · 2026"
export const BIRTH_ISO, BIRTH_LABEL, TARGET_SLASH_LABEL, BIRTHDAY_AGE
export const DAY_MS, HOUR_MS, MINUTE_MS
/** @returns {{ totalMs:number, days:number, hours:number, minutes:number, expired:boolean }} */
export function computeRemaining(targetMs, nowMs)
export function pad2(n)              // 7 -> "07"
export function progressRatio(startMs, targetMs, nowMs) // clamped 0..1
export function formatRemaining(r)   // "12 ngày 04 giờ 05 phút"
export function formatDayMonthYear(ms) // "06 · 12 · 2026" (Asia/Bangkok)
```

### `useCountdown`

```js
/**
 * @param {number} targetMs
 * @returns {{
 *   remaining: { days:number, hours:number, minutes:number },
 *   progress: number,          // 0..1 elapsed of the campaign
 *   isExpired: boolean,
 * }}
 */
export function useCountdown(targetMs)
```

Rules: tick immediately on mount (no zeros), re-arm to the next wall-clock **minute**
boundary (a per-minute tick is enough for the three-unit UI and cuts React renders ~60×);
clear timers on cleanup; switch to expired at zero.

### `CountdownGrid`

```jsx
<CountdownGrid remaining={{days,hours,minutes}} isExpired />
```

Renders exactly 3 `CountdownCard`s, units in order days/hours/minutes,
labels `Ngày`, `Giờ`, `Phút`, accents `var(--unit-days|hours|minutes)`.

### `CountdownCard`

```jsx
<CountdownCard unit="days" label="Ngày" value={288} accent="var(--unit-days)" index={0} isExpired={false} />
```

- Root element class `cc` (add `cc--expired` state class).
- Digits use the in-house `<Odometer value={value} digits={2} />`: per-digit `0–9`
  columns translated with `transform`, 1 → `01`, `aria-hidden`. No animation library.
- `role="group"` + `aria-label` like `"288 ngày"`. Decorative bits `aria-hidden="true"`.
- Interaction is static: the card has a fixed aura and a one-shot entrance animation only.
  Pointer movement does not change its transform, brightness or surface.
- Reserved space so the card never reflows when digits change.

### `Odometer`

```jsx
<Odometer value={percent} digits={2} />
```

- `digits` is the minimum column count; a wider value keeps its real width (`100` stays
  `"100"`, never clipped to two digits).
- Each column is a vertical stack of `0–9`, moved with `transform: translateY()`.
- Purely presentational: `aria-hidden="true"`; the parent supplies readable text.

### `ProgressRail`

```jsx
<ProgressRail progress={0.856} isExpired={false} />
```

- `role="progressbar"` with `aria-valuemin/max/now/valuetext` ("đã trôi qua 86%").
- Fill animated with `transform: scaleX()` (never `width`), soft highlight on the fill edge,
  glowing head dot.
- Meta row: left "ĐÃ TRÔI QUA", right the live percentage via `<Odometer>`; under the track
  the two dates from `formatDayMonthYear`: `25 · 10 · 2026` (start) and `06 · 12 · 2026` (end).

### `NebulaScene`

```jsx
<NebulaScene celebrating={false} expired={false} tick={remaining.minutes} />
```

- Dynamically imports `three` inside the mount effect, so the 3D chunk never blocks first
  paint; on any failure (no WebGL, chunk error) it renders the 2D `<StarField />` instead.
- Scene: three parallax star layers (depth 16→215 world units), 18 four-ray flare stars,
  two inclined dust orbits (gradient hairline + dust points), three coloured nebula sprites
  and a core glow. Every colour is read from the CSS tokens at mount time.
- Motion: pointer parallax on the camera (damped), per-layer slow sway, orbit precession,
  and a soft `pulse()` on each countdown **minute** tick. No motion under reduced motion
  (one static frame), RAF fully stopped while `document.hidden`, render loop held to
  **30 fps** (`FRAME_INTERVAL`), DPR capped at **1.25** (1.0 under
  `(max-width: 720px), (pointer: coarse)`). Point counts scale with a mount-time `quality`
  (0.85 desktop, 0.55 narrow/coarse) with floors.
- `celebrating` raises energy; `expired` shifts the palette cool → amber (`--amber-soft`).
- Cleanup disposes every geometry/material/texture/renderer and removes all listeners.
- Class prefix `.nb` / `.nb__*`; decorative only (`aria-hidden`, `pointer-events: none`).

### `BackgroundFX`

```jsx
<BackgroundFX celebrating={false} expired={false} tick={0} />
```

Fixed, `aria-hidden="true"`, `pointer-events: none`, decorative. Layers (z-index via tokens):
aurora blobs (`radial-gradient` glows with `mix-blend-mode: screen`, slow drift 18–30s).
Blobs must **not** use `filter: blur()`: a blurred element that animates forces the browser
to re-raster the whole blurred area every frame.

`<NebulaScene />` (three.js WebGL; degrades to the 2D `<StarField />` canvas — ~110
twinkling stars, DPR-aware, parallax ≤8px, RAF paused when `document.hidden`),
fine grid with radial mask, SVG-noise grain (base64 data URI, `opacity ≈ .035`), vignette.

Mobile: fewer blobs, and cards drop `backdrop-filter` under
`(max-width: 720px), (pointer: coarse)` — a blur pass over an animating canvas is the most
expensive thing on this page.

### `Celebration`

```jsx
<Celebration open={bool} onDismiss={() => {}} />
```

- Mount/unmount animation is CSS only: `present` keeps the node alive while `cel--closing`
  plays the exit, unmounted on `animationend` (with a timeout fallback). `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`; Escape closes, focus moves to the dismiss button
  on open and returns to the opener on close. Body scroll is locked and the stage is `inert`.
- Fires the in-house `burstConfetti()` **once per open** (2 side bursts + centre burst,
  no-op under reduced motion). No confetti before `open`. Each burst stops itself after
  2.5s and cleans up its canvas.
- Content: emoji, "Đã đến ngày!", "Chúc mừng — khoảnh khắc đã tới.", primary button "Tuyệt vời".

## 5. Class-name registry (avoid collisions)

| Prefix | Area |
|---|---|
| `.app .stage .hero .hero__* .actions .btn .btn--* .footnote .status-dot` | App shell |
| `.cg .cg__* .cc .cc__* .odo .odo__*` | Countdown UI |
| `.bgfx .bgfx__* .pr .pr__* .cel .cel__* .nb .nb__*` | Background & atmosphere |

BEM-ish, one block per component file. No global element selectors.

## 6. Motion rules

- Transform / opacity / filter only. Never animate layout properties (`width`, `height`, `top`).
- Entrance stagger: hero children fade up (0.8s, 0/70/140/210ms), cards `translate 28px → 0`,
  `opacity 0 → 1`, delay `i * 80ms`, duration `800ms`, ease `--ease-out`,
  rail last (`y 18px → 0`, 0.8s, delay 500ms). Hero first, rail last. One-shot only.
- Cards are static after entrance. The only ongoing card motion is the odometer roll when
  a value changes.
- Buttons: brightness may change on pointer over; press `scale .98`; focus 2px accent
  outline offset 2px.
- `prefers-reduced-motion: reduce` → no transforms, no confetti, no drift; opacity only.
  Use `useReducedMotion()` from `src/lib/use-reduced-motion.js` (reactive to OS changes)
  **and** a CSS media query. `src/lib/motion-guard.test.js` fails if an animated CSS file
  lacks a reduced-motion block.
- No animation loop that keeps the CPU busy when the tab is hidden.
- WebGL layer: animate uniforms/objects inside the single RAF loop only; never start a
  second loop. Under reduced motion render exactly one frame. Cap DPR at 1.25 (1.0 on
  narrow/coarse pointers), hold the loop to 30 fps, and pause on `visibilitychange`.
  No shader-based full-screen effects (mobile GPU budget).
- The hero gradient is static on purpose: animating `background-position` repaints the
  heading every frame, outside the compositor-only rule. A one-shot `::after` highlight
  that only animates `transform` is the allowed way to add motion here.

## 7. Accessibility (non-negotiable)

- The countdown summary is `<p class="hero__live" role="status" aria-live="off">` with the full
  Vietnamese sentence — live announcements on every tick are forbidden.
- Real `<button>` elements; visible focus ring; colour never the only signal (add text/icon).
- Decorative layers `aria-hidden="true"`; canvas `aria-hidden="true"`.
- Contrast: body text ≥ 7:1 on the dark base; dim text only for meta labels.
- Touch targets ≥ 44px. No horizontal scroll at 360px width.
- Dialog: `aria-modal`, Escape to close, focus trap/restore, body scroll lock, `inert` stage.

## 8. Hard constraints

- Runtime dependencies in `package.json`: `@fontsource-variable/inter`,
  `@fontsource-variable/space-grotesk`, `react`, `react-dom` and `three` (WebGL background
  only, dynamically imported as its own chunk). No animation library.
- No external fonts/CDN/images at runtime. Inline SVG or CSS only.
- JS only (`.jsx`), no `.ts/.tsx`. No TypeScript syntax.
- Keep each component's render function small (~120 lines); engine helpers may live in the
  same file (see `NebulaScene.jsx`).
- `src/App.jsx` composes the components — keep import paths and props stable.
- Pure logic (date math, formatting) lives in `src/lib/` and ships with `node:test` tests.

## 9. Verification

```bash
npm run lint       # oxlint, 0 warning
npm test           # node --test, 37 tests
npm run build      # vite build, must pass
node scripts/shot.mjs --width 390 --height 844 --out .shots/mobile.png --mobile
```

Visual check at 360px, 390px and 1440px: no horizontal overflow, `pageHeight` equals the
viewport, no console errors. `scripts/shot.mjs` reports a `nebula` block
(`canvas` / `webgl` / `fallback`) so a screenshot also proves which background renderer
ran. Current baseline: main JS 249.71 kB (gzip 78.54 kB), CSS 32.16 kB (gzip 7.63 kB),
`three` chunk 742.80 kB (gzip 187.69 kB).

Report files changed, commands with pass/fail, and anything deliberately left unverified.

## 10. Integration notes

- `.app` needs `grid-template-columns: minmax(0, 1fr)`: the implicit `auto` grid track
  sized to max-content and overflowed 390px viewports (clipped by `overflow: hidden`).
  Caught by an emulated-viewport screenshot, not by desktop testing.
- Chrome's `--window-size` is clamped on Windows (390 renders at 512), so viewport
  verification goes through `scripts/shot.mjs` (`Emulation.setDeviceMetricsOverride`).
- The countdown shows three units only. The timer re-arms on minute boundaries and the
  data model carries just days, hours and minutes.
- The pause and share features were removed entirely (hook state, buttons, live region,
  CSS and docs). While the countdown runs the page has no action row; once it expires the
  replay button appears.
- The progress rail spans the same width as the card row, aligning the composition's
  left/right edges with the stage. Its start anchor is 25.10.2026.
- `--ink-faint` is raised to #7d85a8 for AA; expired digits keep ≥0.82 opacity;
  `role="progressbar"` sits on `.pr__track` so the dates are not presentational ARIA
  children; the dialog locks `body` scroll and sets `inert` on `.stage`; the hero's
  infinite `background-position` animation was replaced by a one-shot `hero-in`
  transform/opacity entrance.
- A render crash is caught by `src/components/ErrorBoundary.jsx` (wrapped in
  `src/main.jsx`) and rendered as a readable reload panel with the error message — a
  thrown component must never look like a silent black page.
- Dev-server cache gotcha: after removing a feature, a running Vite server can keep
  serving a stale module that references deleted state. Deleting `node_modules/.vite` +
  `.vite` and restarting with `--force` fixed it.
