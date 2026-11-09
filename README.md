# Aurora Countdown — đếm ngược sinh nhật 06 · 12 · 2026

Trang đếm ngược một màn hình cho sinh nhật **06/12/2026** (từ 06/12/2003, tròn 23 tuổi),
thiết kế theo hướng "space launch page": nền tinh vân WebGL 3D chuyển động, thẻ số
odometer bằng kính mờ, thanh tiến trình chiến dịch và màn ăn mừng confetti khi về đích.

| Desktop | Mobile |
| --- | --- |
| ![Giao diện desktop](docs/preview-desktop.webp) | ![Giao diện mobile](docs/preview-mobile.webp) |

![Màn ăn mừng](docs/preview-celebration.webp)

## Tính năng

- **Nền tinh vân WebGL (three.js)** — 3 lớp sao theo chiều sâu (16 → 215 đơn vị thế giới),
  18 ngôi sao flare 4 tia, 2 quỹ đạo bụi có đường gradient, 3 tinh vân màu và lõi sáng.
  Camera parallax theo con trỏ, mỗi phút countdown tạo một nhịp sáng nhẹ, màu lấy từ design
  token. `three` được `import()` động nên nằm ở chunk riêng và không chặn first paint;
  trình duyệt không có WebGL tự hạ cấp về starfield canvas 2D (`StarField.jsx`).
- **Đếm ngược theo đồng hồ thực** — mỗi tick đọc lại `Date.now()` rồi tự hẹn giờ tới mốc
  phút kế tiếp, nên không bị trôi như `setInterval`; đồng bộ lại khi tab được focus.
  UI chỉ hiển thị ngày/giờ/phút nên dữ liệu cập nhật mỗi phút.
- **Odometer digits** — `@number-flow/react` cuộn từng chữ số, giữ nguyên bề rộng nên
  layout không nhảy. Mỗi đơn vị một màu: tím → cyan → hồng.
- **Chuyển động có chủ đích** — entrance stagger hero → thẻ → rail, tilt 3D theo con trỏ,
  glow theo pointer, sheen sweep khi hover/focus card, aura breathing lệch pha giữa 3 thẻ,
  shimmer trên nút, aurora drift và quỹ đạo 3D quay rất chậm.
- **Thanh tiến trình chiến dịch** — mốc bắt đầu là ngày project ra mắt (25.10.2026),
  đích 06.12.2026, phần trăm chạy realtime, vạch chia 25/50/75%, đầu rail phát sáng.
- **Celebration** — khi về 0: dialog kính mờ + confetti hai bên và giữa, đóng bằng
  Escape / backdrop / nút; nền 3D chuyển sang tông hổ phách ấm.
- **A11y** — `role="progressbar"` có `aria-valuetext`, mỗi thẻ có `aria-label` đọc trạng
  thái, dialog có `aria-modal` + focus restore, toàn bộ chuyển động tôn trọng
  `prefers-reduced-motion` (kể cả confetti và WebGL: chỉ render một frame tĩnh).
- **Offline-friendly** — font self-host qua `@fontsource`, không gọi CDN, không ảnh ngoài;
  texture của three.js được vẽ bằng canvas ngay trong bundle.

## Ngăn xếp

| Thành phần | Vai trò |
| --- | --- |
| React 19 + Vite 8 | UI + build |
| `three` (three.js) | nền tinh vân WebGL 3D, import động thành chunk riêng |
| `motion` (Framer Motion) | spring, stagger, AnimatePresence, tilt |
| `@number-flow/react` | odometer từng chữ số |
| `canvas-confetti` | pháo giấy màn ăn mừng |
| `@fontsource-variable/*` | Space Grotesk + Inter, self-hosted |

Không dùng UI/CSS framework: toàn bộ giao diện là CSS thuần với design token
(`src/index.css`) và quy ước ghi trong `DESIGN_CONTRACT.md`.

## Cấu trúc

```
src/
  App.jsx                  # composition + trạng thái celebration, nối tick xuống nền
  App.css                  # layout shell: hero, actions, footnote
  index.css                # reset + design tokens + base layer
  lib/
    countdown.js           # logic thuần: computeRemaining, progressRatio, format…
    countdown.test.js      # 27 test, node:test, không cần DOM
  hooks/useCountdown.js    # timer bù trôi (đọc lại Date.now mỗi tick)
  components/
    BackgroundFX.jsx/.css  # aurora blobs, grid, grain, vignette + <NebulaScene />
    NebulaScene.jsx/.css   # nền WebGL three.js (stars, flares, orbits, nebula, parallax)
    StarField.jsx          # canvas 2D dự phòng khi không có WebGL
    CountdownGrid.jsx/.css
    CountdownCard.jsx/.css # thẻ kính + NumberFlow + tilt + sheen/aura
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
npm run preview   # http://localhost:4173/countdown/
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

Chụp ảnh xác minh (cần Chrome; Chrome phải chạy ngoài sandbox vì sandbox chặn named pipe
của Chromium):

```powershell
node scripts/shot.mjs --width 390 --height 844 --out .shots/mobile.png --mobile
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/expired.png --expired
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/reduced.png --expired --reduced
node scripts/shot.mjs --width 1440 --height 1000 --out .shots/toggle.png --toggle-reduced
```

`--expired` đẩy `Date.now()` qua ngày đích để mở màn ăn mừng và bắt confetti.
`--toggle-reduced` bật "Reduce Motion" **sau khi** trang đã chạy, để kiểm tra nền WebGL
tự dựng lại ở chế độ tĩnh (JSON trả về block `reducedToggle` với `recreated: true`).
Script in ra `horizontalOverflow`, `pageHeight`, bounding box, console error, và block `nebula`
(`canvas` / `webgl` / `fallback`) để biết trang đang chạy nền WebGL hay bản dự phòng 2D.
`--window-size` của Chrome bị clamp trên Windows (390 → 512), nên script dùng
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
5. Nếu nền chỉ còn canvas 2D (block `nebula.fallback = true`): trình duyệt/GPU đang từ chối
   WebGL — đây là đường dự phòng có chủ đích, không phải lỗi; muốn kiểm tra nền 3D thì chạy
   Chrome có bật GPU.

> **Trang GitHub Pages** hiện vẫn là bản sinh nhật cũ (nhánh `gh-pages`, deploy 25/10/2026),
> không phải bản redesign này. Muốn cập nhật trang live phải build rồi publish `dist/`
> lên `gh-pages`.

## Đã kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | 0 warning / 0 error |
| `npm test` | 27/27 pass |
| `npm run build` | pass, 470 module; main JS 416.2 kB (gzip 133.8 kB), chunk `three` 742.8 kB (gzip 187.7 kB, tải sau khi mount), CSS 30.8 kB (gzip 7.4 kB) |
| 1440×1000 / 390×844 / 360×780 | không overflow ngang, `pageHeight` = viewport, không lỗi console |
| Nền WebGL | probe `nebula` = `{canvas:true, webgl:true, fallback:false}` ở cả 5 lượt chụp |
| Expired | dialog `aria-modal` mở đúng, focus vào nút "Tuyệt vời", body scroll bị khoá, rail 100%, nền chuyển tông hổ phách |
| Reduced-motion | WebGL chỉ render một frame tĩnh, CSS animation bị tắt, confetti không chạy |
| Bật Reduce Motion giữa phiên (`--toggle-reduced`) | scene WebGL tự dựng lại ở chế độ tĩnh (`recreated: true`), RAF dừng, không lỗi console |
| Contrast meta labels (`--ink-faint`) | ≥ 4.5:1 trên cả 3 nền tối |
| Progressbar | `aria-valuemin/max/now/valuetext`, hai mốc ngày không còn bị coi là con của `progressbar` |

Kiểm tra độc lập bởi sub-agent `reviewer` (bản thêm three.js): không có defect blocking;
1 should-fix về reduced-motion thay đổi giữa phiên đã được xử lý (nghe `matchMedia`
`change` để dựng lại scene ở chế độ tĩnh) cùng 2 nit về resize khi tab ẩn và specificity
của block reduced-motion trong CSS card.

## Ghi chú lịch sử

Bản trước từng bị "trang trắng" vì một khối `/* @keyframes …` không đóng, làm toàn bộ
CSS từ hero tới nút bị nuốt vào comment. Bản này thay bằng keyframes hợp lệ, tách file
CSS theo component và có bước build + chụp ảnh xác minh.

Bản thêm three.js giữ nguyên nguyên tắc "mọi thứ chạy offline": texture sao/tinh vân được
vẽ bằng `<canvas>` trong runtime, không tải ảnh ngoài; `three` nằm ở chunk riêng nên bundle
chính gần như không đổi, và toàn bộ tài nguyên GPU được dispose khi component unmount.
