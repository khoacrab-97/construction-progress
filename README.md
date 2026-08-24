# Tiến độ thi công

Ứng dụng desktop Electron cho file HTML quản lý tiến độ thi công và biểu đồ Gantt.

## Chạy khi phát triển

```bash
npm install
npm start
```

Ứng dụng desktop tải `src/index.html` qua Electron với `contextIsolation: true` và `nodeIntegration: false`.

## Build Windows

```bash
npm run build:win
```

File build được ghi vào:

```text
dist/
```

Tên installer Windows hiện tại:

```text
Tien-do-thi-cong-Cai-dat-<version>.exe
```

## Build Và Phát Hành Qua GitHub

Phát hành chạy **theo tag**, không theo mỗi lần push. Push code thường lên `main`
chỉ kích hoạt `.github/workflows/ci.yml` (chạy `npm test`), không tạo release.

Để phát hành một bản mới:

```bash
npm test                     # phải xanh trước đã
git tag v1.0.5               # số phiên bản dạng x.y.z
git push origin v1.0.5
```

Hoặc vào tab **Actions → Build và phát hành → Run workflow**, nhập số phiên bản.

`.github/workflows/release.yml` chạy trên `windows-latest`: cài phụ thuộc, chạy bộ
test, đặt version trong `package.json` theo tag, build installer Windows x64, rồi
đẩy lên GitHub Releases. Tag là nguồn duy nhất quyết định số phiên bản — không
cần (và không nên) sửa `version` trong `package.json` bằng tay.

Release sẽ có các asset:

```text
Tien-do-thi-cong-Cai-dat-<version>.exe
Tien-do-thi-cong-Cai-dat-<version>.exe.blockmap
latest.yml
```

`latest.yml` là file `electron-updater` đọc để biết có bản mới; `.blockmap` cho
phép tải phần chênh lệch thay vì tải lại toàn bộ installer. Thiếu một trong hai,
tính năng tự cập nhật ngừng hoạt động.

## Người Dùng Mới Tải Ở Đâu

```text
https://github.com/khoacrab-97/construction-progress/releases/latest
```

Workflow luôn gắn cờ `--latest` khi tạo release nên link này luôn trỏ bản mới nhất.
Kho GitHub phải để **public** và release không được ở trạng thái draft, nếu không
cả người tải mới lẫn `electron-updater` đều đọc không được.

## Icon

Build Windows dùng:

```text
assets/icon.ico
```

File hiện tại là icon tạm sinh tự động. Khi có icon chính thức, thay đúng file này và giữ nguyên đường dẫn.

## Mở File Dự Án

Installer Windows đăng ký đuôi:

```text
.tdtc
```

là `Dự án tiến độ thi công`, nên nhấp đúp file dự án sẽ mở app và yêu cầu cửa sổ đang chạy nạp file đó.

## Ký Mã

Installer hiện chưa được ký mã. Installer Windows chưa ký có thể hiện cảnh báo Microsoft SmartScreen. Khi phát hành chính thức, cần dùng chứng chỉ ký mã Windows và cấu hình thông tin ký cho electron-builder trong môi trường build.

## Tự Động Cập Nhật

Bản đã đóng gói dùng `electron-updater` và GitHub Releases làm kênh cập nhật.
Vì bản Windows hiện chưa ký mã, `verifyUpdateCodeSignature` đang tắt cho đến khi cấu hình ký mã.

Luồng trên máy người dùng:

1. Mở app → sau 3 giây tự kiểm tra, sau đó kiểm tra lại mỗi 4 giờ.
2. Có bản mới → hiện hộp thoại và nút ⬆ trên ribbon. Bấm **Để sau** thì không bị
   nhắc lại phiên bản đó cho tới khi mở lại app.
3. Bấm **Cập nhật** → tải installer (không tự tải ngầm, luôn hỏi trước).
4. Tải xong → bấm **Khởi động lại & cài đặt** → cài im lặng trong nền rồi tự mở
   lại app. Người dùng không thấy cửa sổ trình cài đặt nào.

Kiểm tra thủ công: **Trợ giúp → 🔄 Kiểm tra cập nhật**.

Tự cập nhật chỉ chạy trong bản đã đóng gói. Chạy `npm run dev` sẽ luôn báo
"Tự động cập nhật chỉ chạy trong bản đã đóng gói" — đó là hành vi đúng.
