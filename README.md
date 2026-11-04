# Aurora Countdown — đếm ngược sinh nhật 06 · 12 · 2026

Trang đếm ngược một màn hình cho sinh nhật **06/12/2026** (từ 06/12/2003, tròn 23 tuổi),
thiết kế theo hướng "space launch page": nền aurora chuyển động, thẻ số odometer bằng
kính mờ, thanh tiến trình chiến dịch và màn ăn mừng confetti khi về đích.

| Desktop | Mobile |
| --- | --- |
| ![Giao diện desktop](docs/preview-desktop.webp) | ![Giao diện mobile](docs/preview-mobile.webp) |

![Màn ăn mừng](docs/preview-celebration.webp)

## Tính năng

- **Đếm ngược theo đồng hồ thực** — mỗi tick đọc lại `Date.now()` rồi tự hẹn giờ tới mốc
  giây kế tiếp, nên không bị trôi như `setInterval`; đồng bộ lại khi tab được focus.
- **Odometer digits** — `@number-flow/react` cuộn từng chữ số, giữ nguyên bề rộng nên
  layout không nhảy. Mỗi đơn vị một màu: tím → cyan → hồng → hổ phách.
- **Chuyển động có chủ đích** — entrance stagger hero → thẻ → rail, tilt 3D theo con trỏ,
  glow theo pointer, shimmer trên nút, aurora drift, starfield canvas.
- **Thanh tiến trình chiến dịch** — mốc bắt đầu là ngày project ra mắt (25.10.2026),
  đích 06.12.2026, phần trăm chạy realtime, vạch chia 25/50/75%, đầu rail phát sáng.
- **Celebration** — khi về 0: dialog kính mờ + confetti hai bên và giữa, đóng bằng
  Escape / backdrop / nút.
- **A11y** — `role="progressbar"` có `aria-valuetext`, mỗi thẻ có `aria-label` đọc trạng
  thái, dialog có `aria-modal` + focus restore, toàn bộ chuyển động tôn trọng
  `prefers-reduced-motion` (kể cả confetti).
- **Offline-friendly** — font self-host qua `@fontsource`, không gọi CDN, không ảnh ngoài.

## Ngăn xếp

| Thành phần | Vai trò |
| --- | --- |
| React 19 + Vite 8 | UI + build |
| `motion` (Framer Motion) | spring, stagger, AnimatePresence, tilt |
| `@number-flow/react` | odometer từng chữ số |
| `canvas-confetti` | pháo giấy màn ăn mừng |
| `@fontsource-variable/*` | Space Grotesk + Inter, self-hosted |

Không dùng UI/CSS framework: toàn bộ giao diện là CSS thuần với design token
(`src/index.css`) và quy ước ghi trong `DESIGN_CONTRACT.md`.

## Cấu trúc

```
src/
  App.jsx                  # composition + trạng thái celebration
  App.css                  # layout shell: hero, actions, footnote
  index.css                # reset + design tokens + base layer
  lib/
    countdown.js           # logic thuần: computeRemaining, progressRatio, format…
    countdown.test.js      # 26 test, node:test, không cần DOM
  hooks/useCountdown.js    # timer bù trôi (đọc lại Date.now mỗi tick)
  components/
    BackgroundFX.jsx/.css  # aurora blobs, grid, grain, vignette
    StarField.jsx          # canvas starfield (RAF, DPR, visibility-aware)
    CountdownGrid.jsx/.css
    CountdownCard.jsx/.css # thẻ kính + NumberFlow + tilt
    ProgressRail.jsx/.css  # thanh tiến trình chiến dịch
    Celebration.jsx/.css   # dialog + confetti
scripts/
  vite-sandbox-shim.mjs    # workaround cho Vite trong DSH sandbox (dev-only)
  shot.mjs                 # chụp ảnh + đo layout qua Chrome DevTools Protocol
docs/                      # ảnh preview
DESIGN_CONTRACT.md         # hợp đồng thiết kế & quy ước cho contributor
AGENTS.md                  # hướng dẫn cho agent làm việc trong repo này
```

## Lệnh

```bash
npm install
npm run dev       # http://localhost:5173/countdown/
npm run build     # dist/
npm run preview
npm run lint      # oxlint, 0 warning
npm test          # node --test --test-isolation=none src
```

### Ghi chú môi trường DSH sandbox (Windows)

Sandbox chặn tiến trình con ghi qua pipe, khiến Vite chết ở `exec('net use')` với
`spawn EPERM` ngay khi load config. Shim `scripts/vite-sandbox-shim.mjs` buộc Vite dùng
fallback `fs.realpathSync` mà chính Vite hỗ trợ, và vô hiệu hoá đúng một pipe-spawn
không liên quan tới build:

```powershell
$env:NODE_OPTIONS='--import ./scripts/vite-sandbox-shim.mjs'
npm run build
```

Ngoài sandbox không cần shim. `npm test` cũng cần `--test-isolation=none` vì test runner
spawn tiến trình con cho từng file; script đã cấu hình sẵn.

Chụp ảnh xác minh (cần Chrome; Chrome phải chạy ngoài sandbox):

```powershell
node scripts/shot.mjs --width 390 --height 844 --out .shots/mobile.png --mobile
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/expired.png --expired
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/reduced.png --expired --reduced
```

`--expired` đẩy `Date.now()` qua ngày đích để mở màn ăn mừng và bắt confetti. Script in ra
`horizontalOverflow`, `pageHeight`, bounding box và console error của trang. `--window-size`
của Chrome bị clamp trên Windows (390 → 512), nên script dùng
`Emulation.setDeviceMetricsOverride` để có viewport đúng. Mặc định script
trỏ tới `http://localhost:5173/countdown/` — đổi bằng `--url` nếu chạy `vite preview`.

## Xử lý sự cố

**Màn hình đen / trang trống nhưng nền vẫn tối**

Nền tối còn nội dung mất = CSS đã nạp nhưng React crash. Kiểm tra theo thứ tự:

1. Mở DevTools → Console, đọc lỗi đầu tiên.
2. Nếu đang chạy dev server: dừng server, xoá cache Vite rồi chạy lại với `--force`:
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite, .vite -ErrorAction SilentlyContinue
   npm run dev -- --force
   ```
   HMR có thể giữ module cũ khi file bị sửa liên tục (đã gặp đúng lỗi
   `isPaused is not defined` sau khi xoá tính năng tạm dừng: file trên đĩa sạch nhưng
   dev server vẫn trả module cũ).
3. Trên trình duyệt: `Ctrl+Shift+R` để bỏ cache; thử cửa sổ ẩn danh.
4. Từ bản này, lỗi render được `ErrorBoundary` bắt và hiện panel "Không tải được giao diện"
   kèm nút tải lại + thông điệp lỗi, nên không còn màn hình đen im lặng.

> **Trang GitHub Pages** hiện vẫn là bản sinh nhật cũ (nhánh `gh-pages`, deploy 25/10/2026),
> không phải bản redesign này. Muốn cập nhật trang live phải build rồi publish `dist/`
> lên `gh-pages`.

## Đã kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | 0 warning / 0 error |
| `npm test` | 27/27 pass |
| `npm run build` | pass, 464 modules |
| 1440×1000 / 834×1112 / 390×844 / 360×780 | không overflow ngang, không lỗi console |
| Expired / reduced-motion | ảnh chụp đúng trạng thái, confetti bị tắt khi reduced |
| `prefers-reduced-motion` | không drift, không tilt, không shimmer, không confetti |
| Contrast meta labels (`--ink-faint`) | ≥ 4.5:1 trên cả 3 nền tối |
| Dialog mở | khóa scroll nền + `inert` stage, Escape đóng, focus quay lại nút mở |
| Progressbar | `aria-valuemin/max/now/valuetext`, hai mốc ngày không còn bị coi là con của `progressbar` |

Kiểm tra độc lập bởi sub-agent `vibe-reviewer`: không có defect blocking; các mục
should-fix của review (contrast, scroll-lock, ARIA rail, hero repaint) đã được xử lý
trong pass tích hợp.

## Ghi chú lịch sử

Bản trước từng bị "trang trắng" vì một khối `/* @keyframes …` không đóng, làm toàn bộ
CSS từ hero tới nút bị nuốt vào comment. Bản này thay bằng keyframes hợp lệ, tách file
CSS theo component và có bước build + chụp ảnh xác minh.
