# STATUS — Sprint 4: bỏ thư viện animation, JS + CSS thuần

Cập nhật: 2026-11-06 · Trạng thái: **hoàn tất, verify đầy đủ, chờ bạn duyệt commit**

## Kết quả

Đã gỡ **`motion`, `@number-flow/react`, `canvas-confetti`** khỏi `package.json`
(`npm uninstall` gỡ 9 package). Mọi chuyển động giờ là CSS + JS thuần; three.js giữ nguyên
(chỉ cho nền WebGL, `import()` động).

Runtime dependencies còn: `react`, `react-dom`, `three`, 2 font package.

## Primitive mới

| File | Vai trò |
|---|---|
| `src/lib/use-reduced-motion.js` | Hook reactive qua `matchMedia` — thay hook snapshot của motion; bật/tắt reduce giữa phiên có hiệu lực ngay |
| `src/components/Odometer.jsx` + `.css` | Odometer chữ số bằng cột `0–9` + `translateY`, `aria-hidden`, tự tắt transition khi reduce |
| `src/lib/confetti.js` | `burstConfetti(canvas, opts)` → `{ stop() }`, canvas 2D thuần, tự dừng sau 2.5s, no-op khi reduce |

## Thay thế từng chỗ

| Trước | Sau |
|---|---|
| `motion.div` entrance | `@keyframes cc-enter` + `animation-delay: calc(var(--cc-i) * 80ms)` |
| `useSpring` tilt | rAF loop ghi `--cc-rx/--cc-ry` (0 setState/frame), cache rect |
| `useSpring` rail fill | `scaleX(var(--pr-p))` + CSS transition `--ease-spring` |
| `motion` head `x` | `container-type: inline-size` + `translateX(calc(var(--pr-p) * 100cqw))` |
| `NumberFlow` | `<Odometer>` |
| `AnimatePresence` | state `present`/`exiting` + `animationend` + fallback timeout |
| `canvas-confetti` | `burstConfetti()` tự viết |

## Bằng chứng

| Lệnh | Exit | Kết quả |
|---|---|---|
| `npm run lint` | 0 | 0 warning |
| `npm test` | 0 | 37/37 |
| `npm run build` (shim) | 0 | ✓ 211ms; main JS **251.84 kB** (gzip 79.05), three chunk 742.80 kB |
| grep 3 thư viện trong `src` | — | **NONE** |
| shot 390 / 1440 | 0 | `pageErrors:[]`, `horizontalOverflow:false`, `webgl:true`, rail `now:31` |
| shot `--expired` | 0 | `now:100`, dialog mở, `stageInert:true` |

## Bug đã sửa trong sprint này

1. **[P1] Confetti bắn ra ngoài khung**: 2 cannon bên dùng góc ngược (`-122`/`-58`), ~90/160 hạt
   không vào khung → đổi lại -58/-122.
2. **[P2] Sheen lệch 4.5px** so với odometer (`top:0` vs center) → `top:50%` + translate.
3. **[P2] Dialog `backdrop-filter: blur(16px)` full-screen** trên WebGL + confetti → tắt ở
   `(max-width:720px), (pointer:coarse)`, scrim đặc hơn bằng token.
4. **[P3] Tilt đọc `getBoundingClientRect()` mỗi `pointermove`** → cache, invalidate theo enter/resize/scroll.
5. **[P3] `%` đọc bởi screen reader** → `aria-hidden`.
6. **Confetti không vẽ ở dev**: StrictMode double-invoke + `firedRef` chặn lần hai → reset cờ trong cleanup.

## Quyết định

- Bỏ cả 3 thư viện (người dùng chốt), giữ cảm giác, được `npm uninstall`.
- Odometer tự viết thay NumberFlow: cột `1ch`, `translateY`, không reflow.
- Rail head dùng `cqw` thay wrapper `width: calc(p*100%)` — tránh animate layout property.
- Không dùng thư viện mới cho bất kỳ phần nào.

## Rủi ro / còn lại

- Odometer: khi 0 → 9 strip quay một vòng trong 720ms; 99 → 100 thêm cột (thấy ở phút mỗi giờ).
- 3 card vẫn `backdrop-filter` trên WebGL ở desktop (có từ trước; đo được +13% nếu tắt, trong nhiễu).
- `container-type`/`cqw` cần Chrome 105+/Safari 16+.
- `docs/preview-*.webp` vẫn là ảnh cũ (4 card).
- Chưa commit; working tree vốn bẩn từ trước sprint.
