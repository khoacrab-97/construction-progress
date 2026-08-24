/* Kênh cập nhật desktop: electron-updater + GitHub Releases.
   Đứt kênh này = máy người dùng không bao giờ nhận được bản mới, và lỗi
   không hiện ra cho tới khi đã phát hành. Kiểm ở mức mã nguồn + cấu hình. */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { loadApp, closeApp, APP_HTML } = require("../helpers/env");

const ROOT = path.join(__dirname, "..", "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

exports.name = "update-channel — phát hành và tự cập nhật";
exports.run = function (t) {
  const pkg = JSON.parse(read("package.json"));
  const svc = read("electron/update-service.js");
  const preload = read("electron/preload.js");
  const main = read("electron/main.js");
  const html = fs.readFileSync(APP_HTML, "utf8");

  t.case("nguồn phát hành trỏ đúng GitHub Releases");
  const pub = pkg.build.publish[0];
  t.eq(pub.provider, "github");
  t.ok(!!pub.owner && !!pub.repo, "có owner/repo: " + pub.owner + "/" + pub.repo);
  t.eq(pub.releaseType, "release", "không phải draft — bản draft thì electron-updater đọc không được");

  t.case("bản Windows chấp nhận installer chưa ký mã");
  t.eq(pkg.build.win.verifyUpdateCodeSignature, false,
    "còn bật thì bản chưa ký sẽ bị từ chối khi cập nhật");

  t.case("tên file installer có kèm số phiên bản");
  t.ok(pkg.build.nsis.artifactName.indexOf("${version}") >= 0,
    "artifactName: " + pkg.build.nsis.artifactName);

  t.case("chuỗi IPC cập nhật nối đủ ba chặng: preload → main → service");
  ["updates:check", "updates:download", "updates:quit-and-install"].forEach(ch => {
    t.ok(preload.indexOf('"' + ch + '"') >= 0, "preload có " + ch);
    t.ok(main.indexOf('"' + ch + '"') >= 0, "main có " + ch);
  });
  ["checkForUpdates", "downloadUpdate", "quitAndInstall"].forEach(fn => {
    t.ok(svc.indexOf(fn) >= 0, "update-service có " + fn);
  });

  t.case("TỰ ĐỘNG: tải ngay khi có bản mới, người dùng không phải bấm gì");
  t.ok(/autoUpdater\.autoDownload\s*=\s*true/.test(svc), "autoDownload phải bật");
  t.ok(/autoInstallOnAppQuit\s*=\s*true/.test(svc),
    "lưới an toàn: chưa kịp cài lúc đang chạy thì cài khi thoát app");

  t.case("cài đặt im lặng rồi tự mở lại app");
  const qi = svc.match(/autoUpdater\.quitAndInstall\(([^)]*)\)/);
  t.ok(!!qi, "có gọi quitAndInstall");
  t.eq(qi && qi[1].replace(/\s/g, ""), "true,true",
    "tham số phải là (isSilent=true, isForceRunAfter=true): thiếu cờ /S thì trình cài NSIS hiện cửa sổ");

  t.case("tiến trình chính đẩy sự kiện tải/cài xuống giao diện");
  ["update-available", "download-progress", "update-downloaded", "error"].forEach(ev =>
    t.ok(svc.indexOf('"' + ev + '"') >= 0, "update-service lắng nghe " + ev));
  t.ok(main.indexOf('"updates:event"') >= 0, "main gửi updates:event");
  t.ok(preload.indexOf('"updates:event"') >= 0, "preload nhận updates:event");
  t.ok(preload.indexOf("onUpdateEvent") >= 0, "preload mở API onUpdateEvent");
  t.ok(html.indexOf("window.desktop.onUpdateEvent") >= 0, "giao diện có đăng ký nhận sự kiện");
  t.ok(html.indexOf("function handleDesktopUpdateEvent") >= 0, "giao diện có hàm xử lý sự kiện");

  t.case("tải xong thì tự cài — nhưng KHÔNG nuốt mất bài đang làm dở");
  t.ok(html.indexOf("function autoInstallDesktopUpdate") >= 0, "có hàm tự cài");
  const auto = html.slice(html.indexOf("async function autoInstallDesktopUpdate"));
  const body = auto.slice(0, auto.indexOf("function checkUpdate"));
  t.ok(body.indexOf("isDiskDirty()") >= 0, "phải kiểm tra thay đổi chưa lưu trước khi thoát");
  t.ok(body.indexOf("guardUnsavedAsync") >= 0, "còn thay đổi thì hỏi lưu trước");
  t.ok(body.indexOf("quitAndInstall") >= 0, "sau đó mới cài và khởi động lại");

  t.case("renderer kiểm tra cập nhật lúc khởi động VÀ định kỳ");
  t.ok(/setTimeout\(\(\) => checkUpdate\(false\), 3000\)/.test(html), "kiểm tra sau khi mở app");
  t.ok(/setInterval\(/.test(html) && html.indexOf("UPDATE_EVERY_MS") >= 0,
    "có kiểm tra lại định kỳ — app thường mở liên tục nhiều ngày");
  const every = html.match(/UPDATE_EVERY_MS = ([^;]+);/);
  t.ok(!!every, "khai báo chu kỳ kiểm tra");
  const ms = eval(every[1]);
  t.ok(ms >= 30 * 60 * 1000, "chu kỳ không được quá dày (" + Math.round(ms / 60000) + " phút)");
  t.ok(ms <= 24 * 60 * 60 * 1000, "chu kỳ không được quá thưa");

  t.case("kiểm tra tự động KHÔNG chặn màn hình bằng hộp thoại");
  t.ok(html.indexOf("if (manual) showDesktopUpdateModal(") >= 0,
    "hộp thoại chỉ mở khi người dùng tự bấm Kiểm tra cập nhật");

  t.case("workflow phát hành chạy theo tag, không theo mỗi lần push main");
  const rel = yaml.load(read(".github/workflows/release.yml"));
  const on = rel.on || rel[true];   // YAML đọc `on:` thành khóa true
  t.ok(!!(on.push && on.push.tags), "kích hoạt bằng tag");
  t.eq(on.push.branches, undefined, "KHÔNG kích hoạt theo nhánh — push main không được tạo release");
  t.ok(!!on.workflow_dispatch, "vẫn chạy tay được");

  t.case("workflow phát hành chạy bộ test trước khi build");
  const steps = rel.jobs.release.steps;
  const iTest = steps.findIndex(s => (s.run || "").indexOf("npm test") >= 0);
  const iBuild = steps.findIndex(s => (s.run || "").indexOf("build:win") >= 0);
  t.ok(iTest >= 0, "có bước npm test");
  t.ok(iBuild >= 0, "có bước build");
  t.ok(iTest < iBuild, "test phải chạy TRƯỚC build, không để bản đỏ lọt lên Releases");

  t.case("workflow phát hành đủ ba asset electron-updater cần");
  const text = read(".github/workflows/release.yml");
  ["latest.yml", ".blockmap", "app-update.yml"].forEach(a =>
    t.ok(text.indexOf(a) >= 0, "có kiểm tra " + a));

  t.case("có bản sao TÊN CỐ ĐỊNH cho link tải của người cài mới");
  t.ok(text.indexOf("Tien-do-thi-cong-Setup.exe") >= 0, "workflow tạo bản sao tên cố định");
  t.ok(text.indexOf("Copy-Item $installer $stable") >= 0, "sao chép từ installer vừa build");
  t.ok(text.indexOf("$stable") >= 0 && text.indexOf("gh release create $tag $installer $blockmap $latest $stable") >= 0,
    "bản sao được upload lên release");

  t.case("có workflow kiểm thử riêng cho push lên main");
  const ci = yaml.load(read(".github/workflows/ci.yml"));
  const onCi = ci.on || ci[true];
  t.ok(!!(onCi.push && onCi.push.branches), "chạy khi push lên nhánh");
  t.ok(ci.jobs.test.steps.some(s => (s.run || "").indexOf("npm test") >= 0), "có chạy npm test");

  t.case("đuôi file dự án .tdtc vẫn được đăng ký");
  t.ok(pkg.build.fileAssociations.some(a => a.ext === "tdtc"));

  t.case("icon có đủ kích thước nhỏ — Windows không phải thu nhỏ ảnh 256px");
  const ico = fs.readFileSync(path.join(ROOT, "assets", "icon.ico"));
  t.eq(ico.readUInt16LE(2), 1, "là tệp .ico hợp lệ");
  const n = ico.readUInt16LE(4);
  const sizes = [];
  for (let i = 0; i < n; i++) sizes.push(ico[6 + i * 16] || 256);
  t.ok(n >= 4, "có " + n + " kích thước: " + sizes.join(", "));
  t.ok(sizes.indexOf(16) >= 0, "có 16px cho thanh taskbar");
  t.ok(sizes.indexOf(32) >= 0, "có 32px cho biểu tượng desktop");
  t.ok(sizes.indexOf(256) >= 0, "có 256px — electron-builder yêu cầu");

  t.case("app vẫn khởi động bình thường khi không có tầng desktop (bản trình duyệt)");
  const APP = loadApp({ silent: true });
  try {
    t.ok(!!APP.state, "khởi động được");
    t.eq(APP.__errors.length, 0, "không lỗi JS");
    t.ok(typeof APP.checkUpdate === "function", "vẫn có hàm kiểm tra cập nhật dự phòng");
  } finally { closeApp(APP); }
};
