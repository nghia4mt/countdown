# PRD — Bổ sung animation (Sprint)

Trạng thái: **draft — chờ recon P1 để điền mục "Hiện trạng"**
Ngày: 2026-11-06

## 1. Mục tiêu

Trang đếm ngược 06·12·2026 hiện đã có nền nebula WebGL và confetti khi hết giờ, nhưng
phần UI phía trên (số đếm, card, nút) chuyển động chưa nhất quán. Mục tiêu: làm cho
trang **cảm giác sống** ngay từ lúc load và phản hồi rõ ràng khi tương tác, mà không
làm chậm, không gây mỏi mắt, không phá a11y.

## 2. Trong phạm vi

1. **Load / reveal**: chuỗi stagger khi trang mount (hero → số đếm → các card) bằng
   `transform` + `opacity`, chạy một lần, không chặn LCP của số đếm.
2. **Micro-interaction**: hover / press / focus cho các phần tử interactive hiện có
   (button, card bấm được, invalid/warning states nếu có).
3. **Số đếm mượt**: rà lại `@number-flow/react` — đảm bảo chuyển số có nhịp, không
   nhảy giật khi tick giây.

## 3. Ngoài phạm vi (follow-up, không làm trong Sprint này)

- Chuyển trạng thái: expired state, progress bar fill, dialog/panel open, view switch.
- Thay đổi lớp WebGL/nebula (`NebulaScene.jsx`) và `StarField.jsx`.
- Mở rộng celebration/confetti.
- Scroll-driven animation.

## 4. Ràng buộc không thương lượng

- Chỉ animate `transform`, `opacity`, `filter`. Không animate `width/height/top/left`.
- Mọi animation mới phải tắt hoặc hạ cấp xuống bản tĩnh khi `prefers-reduced-motion: reduce`
  (cả CSS và `useReducedMotion()` nếu dùng Motion).
- Không thêm dependency nếu `motion` đã đủ. Nếu buộc phải thêm → **xin duyệt tên gói**
  trước khi `npm install`.
- Không hard-code màu/thời lượng: dùng design token trong `src/index.css`.
- Không ảnh/font/CDN ngoài — vẫn chạy offline sau build.
- Không đổi public props/API của component hiện có nếu không cần.

## 5. Tiêu chí nghiệm thu (testable)

- [ ] AC1 — Given trang load lần đầu, When mount xong, Then các khối chính xuất hiện
      theo thứ tự hero → số đếm → card, mỗi phần tử ≤ 500ms, tổng ≤ 1.2s, và số đếm
      hiển thị đúng ngay từ frame đầu (không bị ẩn chờ animation).
- [ ] AC2 — Given trỏ vào một button/card interactive, When hover, Then có thay đổi
      thị giác rõ trong ≤ 200ms; When nhấn, Then có phản hồi press; When Tab tới,
      Then focus ring hiện và không bị animation che.
- [ ] AC3 — Given `prefers-reduced-motion: reduce`, When load và hover, Then không có
      chuyển động dịch chuyển/scale — chỉ còn thay đổi tức thì hoặc fade ≤ 100ms.
- [ ] AC4 — Given viewport 360×844, When load + hover, Then không overflow ngang,
      không lỗi console, và không có animation nào animate layout property.
- [ ] AC5 — `npm run lint` 0 warning, `npm test` xanh, `npm run build` pass.
- [ ] AC6 — Screenshot 360/390/1440 có block `nebula` = `{canvas:true, webgl:true,
      fallback:false}`.

## 6. Giả định đã được duyệt (theo mặc định)

- Không cần thêm gói mới; nếu recon chứng minh thiếu, sẽ hỏi riêng.
- Không đổi nội dung/copy, không đổi layout tĩnh — chỉ thêm chuyển động.
- Không commit/push/deploy trong Sprint này.

## 7. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Stagger làm số đếm bị ẩn lúc đầu → LCP xấu | Trung bình | Số đếm luôn render visible; chỉ stagger các khối phụ |
| Nhiều animation cùng lúc gây jank mobile | Cao | Chỉ transform/opacity, dùng `will-change` có kiểm soát, đo bằng screenshot + DevTools |
| Trùng lặp với animation đã có (làm 2 lần) | Thấp | Chờ kết quả recon trước khi chốt task |
| HMR cũ gây lỗi "không có trong code" | Thấp | Xoá `node_modules/.vite` khi gặp lỗi lạ |

## Sprint 2 — Hiệu năng + animation tiêu đề

Yêu cầu mới: "trang web hơi lag" + "thêm animation cho 06 · 12 · 2026".

**Quyết định người dùng đã chốt:** lag xuất hiện cả khi để yên; được phép cắt mạnh đồ họa
cho mượt; animation tiêu đề là gradient sweep **một lần** (không loop); thứ tự **lag trước**.

### Baseline đo được (headless Chrome, SwiftShader — số tuyệt đối bi quan, dùng để so sánh)

| Viewport | Mode | FPS | p50 | task/5s | recalcStyle/5s |
|---|---|---|---|---|---|
| 390×844 | idle | 15.0 | 66.7ms | 2.4s | 485ms |
| 390×844 | pointer | 15.0 | 66.6ms | 2.6s | 653ms |
| 1440×1000 | idle | 3.4 | 250ms | 0.7s | 60ms |
| 1440×1000 | pointer | 3.0 | 267ms | 0.7s | 121ms |

Đối chứng `about:blank` cùng harness: 59.9 fps ⇒ harness hợp lệ. 33 CSS animation chạy
thường trực khi để yên.

### Mục tiêu Sprint 2

- M1: giảm chi phí mỗi frame của lớp WebGL (DPR, số điểm, tần suất).
- M2: bỏ `filter: blur()` khỏi các phần tử **đang được animate** ở nền.
- M3: bỏ `backdrop-filter` trên màn hình nhỏ (nơi blur chồng lên canvas động).
- M4: gradient sweep một lần cho `.hero__title`, tắt dưới reduced-motion.
- M5: FPS sau tối ưu không thấp hơn baseline ở cả 4 tổ hợp đo; không hồi quy a11y/WebGL.

### Ngoài phạm vi Sprint 2

Đổi nội dung/layout; thay three.js bằng renderer khác; lazy-load nebula; bỏ parallax.

## Sprint 3 — Bỏ đếm giây, cập nhật mỗi phút

Yêu cầu: "hạ fps xuống 30, xoá luôn chức năng đếm giây".

**Đã chốt với người dùng:**
1. **Nebula giữ nguyên 30fps** — đã bị chặn từ Sprint 2 (`NebulaScene.jsx:12`, `FRAME_INTERVAL = 1000/30`). Không sửa gì.
2. **Bỏ card GIÂY và hạ nhịp cập nhật xuống mỗi phút** (không phải chỉ ẩn).
3. **Footnote**: "Đồng bộ mỗi giây" → "Đồng bộ mỗi phút".

**Lý do kỹ thuật:** mỗi giây, `useCountdown` setState → re-render toàn bộ cây (4 card + NumberFlow + rail).
Bỏ giây đưa nhịp cập nhật từ 1s xuống 1 phút ⇒ giảm ~60× số lần React render. Đây là mức giảm tải
lớn hơn mọi thứ đã làm ở Sprint 2.

**Phạm vi:**
- In: hook đếm, format, grid 3 card, copy footnote, status text, nhịp `pulse` của nền (theo phút).
- Out: nebula/WebGL, celebration, progress bar (vẫn dùng `progress` 0..1, giờ nhảy mỗi phút).

**Tiêu chí nghiệm thu:**
- AC1: Không còn ký tự/nhãn "giây" nào trong UI và trong `remaining`.
- AC2: Số trên trang chỉ đổi khi phút đổi; giữa hai mốc phút, DOM không re-render (đo được).
- AC3: Đúng thời điểm `TARGET_MS`, `isExpired` bật đúng, không trễ quá 1 phút.
- AC4: `progress` vẫn đúng tỉ lệ 0..1 (sai số ≤ 1 phút trên tổng thời gian chiến dịch).
- AC5: Layout 3 card không lệch, không overflow ở 360/390/1440.
- AC6: lint 0 warning, test xanh, build pass, ảnh `webgl:true`.

## Sprint 4 — Bỏ thư viện animation, dùng JS + CSS thuần

Yêu cầu: "xoá animation chỉ sử dụng js và css thuần".

**Đã chốt:** bỏ **cả 3** thư viện (`motion`, `@number-flow/react`, `canvas-confetti`); **giữ nguyên
cảm giác** hiện tại; **được gỡ dependency + `npm uninstall`**; **giữ three.js/WebGL** (thư viện
JS, không phải thư viện animation).

**Hiện trạng phụ thuộc (grep thật):**
- `motion/react`: `Celebration.jsx` (AnimatePresence/motion), `CountdownCard.jsx` (motion + useSpring),
  `ProgressRail.jsx` (motion + useSpring/useTransform), `NebulaScene.jsx` (useReducedMotion),
  `StarField.jsx` (useReducedMotion).
- `@number-flow/react`: `CountdownCard.jsx`, `ProgressRail.jsx`.
- `canvas-confetti`: `Celebration.jsx`.

**Tiêu chí nghiệm thu:**
- AC1: `grep -r "motion/react|@number-flow|canvas-confetti" src` → 0 kết quả.
- AC2: 3 gói không còn trong `package.json`; `npm ls` không còn.
- AC3: cảm giác giữ nguyên — entrance stagger, tilt theo pointer, hover, odometer cuộn số,
  rail fill có spring, dialog enter/exit, confetti burst.
- AC4: reduced-motion tắt mọi chuyển động; hook mới phản ứng **runtime** (tốt hơn hook cũ mount-static).
- AC5: lint 0 warning, test xanh, build pass, bundle nhỏ hơn trước.
- AC6: a11y không đổi — aria, Escape, focus trap, focus restore, `aria-valuetext`.

## 8. Hiện trạng (điền từ recon P1)

_(chờ kết quả `explore`)_
