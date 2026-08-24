/* Số phiên bản và cách hiển thị.

   Quy ước: Ver <2 số cuối năm>.<tháng>.<lần cập nhật trong tháng>
   ví dụ Ver 26.08.001 — sang tháng mới thì lần cập nhật reset về 001.
   Nguồn duy nhất là semver của gói cài (26.8.1), lấy từ tag phát hành.
   So sánh phiên bản do electron-updater lo (semver) — app không tự so nữa. */
const fs = require("fs");
const path = require("path");
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "version — định dạng Ver YY.MM.NNN, hiển thị";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const F = APP.fmtVer;

    t.case("semver của gói cài → nhãn hiển thị");
    t.eq(F("26.8.1"), "Ver 26.08.001", "tháng và lần cập nhật được đệm số 0");
    t.eq(F("26.8.12"), "Ver 26.08.012");
    t.eq(F("26.12.345"), "Ver 26.12.345");
    t.eq(F("26.9.1"), "Ver 26.09.001", "sang tháng mới, lần cập nhật về 001");
    t.eq(F("27.1.1"), "Ver 27.01.001", "sang năm mới");
    t.eq(F("2026.8.1"), "Ver 26.08.001", "năm 4 chữ số vẫn rút về 2 số cuối");
    t.eq(F("1.0.6"), "Ver 01.00.006", "bản cũ theo hệ 1.0.x vẫn dựng được nhãn");

    t.case("chuỗi rác không tạo ra nhãn bịa");
    t.eq(F(""), "");
    t.eq(F(null), "");
    t.eq(F(undefined), "");
    t.eq(F("linh tinh"), "");

    t.case("APPVER dự phòng đúng khuôn đang dùng");
    t.ok(/Ver \d{2}\.\d{2}\.\d{3}/.test(APP.APPVER), "APPVER = " + APP.APPVER);
    t.eq(APP.appVersionLabel(), APP.APPVER.replace("Tiến độ thi công ", ""),
      "nhãn hiển thị là phần Ver… của APPVER");

    t.case("số phiên bản trong package.json khớp quy ước");
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"));
    t.ok(/^\d{2}\.\d{1,2}\.\d{1,3}$/.test(pkg.version), "version = " + pkg.version);
    t.ok(F(pkg.version).length > 0, "dựng được nhãn từ version: " + F(pkg.version));
    const mm = +pkg.version.split(".")[1];
    t.ok(mm >= 1 && mm <= 12, "phần tháng phải là 1..12, đang là " + mm);

    t.case("thứ tự phiên bản theo semver vẫn đúng ở chỗ dễ sai nhất");
    // Quy ước reset khiến số NHỎ ĐI khi sang tháng — electron-updater so theo
    // semver nên vẫn đúng, nhưng đây là chỗ phải canh mỗi khi đổi cách đánh số.
    const semver = v => v.split(".").map(Number);
    const gt = (a, b) => {
      const A = semver(a), B = semver(b);
      for (let i = 0; i < 3; i++) { if (A[i] !== B[i]) return A[i] > B[i]; }
      return false;
    };
    t.ok(gt("26.8.2", "26.8.1"), "cùng tháng, lần sau lớn hơn");
    t.ok(gt("26.9.1", "26.8.99"), "sang tháng: 26.9.1 phải MỚI HƠN 26.8.99");
    t.ok(gt("27.1.1", "26.12.999"), "sang năm");
    t.ok(gt("26.8.1", "1.0.6"), "hệ mới luôn mới hơn hệ 1.0.x cũ");

    t.case("nhãn phiên bản hiện ở góc phải hàng ribbon trên cùng");
    const doc = APP.__dom.window.document;
    const badge = doc.querySelector("#appVer");
    t.ok(!!badge, "có ô #appVer");
    t.ok(/Ver \d{2}\.\d{2}\.\d{3}/.test(badge.textContent), "nội dung: " + badge.textContent);
    const row = badge.closest(".hrow1");
    t.ok(!!row, "nằm trong hàng ribbon trên cùng");
    t.eq(row.lastElementChild.id, "appVer", "là phần tử ngoài cùng bên phải của hàng");

    t.case("sự kiện 'có bản mới' ghi nhận phiên bản và không chặn màn hình");
    APP.handleDesktopUpdateEvent({ type: "available", version: "26.8.2" });
    t.eq(APP.__dom.window._updVer, "26.8.2", "nhớ phiên bản đang tải");
    t.eq(APP.__dom.window._desktopUpdateAvailable, true);
    t.eq(doc.querySelector("#updOverlay").style.display, "none",
      "luồng tự động KHÔNG bật hộp thoại");

    t.case("hộp thoại thủ công hiện nút cập nhật trên ribbon");
    APP.showDesktopUpdateModal("26.8.2");
    const btn = doc.querySelector("#updBtn");
    t.ok(btn, "nút #updBtn tồn tại trong DOM");
    t.eq(btn.style.display, "inline-block");
    t.ok(btn.textContent.indexOf("26.8.2") >= 0, "nút hiện số phiên bản: " + btn.textContent);
    t.eq(doc.querySelector("#updOverlay").style.display, "flex", "hộp thoại mở khi gọi tay");
  } finally { closeApp(APP); }
};
