# Bộ kiểm thử — Construction Progress

Chạy trên **jsdom**: nạp thẳng `src/index.html` vào một DOM giả rồi gọi các hàm
qua `window.APP`. Không có bước build, không mock logic — test chạy đúng đoạn mã
mà người dùng chạy.

## Chạy

```bash
npm install          # lần đầu (cần jsdom)
npm test             # kiểm tra cú pháp + toàn bộ bộ test
npm run test:syntax  # chỉ kiểm tra cú pháp phần <script>
node tests/run-all.js 09        # chỉ chạy bộ test có "09" trong tên tệp
```

Kết quả: mỗi bộ một dòng `ok` / `FAIL`, cuối cùng là tổng số assertion.
Thoát mã 1 nếu có bộ nào đỏ — dùng được trong CI.

## Ảnh chụp phần vẽ Gantt (bắt buộc theo CLAUDE.md §13.3)

Phần vẽ hỏng rất âm thầm. Trước khi đụng vào `renderGantt`, `tierCells`,
`drawTiersInto`, `buildTimeline`:

```bash
git show HEAD:src/index.html > truoc.html
CP_APP_HTML=truoc.html node tests/snap.js snap_before.svg
# ... sửa code ...
node tests/snap.js snap_after.svg
diff snap_before.svg snap_after.svg
```

**Mọi khác biệt phải giải thích được. Không giải thích được = có lỗi.**

`tests/snap.js` dùng một dự án mẫu với ngày cố định, tắt vạch "hôm nay" và cố
định px/ngày, nên hai lần chụp liên tiếp phải giống hệt nhau.

## Cấu trúc

```
tests/
  run-all.js          chạy mọi tệp specs/*.test.js
  syntax-check.js     nạp phần <script> bằng new Function() (CLAUDE.md §13.2 #2)
  snap.js             chụp SVG Gantt để đối chiếu
  helpers/
    env.js            nạp app vào jsdom; makeState / schedule / clearSelection
    tinytest.js       assert tối giản (eq / ok / ne / throws) — không thư viện ngoài
  specs/
    01-date-utils        ngày luôn dd/mm/yyyy, không theo locale máy
    02-calendar          ngày làm việc, nghỉ tuần, nghỉ lễ, lịch theo giai đoạn
    03-preds-parse       cú pháp FS/SS/FF/SF, độ trễ, token sai
    04-schedule-basic    forward pass, mốc tiến độ, dòng trống, lỗi ID
    05-schedule-links    bốn kiểu quan hệ, lag, nhiều quan hệ lấy ngày muộn nhất
    06-schedule-constraints  mStart "không sớm hơn", chế độ manual
    07-summary           phân cấp theo level, dòng cha tổng hợp từ con
    08-cycle             vòng lặp quan hệ: báo lỗi, không treo
    09-pst-ordinal       ánh xạ STT ↔ chỉ số mảng khi bật dòng tổng dự án
    10-resources         cú pháp nhân lực, biểu đồ nhân lực
    11-timeline          phạm vi trục, Auto fit, đơn vị tuần/tháng
    12-version           quy ước Ver YY.MM.NNN, nhãn phiên bản, thông báo bản mới
    13-storage           khóa localStorage, danh mục dự án
    14-migration         mergeDefaults nâng cấp hồ sơ cũ
    15-invariants        ràng buộc kiến trúc §13.1 (kiểm ở mức mã nguồn)
    16-render            cấu trúc SVG: thanh, mốc, đường quan hệ, vạch hôm nay
    17-table-ops         chèn/xóa dòng và ĐÁNH SỐ LẠI quan hệ phụ thuộc
    18-clipboard         dán TSV từ Excel, copy bảng ra TSV
    19-print             khổ giấy, token, bảng in
    20-columns-format    thứ tự cột, định dạng ô và tiêu đề cột
```

## Viết thêm test

Một tệp trong `specs/` export `name` và `run(t)`:

```js
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "mô tả ngắn bộ test";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("điều đang kiểm tra");
    const s = schedule(APP, [{ name: "A", dur: 3 }]);
    t.eq(s[0].finish, "2026-01-07", "vì sao kỳ vọng như vậy");
  } finally { closeApp(APP); }   // luôn đóng jsdom, nếu không process bị treo
};
```

Quy ước:

* `makeState(APP, {...})` dựng state tối thiểu — mặc định dự án bắt đầu **thứ Hai
  05/01/2026**, Chủ nhật nghỉ, thứ Bảy làm.
* `schedule(APP, tasks, over)` = `makeState` + `compute()`, trả ngày dạng ISO cho
  dễ so sánh.
* Gọi `APP.renderAll()` trước các hàm cần DOM (`insertTaskAt`, `focusCell`,
  `formatCells`, `setProjectSummary`…).
* Thông điệp assert viết bằng tiếng Việt, nói **vì sao** kỳ vọng như vậy — khi test
  đỏ, người đọc cần hiểu ngay đang mất tính chất gì.

## Vì sao không dùng Jest/Vitest

Cùng lý do app không dùng framework: giữ số phụ thuộc ở mức thấp nhất, chạy được
bằng `node` trần. Phụ thuộc duy nhất là `jsdom` — cần thiết vì toàn bộ app là DOM.
