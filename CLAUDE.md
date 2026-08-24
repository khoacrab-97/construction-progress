# Construction Progress — Tài liệu bàn giao dự án

> \*\*Phiên bản tài liệu:\*\* ứng với `Tiến độ thi công Ver 26.08.002`
> \*\*Đọc file này trước khi sửa bất cứ thứ gì.\*\* Mục 13 là ràng buộc bắt buộc.

\---

## 1\. Mục tiêu của app

Phần mềm lập và in **tiến độ thi công dạng biểu đồ Gantt** cho ngành xây dựng
Việt Nam, dùng cho các dự án **cảnh quan – hạ tầng đô thị** (đường giao thông,
cấp thoát nước, san nền, trồng cây xanh).

Mục tiêu cốt lõi:

* Thay thế việc lập tiến độ bằng Excel thủ công, nhưng **giữ nguyên cảm giác thao
tác như Excel** để người dùng không phải học lại.
* Cho ra **bản in đúng khổ giấy** (A3/A4, ngang/dọc) đưa vào hồ sơ dự thầu và hồ
sơ nghiệm thu — đây là đầu ra quan trọng nhất, không phải màn hình.
* Chạy **hoàn toàn cục bộ**, không cần internet, không cần cài đặt phức tạp, không
cần quyền quản trị máy.
* Giao diện học theo **MS Project** để người trong ngành nhìn là quen.

\---

## 2\. Người dùng / phân quyền

**App KHÔNG có hệ thống tài khoản, đăng nhập hay phân quyền.** Đây là quyết định
có chủ đích, không phải thiếu sót.

|Vai trò|Cách dùng|
|-|-|
|Kỹ sư QS / cán bộ kỹ thuật|Người dùng chính, lập và in tiến độ trên máy cá nhân|
|Người quản trị phần mềm (tác giả)|Phát hành bản mới bằng cách đẩy tag `vYY.M.N` lên GitHub|

Lý do không có phân quyền:

* Mô hình **một người – một máy**. Dữ liệu nằm trong thư mục `data\\` cạnh file
`.exe`, không có máy chủ, không chia sẻ đồng thời.
* Nếu nhiều người cùng đăng nhập **chung một tài khoản Windows** trên máy chủ
remote thì dữ liệu sẽ lẫn lộn. Mỗi người phải có tài khoản Windows riêng.

\---

## 3\. Các chức năng đã thống nhất

### 3.1 Bảng nhập liệu (thao tác như Excel)

* Cột mặc định: `STT · Tên công việc · Thời gian · Bắt đầu · Kết thúc · Quan hệ phụ thuộc · Nhân lực`
* Cột tùy chỉnh do người dùng tự thêm
* Ô có **hai trạng thái**: click một lần = chọn, double-click (hoặc F2) = nhập
* Con trỏ hình dấu cộng khi rê trong bảng, hình chữ khi đang nhập
* Nút kéo điền ở góc dưới phải vùng chọn (fill handle), có đoán chuỗi
* Chọn vùng, chọn nhiều vùng rời rạc (Ctrl+Click), chọn cả cột (click tiêu đề)
* Phím: `Ctrl+D`, `Ctrl+Mũi tên`, `Ctrl+Shift+Mũi tên`, `Tab`, `Shift+Enter`,
`F2`, `Esc`, `Ctrl+Home/End`, `Ctrl+Space`, `Ctrl+Z/Y`
* Copy/Paste hai chiều với Excel (định dạng TSV)
* Dán đặc biệt: dán giá trị, dán định dạng
* Tìm \& thay thế (`Ctrl+F`, `Ctrl+H`) có tô sáng kết quả
* Định dạng ô: đậm/nghiêng/gạch chân, căn ngang/dọc, font, cỡ, màu chữ, màu nền, đường viền

### 3.2 Biểu đồ Gantt

* Thanh công việc, dòng tổng (summary), mốc tiến độ (milestone)
* Đường quan hệ phụ thuộc có mũi tên, chỉnh được kiểu nét và màu
* Nhãn chữ 5 vị trí quanh thanh: trái, phải, trên, dưới, trong
* **Bar Styles** dạng bảng như MS Project (xem mục 3.4)
* Kẻ lưới (Gridlines) tùy chỉnh
* Tô ngày nghỉ (Non-working time)
* Vạch "hôm nay"
* Dòng tổng dự án (Project Summary Task)
* Auto fit: tự thu phóng cho vừa màn hình, **gom nhiều ngày vào một cột** thay vì
nén pixel
* Cuộn ngang vô hạn hai chiều (khi tắt Auto fit)

### 3.3 Thang thời gian (Timescale)

Hộp thoại 4 tab như MS Project: **Top Tier · Middle Tier · Bottom Tier ·
Non-working time**. Mỗi tầng chỉnh riêng Units, Label, Count, Align, Tick lines.
Timescale options: Show (1/2/3 tầng), Size %, Scale separator, có Preview.

### 3.4 In ấn

* Khổ A4/A3, ngang/dọc, lề tùy chỉnh
* Header 3 ô (trái/giữa/phải) hỗ trợ **định dạng riêng từng đoạn chữ**
* Footer đặt nhiều hộp chữ ký, kéo thả vị trí
* Token tự điền: `{DUAN} {CONGTRINH} {HANGMUC} {GOITHAU} {DIADIEM} {BATDAU} {KETTHUC} {NGAYIN} {TRANG} {SOTRANG}`
* Xem trước kiểu MS Project
* Tự chia trang theo chiều cao giấy

### 3.5 Khác

* Biểu đồ nhân lực (histogram) theo cột Nhân lực
* Lịch làm việc: ngày nghỉ tuần + ngày lễ
* Lưu/mở file `.tdtc`, nhiều dự án trong máy
* Nhắc lưu khi tắt app, và phục hồi bản dở dang sau khi app đóng bất thường (xem 3.6)
* Song ngữ Việt/Anh
* Tự kiểm tra và tải bản cập nhật

### 3.6 Lưu \& phục hồi

Hai chỗ chứa dữ liệu song song, có vai trò khác nhau:

* **🗂 Dự án của tôi** (localStorage) — lưới an toàn. `save()` chạy sau mỗi lần
sửa một ô, nên mất điện chỉ mất đúng ô đang gõ dở.
* **File `.tdtc`** — bản chính thức để lưu trữ và chia sẻ, chỉ được ghi khi
người dùng bấm lưu.

Cầu nối giữa hai chỗ là cờ **`unsaved`** trên từng mục của `tiendo\_idx\_v1`:
"bản trong máy mới hơn file trên đĩa".

```
bật   ← save(), khi dự án đang gắn với một file .tdtc
tắt   ← ghi ra .tdtc thành công
tắt   ← người dùng chủ động chọn "Không lưu" lúc tắt app
```

Vì vậy **cờ còn sót lúc khởi động = lần trước app chết bất thường** — tắt tử tế
thì một trong hai nhánh của `closeFlow()` đã xóa cờ rồi. Không cần nhịp tim,
không cần file tạm, không cần dò tiến trình.

**Tắt app thủ công** — `closeFlow()`:

```
Hộp Có / Không / Hủy   (chỉ hiện khi isDiskDirty())
  Có     → ghi ra .tdtc rồi đóng
  Hủy    → ở lại
  Không  → dự án ĐÃ gắn file  : đóng luôn, xóa cờ (lần sau không nhắc phục hồi)
         → dự án CHƯA có file : hỏi tiếp "giữ trong 🗂 Dự án của tôi?"
                Có    → đặt tên → đóng
                Không → xóa hẳn khỏi danh mục → đóng
```

**Phục hồi** — hai lối vào, đều chỉ hỏi **một lần** cho mỗi mục:

|Lối vào|Hành vi|
|-|-|
|Khởi động app|`maybeShowRecovery()` liệt kê mọi mục còn cờ. Mỗi dòng có **Mở lại** / **Bỏ**, kèm ô tick để bỏ hàng loạt. "Để sau" giữ nguyên, lần mở sau hỏi lại những mục chưa xử lý|
|Mở đúng file đó|`openExternalDataAsk()` hỏi trước khi nạp. Trước đây `openExternalData()` **âm thầm đè** bản mới trong máy bằng nội dung cũ của file|

Khi mở lại một bản dở dang, `recoverOne()` đọc lại file gốc rồi **bỏ nội dung đó
đi** — mục đích chỉ là xác nhận file còn ở chỗ cũ và báo đường dẫn cho tiến trình
chính, để 💾 Lưu ghi **đè đúng file**, không mở lại hộp Lưu thành.

`isDiskDirty()` tính cả dự án **chưa từng ghi ra `.tdtc`** (`_docDirty` \+
`stateHasContent()`); trước đây nhánh này luôn "sạch" nên tắt app không hỏi gì.

\---

## 4\. Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────┐
│  Tiến độ thi công.exe   (Electron, cài bằng NSIS)      │
│  · electron/main.js          cửa sổ, IPC, mở/lưu .tdtc │
│  · electron/preload.js       cầu window.desktop        │
│  · electron/update-service.js    electron-updater      │
└───────────────┬────────────────────────────────────────┘
                │ nạp
┌───────────────▼────────────────────────────────────────┐
│  src/index.html   (~400 KB)                            │
│  HTML + CSS + JS thuần, KHÔNG framework                │
│  Gantt vẽ bằng SVG dựng tay                            │
└───────────────┬────────────────────────────────────────┘
                │ đọc/ghi
┌───────────────▼────────────────────────────────────────┐
│  localStorage   ·   file .tdtc trên đĩa                │
└────────────────────────────────────────────────────────┘
```

**Nguyên tắc kiến trúc:**

* **Một file HTML duy nhất.** Không tách module, không bundler, không npm ở phía
sản phẩm. Lý do: phân phối chỉ cần copy một file; cập nhật chỉ cần thay một file.
* **Vanilla JS.** Không React/Vue/jQuery. Không thư viện biểu đồ (D3, Chart.js).
SVG dựng bằng `document.createElementNS` qua hàm `svgEl()` tự viết.
* **Local-first.** Không có máy chủ ứng dụng. Điểm liên lạc mạng duy nhất là
GitHub Releases để kiểm tra và tải bản cập nhật.
* **Vỏ Electron mỏng.** `electron/` chỉ lo cửa sổ, hộp thoại file, IPC và cập nhật
— không chứa logic nghiệp vụ. Toàn bộ nghiệp vụ nằm trong `src/index.html`.

**Kênh cập nhật:**

```
Bản desktop — kênh chính
  index.html ──IPC──▶ main.js ──▶ electron-updater
                                   ──GET──▶ Releases/latest.yml  (có bản mới?)
                                   ──GET──▶ .exe + .blockmap     (tải delta)
  Tải: autoDownload = true → tải ngầm ngay khi thấy bản mới
  Cài: quitAndInstall(true, true) → NSIS chạy với /S, cài đè rồi tự mở lại app
  Sự kiện available/progress/downloaded đẩy về giao diện qua kênh updates:event

Bản mở bằng trình duyệt — KHÔNG có kênh cập nhật nào
  Muốn bản mới thì tải trình cài từ GitHub Releases.
```

Kiểm tra: 3 giây sau khi mở app, rồi lặp lại mỗi 4 giờ (`UPDATE_EVERY_MS`), và
bất cứ lúc nào qua **Trợ giúp → 🔄 Kiểm tra cập nhật**. Toàn bộ tải – cài – mở lại
chạy tự động; chỉ dừng hỏi khi còn thay đổi chưa lưu ra file.

**Phát hành:** đẩy tag `vX.Y.Z` → `.github/workflows/release.yml` chạy test, build
installer, tạo GitHub Release. Push thường lên `main` chỉ chạy `ci.yml` (test).
Tag là nguồn duy nhất quyết định số phiên bản — `version` trong `package.json`
do CI ghi, không sửa tay.

\---

## 5\. Database / Data model

**Không có cơ sở dữ liệu.** Toàn bộ trạng thái là **một object JSON** tên `state`,
lưu vào `localStorage` và xuất ra file `.tdtc`.

### Khóa lưu trữ

|Khóa|Nội dung|
|-|-|
|`tiendo\_idx\_v1`|Danh mục dự án `\[{id, name, updated, srcUrl, unsaved}]` — `unsaved` xem 3.6|
|`tiendo\_cur\_v1`|Id dự án đang mở|
|`tiendo\_prj\_<id>`|Toàn bộ `state` của một dự án|
|`tiendo\_gantt\_v1`|Khóa bản cũ (thời còn 1 dự án duy nhất) — **giữ để chuyển đổi, không xóa**|
|`tiendo\_lang\_v1`|Ngôn ngữ giao diện đang chọn|

### Object `state`

```js
{
  name: "Dự án mới",
  start: "2026-08-24",              // ISO, ngày bắt đầu dự án
  workDays: \[0,1,1,1,1,1,1],        // CN→T7, 1 = ngày làm việc
  holidays: \["2026-09-02", ...],    // ISO
  tasks: \[ /\* xem 6.1 \*/ ],
  customCols: \[{id, name}],
  colOrder: \["stt","name","dur","start","finish","preds","res", ...],
  colW: { name: 260, ... },         // px
  colFmt: { name: {a,b,i,u,...} },  // định dạng TIÊU ĐỀ cột
  fieldSet: { <key>: {...} },       // Field Settings, xem 6.3
  colLabels: { <key>: "Tên mới" },  // đổi tên cột hệ thống
  ts: { /\* xem 6.4 \*/ },
  barStyle: { /\* cấu hình chung cũ, vẫn dùng làm dự phòng \*/ },
  barStyles: \[ /\* xem 6.2 \*/ ],
  grid: { rows:{t,c}, bars:{t,c}, cols:{t,c} },
  nwt: { draw:"behind|front|none", c:"#eef1f5", pat:"solid|hatch" },
  font: { family, size, wrap },
  tlFmt: { ff, fs, b, i, u },       // định dạng chữ thang thời gian
  info: { congtrinh, hangmuc, goithau, diadiem },
  print: { /\* xem 6.5 \*/ },
  view: "gantt" | "histo",
  pst: false                        // bật/tắt dòng tổng dự án
}
```

Giới hạn: `MAXROWS = 500` dòng.

\---

## 6\. Các bảng và quan hệ

### 6.1 `tasks\[]` — bảng chính

|Trường|Kiểu|Ý nghĩa|
|-|-|-|
|`name`|string|Tên công việc. **Rỗng = dòng trống**, bị bỏ qua khi tính lịch|
|`level`|int|Cấp thụt lề (0 = ngoài cùng). Quyết định quan hệ cha–con|
|`dur`|int|Số ngày làm việc. **`0` = mốc tiến độ (milestone)**|
|`preds`|string|Quan hệ phụ thuộc, xem 6.1.1|
|`res`|string|Nhân lực, xem 6.1.2|
|`mStart`|string|`dd/mm/yyyy` — ràng buộc "không bắt đầu sớm hơn"|
|`mode`|string|`"manual"` = bỏ qua quan hệ phụ thuộc, giữ ngày đã chốt|
|`custom`|object|Giá trị các cột tùy chỉnh `{cc1: "...", ...}`|
|`fmt`|object|Định dạng từng ô `{<colKey>: {b,i,u,a,v,ff,fs,c,bg,bd}}`|
|`bar`|object|Ghi đè kiểu thanh riêng cho công việc này|
|`barText`|object|Ghi đè nhãn chữ riêng cho công việc này|
|`collapsed`|bool|Nhóm đang thu gọn|
|`rowH`|int|Chiều cao dòng do người dùng kéo|
|`\_pst`|bool|**Chỉ dòng tổng dự án mới có.** Không đặt tay|

**Quan hệ cha–con là ngầm định theo `level`**: một dòng là "cha" khi dòng ngay
sau nó có `level` lớn hơn. Không có trường `parentId`.

#### 6.1.1 Cú pháp `preds`

```
2          → sau công việc số 2, kiểu FS (mặc định)
2FS+3      → sau công việc 2, chờ thêm 3 ngày làm việc
5SS-1      → bắt đầu cùng lúc công việc 5, sớm hơn 1 ngày
4,7        → phụ thuộc nhiều công việc, lấy ngày MUỘN NHẤT
```

Bốn kiểu: `FS` (kết thúc–bắt đầu), `SS`, `FF`, `SF`.

**Số trong `preds` là SỐ THỨ TỰ HIỂN THỊ ở cột STT, không phải chỉ số mảng.**
Khi bật dòng tổng dự án, dòng đó mang số 0 nên toàn bộ ánh xạ dịch đi một bậc —
việc quy đổi nằm ở `pstOrdinal()` và `idxOfId()`. **Đây là chỗ từng gây lỗi sai
lịch âm thầm, xem mục 9.**

#### 6.1.2 Cú pháp `res`

```
12                        → 12 người
Nhân công\[10]; Thợ hàn\[2] → tổng 12 người
Thợ nề                    → tên không ghi số → tính 1 người
```

### 6.2 `barStyles\[]` — bảng kiểu thanh (như MS Project)

```js
{
  id, name,
  showFor: "normal" | "summary" | "milestone" | "projectSummary",
  row: 1, from: "start", to: "finish",     // hiện CHỈ HIỂN THỊ, chưa sửa được
  bars: {
    start: {shape, color},
    mid:   {shape, pattern, color},
    end:   {shape, color}
  },
  text: {left, right, top, bottom, inside}  // tên trường muốn hiện
}
```

Quy tắc chọn: duyệt từ trên xuống, **lấy quy tắc ĐẦU TIÊN khớp** với loại công
việc. Ghi đè riêng ở `task.bar` / `task.barText` có ưu tiên cao hơn.

### 6.3 `fieldSet` — Field Settings từng cột

```js
{ alData: "l|c|r",
  cat: "number|currency|date|percent|text",
  dec: 0, sep: 1, sym: "₫", symPos: "after", dateFmt: "dmy" }
```

Chỉ áp cho **cột tùy chỉnh**. Cột hệ thống bị khóa để không phá logic tính lịch.

### 6.4 `ts` — thang thời gian

```js
{ mode, unit, count, zoom, auto, size, show, sep,
  tiers: {
    top: {unit, count, label, align, tick},
    mid: {...},
    bot: {...}
  } }
```

`unit`: `day | week | month | quarter | year`.
`label`: nhãn theo lịch hoặc theo thứ tự (`ordLong`, `ordNum`, `ordNumE`…).
`show`: 1 = chỉ tầng Middle · 2 = Middle + Bottom · 3 = cả ba.

### 6.5 `print`

```js
{ paper, orient, margins, content, table, scale,
  hdr: {on, wrap, split, l, c, r, st:{l,c,r}},   // l/c/r là RICH TEXT
  ftr: {on:"end", boxes:\[{id,text,xp,y,ff,fs,wrap,al}]},
  lgd: {...}, pageNum: {on, pos}, cols: {...} }
```

\---

## 7\. UI/UX đã thống nhất

### Ribbon (học theo MS Project + Excel)

|Tab|Nhóm|
|-|-|
|**File**|Dự án · File on disk · Language|
|**Task**|Clipboard · Font · Alignment · Cells · Schedule|
|**Project**|Project information · Working time|
|**View**|Chế độ xem · Timescale · Non-working time|
|**Format Gantt Chart**|Bar Styles · Project Structure · Gridlines|
|**Help**|Guide|

* **Clipboard**: nút Paste lớn bên trái, cột Cut/Copy/Format Painter bên phải
* **Font**: hàng 1 = font + cỡ + tăng/giảm cỡ; hàng 2 = B/I/U + viền + màu nền + màu chữ
* **Alignment**: hàng 1 = căn dọc + Wrap Text; hàng 2 = căn ngang + Outdent/Indent
* **Cells**: hàng trên = thêm; hàng dưới = xóa, thẳng cột với nhau

### Thanh trạng thái (dưới cùng)

Bên trái số dòng, bên phải **Auto fit · Fit all · thanh Zoom · mức px/ngày hoặc
ngày/cột**.

### Con trỏ chuột

|Vị trí|Hình con trỏ|
|-|-|
|Trong ô bảng|Dấu cộng|
|Ô đang nhập|Chữ I|
|Đầu dòng (ô STT)|Mũi tên sang phải|
|Đầu cột (tiêu đề)|Mũi tên xuống|
|Đang kéo dòng/cột|Bàn tay nắm|
|Trên thanh công việc|Bốn mũi tên|

### Ngôn ngữ

Giao diện Việt/Anh. Nội dung dự án người dùng nhập **không dịch**.
Ngày tháng **luôn `dd/mm/yyyy`** ở mọi nơi, không theo locale máy.

\---

## 8\. Quy tắc nghiệp vụ

1. **Lịch làm việc**: chỉ tính ngày làm việc. Ngày nghỉ tuần theo `workDays`,
ngày lễ theo `holidays`. Công việc không bao giờ bắt đầu/kết thúc vào ngày nghỉ.
2. **`dur = 0` là mốc tiến độ**, vẽ hình kim cương, không có độ dài.
3. **Dòng tên rỗng bị bỏ qua** khi tính lịch (coi như dòng trống của sheet).
4. **Dòng cha tự tổng hợp**: ngày bắt đầu = sớm nhất trong các con, kết thúc =
muộn nhất. Không nhập tay được.
5. **Nhiều quan hệ phụ thuộc → lấy ngày muộn nhất.**
6. **`mStart` là ràng buộc "không sớm hơn"**: nếu muộn hơn ngày tính ra từ quan hệ
phụ thuộc thì nó thắng. Ràng buộc này **vô hình** trên giao diện — đây là nguyên
nhân thường gặp khi người dùng báo "chạy quan hệ không đúng".
7. **Chế độ `manual`** bỏ qua hoàn toàn quan hệ phụ thuộc.
8. **Vòng lặp quan hệ** được phát hiện và báo lỗi, không treo app.
9. **Dòng tổng dự án** luôn ở đầu, mang số 0, in đậm mặc định, không giảm cấp được.
10. **Auto fit** = phạm vi từ ngày sớm nhất đến muộn nhất, cộng chỗ cho nhãn chữ.
Khi bật, **Size % và cuộn vô hạn không có tác dụng** (mâu thuẫn bản chất).
11. **Chọn "Không lưu" là quyết định dứt khoát**: cờ `unsaved` bị xóa, lần mở sau
không nhắc phục hồi nữa. Mỗi mục dở dang chỉ được hỏi đúng một lần (xem 3.6).

\---

## 9\. Những quyết định quan trọng đã đưa ra

|#|Quyết định|Lý do|
|-|-|-|
|1|Một file HTML, vanilla JS, không framework|Phân phối và cập nhật chỉ cần thay một file; không cần môi trường chạy|
|2|Không tài khoản, không phân quyền|Mô hình một người – một máy, dữ liệu cục bộ|
|3|Cập nhật qua **GitHub Releases + electron-updater**, và CHỈ kênh này|Đã gỡ hẳn kênh Google Apps Script. Hai kênh song song nghĩa là hai hệ đánh số phải tự giữ cho khớp — nguồn sai lệch âm thầm|
|4|Font mặc định **Times New Roman 12** toàn bảng|Chuẩn hồ sơ xây dựng Việt Nam|
|5|Ngày **luôn dd/mm/yyyy**, tự vẽ lịch chọn ngày|Ô `<input type=date>` hiển thị theo ngôn ngữ Windows, máy cài tiếng Anh ra mm/dd/yyyy|
|6|Ô hai trạng thái (chọn / nhập)|Theo đặc tả thao tác bảng tính; nếu luôn ở chế độ nhập thì không bôi chọn vùng được|
|7|**Bỏ Shift+Space** (chọn cả dòng)|Ô luôn mở để nhập nên phím này nuốt mất dấu cách khi gõ tên|
|8|Kéo điền **không đoán liều**|Đặc tả ghi rõ: không chắc quy luật thì sao chép, không tự suy diễn|
|9|Không hiện UI cho chức năng chưa có|Không có Paste Formulas, Use fiscal year, Top Tier khi Show < 3|
|10|Auto fit **gom ngày theo cột**, không nén pixel|Nén pixel làm nhãn chồng nhau, không đọc được|
|11|Header/Footer bỏ định dạng mức-cả-ô|Lớp cũ đè lên định dạng từng đoạn, gây "tự bold"|
|12|Chụp ảnh SVG làm chuẩn trước khi sửa lõi vẽ|Cách duy nhất bắt được lỗi vẽ tinh vi; đã cứu vụ mất vạch "hôm nay"|
|13|Phát cho **người cài mới** qua bản sao trên Google Drive, cập nhật thủ công|Một số mạng nội bộ nhà thầu chặn GitHub. Bản Drive cũ **không nguy hiểm**: cài xong app tự cập nhật lên bản mới nhất, chỉ tốn thêm một lượt tải|

\---

## 10\. Những thứ ĐÃ LÀM

**Bảng nhập liệu** — đủ **26/26 mục** của đặc tả thao tác bảng tính (P0 + P1 + P2):
chọn ô/vùng/nhiều vùng, điều hướng bàn phím đầy đủ, Copy/Cut/Paste hai chiều với
Excel, Ctrl+D, Delete, Enter/Tab, F2/Esc, Ctrl+Mũi tên, Undo/Redo, chèn/xóa
dòng-cột, Tìm \& Thay thế, Ctrl+Home/End, kéo điền có đoán chuỗi, Dán đặc biệt.

**Định dạng** — B/I/U, căn ngang/dọc, font/cỡ/màu/nền, đường viền ô (No/All/
Outside/Thick + hộp More Borders), Format Painter, hiện sáng nút theo ô đang chọn.

**Biểu đồ Gantt** — bốn kiểu thanh theo bảng Bar Styles, nhãn 5 vị trí riêng từng
kiểu, ghi đè riêng từng công việc, đường quan hệ có kiểu nét và màu, Gridlines,
Non-working time, dòng tổng dự án, tự giãn dòng theo nhãn.

**Thang thời gian** — hộp Timescale 4 tab, 3 tầng, 5 đơn vị, nhãn theo lịch và
theo thứ tự (từ đầu/từ cuối), Show 1/2/3 tầng có khóa tab, Size %, Preview.

**In ấn** — khổ giấy/hướng/lề, header rich text 3 ô, footer nhiều hộp chữ ký kéo
thả, token tự điền, xem trước kiểu MS Project, chia trang theo chiều cao đo thật.

**Hạ tầng** — tự tải/tự cài bản mới qua electron-updater, nhắc lưu kiểu MS Project,
song ngữ, biểu đồ nhân lực.

**Lưu \& phục hồi** — nhắc lưu kiểu MS Project cho cả dự án chưa có file, hộp
phục hồi sau khi app đóng bất thường, không còn cảnh file cũ đè bản mới (xem 3.6).

**Kiểm thử** — **22 bộ test, 798 assertion**, chạy trên jsdom, nằm trong `tests/`.
Chạy bằng `npm test`. Xem `tests/README.md` để biết cách viết thêm và quy trình
chụp ảnh SVG.

\---

## 11\. Những thứ CHƯA LÀM

|Hạng mục|Ghi chú|
|-|-|
|**Cột `Row` / `From` / `To`** trong Bar Styles|Hiện chỉ hiển thị. Cần cơ chế nhiều thanh trên một dòng (vd thanh Baseline)|
|**Loại công việc mở rộng**|Split, Rolled Up, Deliverable — app chưa có các khái niệm này|
|**Nút mở hộp thoại nhóm** (mũi tên góc nhóm ribbon)|Cần hộp Format Cells đầy đủ trước|
|**Mũi tên đổ xuống cho Paste/Copy**|Tùy chọn hiện nằm ở menu chuột phải|
|**Use fiscal year, Size % ở Timescale**|Không có năm tài chính; Size % đã làm|
|**Đoán chuỗi nâng cao khi kéo điền**|Hiện có số, ngày, chữ+số. Chưa có chuỗi phức tạp|
|**Ký số cho file .exe**|Cần mua chứng chỉ; SmartScreen còn cảnh báo với **người cài mới**. Người cập nhật trong app không bị, vì `verifyUpdateCodeSignature` đang tắt|

\---

## 12\. Việc tiếp theo cần triển khai

Theo thứ tự ưu tiên đề xuất:

1. **Cột Row / From / To trong Bar Styles** — cho phép vẽ nhiều thanh trên một
dòng, mở đường cho thanh Baseline (so sánh kế hoạch với thực tế).
2. **Hộp thoại Format Cells đầy đủ**, rồi mới gắn mũi tên mở hộp ở góc nhóm ribbon.
3. **Baseline / tiến độ thực tế** — nhu cầu nghiệp vụ thật của QS: so sánh kế
hoạch và thực hiện. Phụ thuộc việc 1.
4. **Xuất Excel** (hiện chỉ copy TSV).

\---

## 13\. Những điều Claude Code KHÔNG được tự ý thay đổi

> Vi phạm những điều dưới đây gây hỏng dữ liệu người dùng hoặc đứt kênh cập nhật.
> Nếu thấy cần đổi, \*\*hỏi trước\*\*, không tự quyết.

### 13.1 Tuyệt đối không

|#|Điều cấm|Hậu quả nếu vi phạm|
|-|-|-|
|1|**Không khôi phục kênh Google Apps Script** (`UPDATE\_URL`, `verKey()`, `applyUpdateInfo()`) dưới bất kỳ hình thức nào|Người dùng đã quyết định bỏ hẳn kênh này. Hai kênh song song = hai hệ đánh số phải tự giữ cho khớp, sinh sai lệch âm thầm|
|2|**Không tách file HTML thành nhiều file**|Vỡ cơ chế phân phối và cập nhật|
|3|**Không thêm framework / thư viện ngoài** (React, jQuery, D3, Chart.js…)|Trái kiến trúc; app phải chạy offline không cần build|
|4|**Không đổi/xóa khóa `localStorage`** (`tiendo\_idx\_v1`, `tiendo\_cur\_v1`, `tiendo\_prj\_\*`, `tiendo\_gantt\_v1`)|Người dùng mất toàn bộ dự án đã lưu|
|5|**Không đổi cấu trúc `tasks\[]`** mà không viết đoạn chuyển đổi trong `mergeDefaults()`|Hồ sơ cũ mở lên bị hỏng|
|6|**Không đổi quy ước ID trong `preds`** (số hiển thị, không phải chỉ số mảng)|Sai lịch âm thầm, không báo lỗi. Đã từng xảy ra|
|7|**Không bỏ `pstOrdinal()` / `idxOfId()`**|Như trên|
|8|**Không đổi định dạng ngày sang locale máy**|Máy cài tiếng Anh sẽ hiện mm/dd/yyyy|
|9|**Không xóa lớp chuyển đổi dữ liệu** trong `mergeDefaults()` (cờ `_mig`, `_migOrd` cho thang thời gian; `_boldV2` cho chữ trên thanh; di trú `hl/hc/hr` → `hdr`, `fl/fc/fr` → `ftr`)|Hồ sơ cũ mất thiết lập hoặc mở lên bị hỏng|
|10|**Không đụng chuỗi IPC cập nhật** (`updates:check`, `updates:download`, `updates:quit-and-install`) nối `preload.js` ↔ `main.js` ↔ `update-service.js`|Đứt là máy người dùng không nhận được bản mới|
|11|**Không đổi `publish` trong `package.json`**; không bật lại `verifyUpdateCodeSignature` khi chưa ký mã|Cập nhật thất bại im lặng trên mọi máy|
|12|**Không bỏ `latest.yml` / `.blockmap`** khỏi asset release|`electron-updater` đọc không được, tự cập nhật chết|
|13|**Không bỏ cờ `unsaved`** trong danh mục, cũng không bỏ `closeFlow()` / `openExternalDataAsk()`|Mất cơ chế phục hồi sau khi app chết; `openExternalData()` sẽ đè bản mới trong máy bằng nội dung cũ của file, âm thầm|

### 13.2 Bắt buộc làm mỗi lần sửa

1. **Kiểm tra cú pháp**: `npm run test:syntax` (nạp phần `<script>` bằng `new Function()`).
2. **Chạy lại toàn bộ bộ test**: `npm test` — không được để bộ nào đỏ.
3. Khi phát hành: đẩy tag `vYY.M.N` (xem quy ước đánh số ngay dưới). Tag là
**nguồn duy nhất** — CI ghi `version` vào `package.json`, app đọc lại bằng
`app.getVersion()` rồi `fmtVer()` dựng nhãn hiển thị.
4. `APPVER` trong `src/index.html` chỉ là **nhãn dự phòng cho bản mở bằng trình
duyệt** (không có `app.getVersion()`). Cập nhật khi phát hành bản trình duyệt.

### 13.2b Quy ước đánh số phiên bản

```
tag / semver     hiển thị trong app
v26.8.1     →    Ver 26.08.001
v26.8.2     →    Ver 26.08.002     (cập nhật lần 2 trong tháng 8)
v26.9.1     →    Ver 26.09.001     (sang tháng — lần cập nhật RESET về 001)
v27.1.1     →    Ver 27.01.001
```

Ba phần: **2 số cuối của năm . tháng . lần cập nhật trong tháng**. Sang tháng mới
là quay lại 001. Vì `electron-updater` so sánh theo semver nên thứ tự vẫn đúng
(26.9.1 > 26.8.99). Có test canh riêng trường hợp "sang tháng, số nhỏ hơn nhưng
phải mới hơn" — đổi cách đánh số thì phải chạy lại bộ test đó.

Nhãn hiển thị ở **góc phải hàng ribbon trên cùng** (ô `#appVer`) và trong hộp
Hướng dẫn.

### 13.3 Quy trình bắt buộc khi đụng vào phần vẽ Gantt

Phần vẽ (`renderGantt`, `tierCells`, `drawTiersInto`, `buildTimeline`) là chỗ dễ
hỏng nhất và lỗi không hiện ra ngay.

```
1. Chụp ảnh chuẩn:  node tests/snap.js snap\_before.svg
2. Sửa code
3. Chụp lại:        node tests/snap.js snap\_after.svg
4. So sánh:         diff snap\_before.svg snap\_after.svg
5. Khác biệt PHẢI giải thích được. Không giải thích được = có lỗi.
```

Để chụp ảnh của bản **đã commit** làm mốc so sánh, trỏ biến môi trường sang bản đó:
`git show HEAD:src/index.html > truoc.html` rồi
`CP_APP_HTML=truoc.html node tests/snap.js snap_before.svg`.

Cách này đã bắt được: mất vạch "hôm nay", lệch ID quan hệ phụ thuộc, tier trên
biến mất khi dự án dài.

### 13.4 Nguyên tắc làm việc

* **Không sửa mò.** Tìm nguyên nhân gốc, chứng minh bằng đo đạc rồi mới sửa.
* **Viết test tái hiện lỗi TRƯỚC khi sửa**, để chắc chắn đã sửa đúng chỗ.
* **Sửa tối thiểu.** Không tiện tay tái cấu trúc phần đang chạy tốt.
* **Không thêm giao diện cho chức năng chưa làm.** Nút bấm không ra gì tệ hơn là
không có nút.
* **Báo cáo trung thực.** Làm được bao nhiêu nói bấy nhiêu; chưa kiểm chứng được
thì nói rõ chưa kiểm chứng được.

\---

## Phụ lục — File trong dự án

|File|Vai trò|
|-|-|
|`src/index.html`|**Toàn bộ ứng dụng** — một file HTML duy nhất|
|`electron/main.js`|Tiến trình chính: cửa sổ, hộp thoại file, IPC|
|`electron/preload.js`|Cầu `contextBridge` → `window.desktop`|
|`electron/update-service.js`|Bọc `electron-updater` — kiểm tra / tải / cài bản mới|
|`electron/launch.js`|Điểm vào `npm start`|
|`assets/icon.ico`|Biểu tượng cho exe và installer — sinh bằng `tools/make-icon.js`|
|`tools/make-icon.js`|Vẽ icon Gantt nhiều kích thước (16→256) ra `assets/icon.ico`|
|`.github/workflows/release.yml`|Build + phát hành khi đẩy tag `vX.Y.Z`|
|`.github/workflows/ci.yml`|Chạy `npm test` khi push lên `main` / mở PR|
|`tests/`|Bộ kiểm thử jsdom — `npm test`; xem `tests/README.md`|
|`tests/snap.js`|Chụp ảnh SVG Gantt để đối chiếu (§13.3)|
|`tests/syntax-check.js`|Kiểm tra cú pháp phần `<script>` (§13.2 #2)|
|`CLAUDE.md`|Tài liệu này|

**Lệnh thường dùng:**

```bash
npm start              # chạy thử bản desktop
npm test               # kiểm tra cú pháp + toàn bộ bộ test
npm run build:win      # build installer Windows x64 vào dist/
npm run snap -- a.svg  # chụp ảnh SVG Gantt để đối chiếu (§13.3)
```

Phát hành bản mới: `git tag vX.Y.Z && git push origin vX.Y.Z`.

