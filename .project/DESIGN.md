# DESIGN — Motion polish (Sprint)

## Stack (không đổi)

| Gói | Version (package.json) | Dùng cho |
|---|---|---|
| react / react-dom | ^19.3.1 | — |
| motion | ^14.9.0 | stagger/hover đã có sẵn; dùng tiếp |
| @number-flow/react | ^0.6.2 | số đếm |
| canvas-confetti | ^1.9.4 | celebration (không đụng) |
| three | ^0.187.0 | nebula (không đụng) |
| vite | ^8.3.4 | build |
| oxlint | ^1.88.0 | lint |

**Không thêm dependency.** `motion` 14.9 đã cover mọi thứ cần cho scope này.

## Token motion hiện có (`src/index.css:51-56`) — dùng lại, không tạo mới

```
--ease-out      --ease-spring
--dur-fast: 180ms   --dur: 320ms   --dur-slow: 720ms
```

## Phân rã công việc theo file (disjoint)

| Vùng | File | Animation |
|---|---|---|
| `.actions` (nút "Xem lại khoảnh khắc") | `src/App.jsx`, `src/App.css` | mount reveal mới |
| Card + số đếm card | `src/components/CountdownCard.jsx`, `CountdownCard.css` | RM cho NumberFlow + bỏ affordance chết |
| Rail + số đếm rail | `src/components/ProgressRail.jsx`, `ProgressRail.css` | RM cho NumberFlow |
| Guardrail test | `src/lib/motion-guard.test.js` (mới) | audit CSS |

## Hợp đồng

### Reveal `.actions`

```css
@keyframes actions-in { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform:none } }
.actions { animation: actions-in var(--dur) var(--ease-out) both; }
```

- Chỉ `opacity` + `transform` → compositor-only.
- `both` để không nháy frame đầu.
- Tắt trong block `prefers-reduced-motion` sẵn có của `App.css` (`App.css:319`).
- Không delay: nút này mount muộn (sau khi hết giờ), delay chỉ làm nó "trễ".

### NumberFlow + reduced motion

- Nguồn sự thật: `useReducedMotion()` từ `motion/react` (đã dùng ở `CountdownCard.jsx:51`,
  `ProgressRail.jsx:25`).
- Prop chính xác phải **đọc từ `node_modules/@number-flow/react` (types/README)**, không đoán.
- Khi reduce: số nhảy tức thì, không roll. Không được `unmount` NumberFlow (mất layout ổn định).

### Card affordance

- `CountdownCard.jsx:89` `tabIndex={-1}`, element không phải button, không có onClick
  ⇒ `whileTap` (`:108`) và rule `:focus-visible` không bao giờ chạy.
- Quyết định: **bỏ** `whileTap` + rule focus-visible. Giữ hover như trang trí.
- Không biến card thành `<button>`: không có action, thêm tab stop vô nghĩa.

### Guardrail test (`src/lib/motion-guard.test.js`)

- Quét `src/**/*.css`; file nào có `@keyframes` hoặc `animation:` phải chứa
  `prefers-reduced-motion`. Fail với message nêu tên file.
- Thuần Node `node:test` + `node:fs`, không thêm dep.

## Quyết định & phương án bị loại

| # | Chọn | Loại | Lý do |
|---|---|---|---|
| D1 | Dùng `motion` + CSS sẵn có | thêm `gsap`/`lenis` | Không cần cho scope; tăng bundle, rủi ro offline |
| D2 | CSS keyframe cho `.actions` | `motion.div` | 1 phần tử, mount 1 lần; CSS được kill-switch global tự động áp |
| D3 | `useReducedMotion()` điều khiển NumberFlow | chỉ dựa prop mặc định | Recon xác nhận digits vẫn roll dưới reduce |
| D4 | Xoá affordance chết trên card | biến card thành `<button>` | Không có action; tăng tab stop vô nghĩa, đổi semantics |
| D5 | Giữ token hiện có | thêm `--dur-xfast` | Tránh đụng `index.css` (file dùng chung, dễ conflict) |

## Error handling

- Không có network/IO mới. Reveal lỗi ⇒ phần tử vẫn hiện (dùng `both`, không `forwards`-only).
- `prefers-reduced-motion` là đường thoát bắt buộc cho mọi hiệu ứng.

## Ngoài phạm vi (follow-up)

Hero badge/sub đổi text tức thì khi hết giờ (`App.jsx:50-54`, `App.css:79-83`), rail halo
swap (`ProgressRail.css:350-356`), WebGL/nebula, celebration.
