# DESIGN CONTRACT — "Aurora Countdown" (06·12·2026)

Single source of truth for the redesign. Read fully before writing code.
Lead owns this file. Do **not** edit it, `package.json`, `package-lock.json`, `src/App.jsx`,
`src/App.css`, `src/index.css`, `src/lib/*`, `index.html`, or `vite.config.js`.

## 1. Product goal

A single-screen, cinematic countdown to **06.12.2026**. It must feel like a premium product
launch page: deep-space aurora background, glassmorphic odometer digits, spring motion,
a living progress rail. It must work offline after build (no external network assets),
be keyboard accessible, and respect `prefers-reduced-motion`.

## 2. Visual language

- Mood: deep space / aurora. Dark navy base, violet→cyan→pink→amber spectrum.
- A real 3D layer (three.js WebGL) sits under the content: parallax star depth, two dust
  orbits and coloured nebulae. It must stay atmosphere — never out-shout the digits.
- Glass + glow + grain. Soft 1px light borders, big radii, layered depth (no heavy shadows).
- Generous whitespace. One focal point: the three huge digits.
- Display face: `var(--font-display)` (Space Grotesk Variable). Body: `var(--font-body)` (Inter Variable).
- Digits: `font-variant-numeric: tabular-nums`, tight tracking, gradient fill + coloured glow.

### Tokens (already defined in `src/index.css` — always use them, never hard-code colours)

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

## 3. File ownership (strict — never touch a file you do not own)

| Owner | Files |
|---|---|
| **Lead** | `src/index.css`, `src/App.jsx`, `src/App.css`, `src/lib/countdown.js`, `index.html`, `src/main.jsx`, `package.json`, `DESIGN_CONTRACT.md`, `README.md`, `AGENTS.md`, `scripts/*`, `src/components/NebulaScene.jsx`, `src/components/NebulaScene.css` |
| **qa-tester** | `src/lib/countdown.test.js` |
| **ui-digits** | `src/hooks/useCountdown.js`, `src/components/CountdownGrid.jsx`, `src/components/CountdownGrid.css`, `src/components/CountdownCard.jsx`, `src/components/CountdownCard.css` |
| **ui-atmosphere** | `src/components/BackgroundFX.jsx`, `src/components/BackgroundFX.css`, `src/components/StarField.jsx`, `src/components/ProgressRail.jsx`, `src/components/ProgressRail.css`, `src/components/Celebration.jsx`, `src/components/Celebration.css` |

Import CSS from its component (`import './CountdownCard.css'`). Named exports only.
Placeholder stubs already exist — replace them completely.

## 4. Interfaces (JS + JSDoc, no TypeScript)

### `src/lib/countdown.js` (Lead, already implemented)

```js
export const TARGET_ISO, CAMPAIGN_START_ISO, TARGET_MS, CAMPAIGN_START_MS
export const TARGET_LABEL            // "06 · 12 · 2026"
export const DAY_MS, HOUR_MS, MINUTE_MS
/** @returns {{ totalMs:number, days:number, hours:number, minutes:number, expired:boolean }} */
export function computeRemaining(targetMs, nowMs)
export function pad2(n)              // 7 -> "07"
export function progressRatio(startMs, targetMs, nowMs) // clamped 0..1
export function formatRemaining(r)   // "12 ngày 04 giờ 05 phút"
export function formatDayMonthYear(ms) // "06 · 12 · 2026" (Asia/Bangkok)
```

### `useCountdown` — **owned by ui-digits**, exact return shape

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
boundary (the UI no longer counts seconds, so a per-minute tick is enough and cuts React
renders ~60×); clear timers on cleanup; switch to expired at zero.

### `CountdownGrid` — **owned by ui-digits**

```jsx
<CountdownGrid remaining={{days,hours,minutes}} isExpired />
```

Renders exactly 3 `CountdownCard`s, units in order days/hours/minutes,
labels `Ngày`, `Giờ`, `Phút`, accents `var(--unit-days|hours|minutes)`.

### `CountdownCard` — **owned by ui-digits**

```jsx
<CountdownCard unit="days" label="Ngày" value={288} accent="var(--unit-days)" index={0} isExpired={false} />
```

- Root element class `cc` (add `cc--expired` state class).
- Digits use the in-house `<Odometer value={value} digits={2} />` (no animation library):
  per-digit `0–9` columns translated with `transform`, 1 → `01`, `aria-hidden`.
- `role="group"` + `aria-label` like `"288 ngày"`. Decorative bits `aria-hidden="true"`.
- 3D pointer tilt (max 8deg) via a rAF loop writing `--cc-rx/--cc-ry` CSS vars; disabled for
  touch + reduced motion.
- Reserved space so the card never reflows when digits change.

### `ProgressRail` — **owned by ui-atmosphere**

```jsx
<ProgressRail progress={0.856} isExpired={false} />
```

- `role="progressbar"` with `aria-valuemin/max/now/valuetext` ("đã trôi qua 86%").
- Animate with `transform: scaleX()` (never `width`), shimmer overlay, glowing head dot.
- Meta row: left "ĐÃ TRÔI QUA", right the live percentage (NumberFlow); under the track
  the two dates: `01 · 01 · 2026` (start) and `06 · 12 · 2026` (end) — import from lib.

### `NebulaScene` — **owned by Lead** (new: three.js WebGL layer)

```jsx
<NebulaScene celebrating={false} expired={false} tick={remaining.minutes} />
```

- Dynamically imports `three` inside the mount effect, so the 3D chunk never blocks first
  paint; on any failure (no WebGL, chunk error) it renders the 2D `<StarField />` instead.
- Scene: three parallax star layers (depth 16→215 world units), 18 four-ray flare stars,
  two tilted dust orbits (gradient hairline + dust points), three coloured nebula sprites
  and a core glow. Every colour is read from the CSS tokens at mount time.
- Motion: pointer parallax on the camera (damped), per-layer slow sway, orbit precession,
  and a soft `pulse()` per countdown second. No motion under reduced motion (one static
  frame), RAF fully stopped while `document.hidden`, render loop held to **30 fps**
  (`FRAME_INTERVAL`), DPR capped at **1.25** (1.0 under `(max-width: 720px), (pointer: coarse)`).
  Point counts scale with a mount-time `quality` (0.85 desktop, 0.55 narrow/coarse) with floors.
- `celebrating` raises energy; `expired` shifts the palette cool → amber (`--amber-soft`).
- Cleanup disposes every geometry/material/texture/renderer and removes all listeners.
- Class prefix `.nb` / `.nb__*`; decorative only (`aria-hidden`, `pointer-events: none`).

### `BackgroundFX` — **owned by ui-atmosphere**

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

### `Celebration` — **owned by ui-atmosphere**

```jsx
<Celebration open={bool} onDismiss={() => {}} />
```

- Mount/unmount animation is CSS only: `present` keeps the node alive while `cel--closing`
  plays the exit, unmounted on `animationend` (with a timeout fallback). `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`; Escape closes, focus moves to the dismiss button
  on open and returns to the opener on close.
- Fires the in-house `burstConfetti()` **once per open** (2 side bursts + centre burst,
  no-op under reduced motion). No confetti before `open`.
- Content: emoji, "Đã đến ngày!", "Chúc mừng — khoảnh khắc đã tới.", primary button "Tuyệt vời".

## 5. Class-name registry (avoid collisions)

| Prefix | Owner |
|---|---|
| `.app .stage .hero .hero__* .actions .btn .btn--* .footnote .status-dot` | Lead |
| `.cg .cg__* .cc .cc__*` | ui-digits |
| `.bgfx .bgfx__* .pr .pr__* .cel .cel__*` | ui-atmosphere |
| `.nb .nb__*` | Lead |

BEM-ish, one block per component file. No global element selectors except what Lead owns.

## 6. Motion rules

- Transform / opacity / filter only. Never animate layout properties (`width`, `height`, `top`).
- Entrance stagger: hero children fade up (0.8s, 0/70/140/210ms), cards `translate 28px → 0`,
  `opacity 0 → 1`, delay `i * 80ms`, duration `800ms`, ease `--ease-out`,
  rail last (`y 18px → 0`, 0.8s, delay 500ms). Hero first, rail last.
- Hover: lift `-4px` + accent glow increase. Press: `scale .98`. Focus: 2px accent outline offset 2px.
- `prefers-reduced-motion: reduce` → no transforms, no confetti, no drift; opacity only.
  Use `useReducedMotion()` from `src/lib/use-reduced-motion.js` (reactive to OS changes)
  **and** a CSS media query.
- No animation loop that keeps the CPU busy when the tab is hidden.
- WebGL layer: animate uniforms/objects inside the single RAF loop only; never start a
  second loop. Under reduced motion render exactly one frame. Cap DPR at 1.25 (1.0 on
  narrow/coarse pointers), hold the loop to 30 fps, and pause on `visibilitychange`.
  No shader-based full-screen effects (mobile GPU budget).
- The hero gradient is static on purpose: animating `background-position` repaints a 5.6rem
  heading every frame, outside the compositor-only rule. Do not re-add it. A one-shot
  `::after` sheen that only animates `transform` is the allowed way to add motion here.

## 7. Accessibility (non-negotiable)

- The countdown summary is `<p class="hero__live" role="status" aria-live="off">` with the full
  Vietnamese sentence — per-second `aria-live` announcements are forbidden.
- Real `<button>` elements; visible focus ring; colour never the only signal (add text/icon).
- Decorative layers `aria-hidden="true"`; canvas `aria-hidden="true"`.
- Contrast: body text ≥ 7:1 on the dark base; dim text only for meta labels.
- Touch targets ≥ 44px. No horizontal scroll at 360px width.

## 8. Hard constraints

- Runtime dependencies are pinned in `package.json`: `@fontsource-variable/inter`,
  `@fontsource-variable/space-grotesk`, `react`, `react-dom` and `three` (WebGL background
  only, dynamically imported as its own chunk). No animation library is permitted.
- Never run `npm install` / `npm i` / `npx` unless the Lead is explicitly adding a dep
  (network + lockfile are Lead-owned).
- No external fonts/CDN/images at runtime. Inline SVG or CSS only.
- JS only (`.jsx`), no `.ts/.tsx`. No TypeScript syntax.
- Keep each component's render function small (~120 lines); engine helpers may live in the
  same file (see `NebulaScene.jsx`).
- `src/App.jsx` composes your components — do not change its imports/props.

## 9. Verification (report exact commands)

```bash
npm run lint       # oxlint, must be clean
npm run build      # vite build, must pass
node --test        # lib tests (Lead/tester)
```
Preview baseline: `npm run dev -- --port 5199` → `http://127.0.0.1:5199/countdown/`.
Visual check at 360px, 768px, 1280px. `scripts/shot.mjs` reports a `nebula` block
(`canvas` / `webgl` / `fallback`) so a screenshot also proves which background renderer
ran; Chrome itself must run outside the DSH sandbox (named pipes are blocked inside).
Report: files changed, commands + pass/fail, anything deliberately left unverified.

## 10. Integration notes (Lead, after the component hand-off)

- `.app` needed `grid-template-columns: minmax(0, 1fr)`: the implicit `auto` grid track
  sized to max-content and overflowed 390px viewports (clipped by `overflow: hidden`).
  Caught by an emulated-viewport screenshot, not by desktop testing.
- Chrome's `--window-size` is clamped on Windows (390 renders at 512), so viewport
  verification goes through `scripts/shot.mjs` (`Emulation.setDeviceMetricsOverride`).
- Per-card state chips were removed in the integration pass: four repeated "Tạm dừng"
  pills were visual noise; the hero status badge, button label and dimmed digits already
  carry the state, and each card keeps `aria-label` state for AT. The pause feature was
  later removed entirely (hook, cards, badge, footnote and tests) — the page always ticks.
- The progress rail now spans the same width as the card row (was capped at 860px),
  which aligns the composition's left/right edges with the stage. Its start anchor is
  25.10.2026, the day the project shipped (not an invented 01.01.2026).
- Review pass fixes: `--ink-faint` raised to #7d85a8 for AA; expired digits keep ≥0.82
  opacity; `role="progressbar"` moved onto `.pr__track` so the dates are no longer
  presentational ARIA children; the dialog locks `body` scroll and sets `inert` on
  `.stage`; the hero's infinite `background-position` animation was replaced by a one-shot
  `hero-in` transform/opacity entrance.
- Scope was later trimmed to a pure countdown: the pause and share features were removed
  entirely (hook state, buttons, live region, CSS and docs). While the countdown runs the
  page has no action row at all; once it expires the replay button appears.
- A render crash is now caught by `src/components/ErrorBoundary.jsx` (wrapped in
  `src/main.jsx`) and rendered as a readable reload panel with the error message — a
  thrown component must never look like a silent black page.
- Dev-server cache gotcha: after removing the pause feature, the running Vite server kept
  serving a stale `CountdownCard` module that still referenced `isPaused`, crashing the
  page while the file on disk was clean. Deleting `node_modules/.vite` + `.vite` and
  restarting with `--force` fixed it; both dev and production builds then rendered with
  zero console errors.

