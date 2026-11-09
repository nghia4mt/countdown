# TASKS — Sprint 4: bỏ 3 thư viện animation, viết lại bằng JS + CSS thuần

## Hợp đồng primitive (Task A tạo, mọi task khác dùng)

```js
// src/lib/use-reduced-motion.js
export function useReducedMotion() // boolean, REACTIVE: cập nhật khi matchMedia đổi
```

```jsx
// src/components/Odometer.jsx
<Odometer value={29} digits={2} />
// render từng chữ số thành cột dọc 0-9, cuộn bằng transform;
// reduced-motion do CSS trong Odometer.css lo, KHÔNG cần prop.
```

## Wave 0 — primitive (chặn các task sau)

| ID | Task | Owner | Owned files | Done when |
|---|---|---|---|---|
| A | Hook + Odometer + thay import 2 chỗ đơn giản | frontend | `src/lib/use-reduced-motion.js` (mới), `src/components/Odometer.jsx` (mới), `src/components/Odometer.css` (mới), `src/components/NebulaScene.jsx`, `src/components/StarField.jsx` | Hook reactive; Odometer cuộn đúng, không cắt số; 2 file kia không còn `motion/react` |

## Wave 1 — 3 task song song, file disjoint

| ID | Task | Owner | Owned files | Done when |
|---|---|---|---|---|
| B | CountdownCard: bỏ motion + NumberFlow | frontend | `src/components/CountdownCard.jsx`, `CountdownCard.css` | Tilt bằng rAF + transform (không setState mỗi frame), entrance bằng CSS keyframes + delay `index*80ms`, hover giữ CSS, odometer dùng `<Odometer>` |
| C | ProgressRail: bỏ motion + NumberFlow | frontend | `src/components/ProgressRail.jsx`, `ProgressRail.css` | Fill dùng `transform: scaleX()` + CSS transition (không spring lib), head chạy theo cùng biến, phần trăm dùng `<Odometer>` |
| D | Celebration: bỏ motion + confetti | frontend | `src/components/Celebration.jsx`, `Celebration.css`, `src/lib/confetti.js` (mới) | Enter/exit bằng state + CSS (`data-state`/animationend), confetti viết lại bằng canvas 2D thuần, giữ Escape/focus trap/focus restore |

## Wave 2

| ID | Task | Owner | Owned files | Done when |
|---|---|---|---|---|
| E | Gỡ dependency | lead | `package.json`, `package-lock.json` | `npm uninstall motion @number-flow/react canvas-confetti`; build vẫn pass |
| F | Verify + review | lead + reviewer | — | AC1–AC6 |

## Ràng buộc chung

- Không thêm dependency mới — đây là mục đích của sprint.
- Chỉ animate `transform`, `opacity`, `filter`; không animate `width/height/top/left/background-position`.
- Mọi animation mới phải có fallback `prefers-reduced-motion` trong CSS.
- Không đổi text, label, layout, aria hiện có.
- Không commit/push.
