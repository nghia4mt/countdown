# AGENTS.md

Hướng dẫn cho agent (và người) làm việc trong repo này. Đọc cùng `DESIGN_CONTRACT.md`.

## Bối cảnh

React 19 + Vite 8, JavaScript/JSX thuần (không TypeScript). Ứng dụng chỉ có một trang:
đếm ngược tới **06 · 12 · 2026**. Code chia theo component, style tách file riêng,
design token nằm trong `src/index.css`.

## Lệnh

```powershell
npm install
npm run dev       # http://localhost:5173/countdown/
npm run build
npm run lint
npm test
```

Trong DSH sandbox trên Windows, Vite chết với `spawn EPERM` khi load config. Dùng shim:

```powershell
$env:NODE_OPTIONS='--import ./scripts/vite-sandbox-shim.mjs'
npm run build
```

`npm test` đã cấu hình `--test-isolation=none` vì test runner cũng bị chặn spawn.

## Quy ước

- **Không tự ý thêm dependency.** Thư viện hiện có: `motion`, `@number-flow/react`,
  `canvas-confetti`, `@fontsource-variable/*`. Hỏi trước khi thêm gói mới hoặc chạy
  `npm install`.
- **Design token, không hard-code màu.** Dùng biến trong `src/index.css`.
  Component CSS dùng prefix class riêng (`cc` cho card, `cg` cho grid, `pr` cho rail,
  `bgfx` cho background, `cel` cho celebration); shell dùng `app/stage/hero/btn`.
- **Chỉ animate `transform`, `opacity`, `filter`.** Không animate `width/height/top/left`.
- **Tôn trọng `prefers-reduced-motion`** ở cả CSS và `useReducedMotion()`.
- **A11y không thương lượng:** interactive = `<button>`, focus ring rõ, dialog có
  `aria-modal` + Escape + focus restore, progressbar có `aria-valuetext`.
- **Không thêm ảnh/font/CDN ngoài** — mọi thứ phải chạy offline sau build.
- Logic thuần (đếm ngày giờ, format) đặt trong `src/lib/` và phải có test `node:test`.

## Kiểm chứng trước khi báo xong

1. `npm run lint` — 0 warning.
2. `npm test` — xanh.
3. `npm run build` — pass.
4. Chụp ảnh 360/390/1440 và kiểm tra không overflow ngang, không lỗi console:
   `node scripts/shot.mjs --width 390 --height 844 --out .shots/mobile.png --mobile`
   (cần Chrome chạy ngoài sandbox).
5. Nếu sửa animation: chụp thêm `--expired --reduced` để chắc confetti/chuyển động bị tắt.

Không báo "đã chạy" nếu chưa chạy lệnh; ghi rõ phần chưa kiểm chứng.

## Bẫy dev server

Sửa nhiều file trong lúc dev server đang chạy có thể để lại module HMR cũ (đã gặp:
file trên đĩa sạch nhưng dev server vẫn trả `isPaused is not defined` → React crash →
nền đen). Khi gặp lỗi "không có trong code": dừng server, xoá `node_modules/.vite` và
`.vite`, rồi `npm run dev -- --force`. `src/components/ErrorBoundary.jsx` đã bắt lỗi render
để hiện panel tải lại thay vì màn hình đen.

