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

Khi push lên `main`, `.github/workflows/release.yml` sẽ chạy trên `windows-latest`.
Workflow tạo version riêng từ major/minor trong package và số lần chạy GitHub,
build installer Windows x64, rồi đẩy lên GitHub Releases.

Release sẽ có các asset:

```text
Tien-do-thi-cong-Cai-dat-<version>.exe
Tien-do-thi-cong-Cai-dat-<version>.exe.blockmap
latest.yml
```

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
