/* Số phiên bản và kênh cập nhật (CLAUDE.md §13.1 #1, §13.2).

   Quy ước hiển thị: Ver <2 số cuối năm>.<tháng>.<lần cập nhật trong tháng>
   ví dụ Ver 26.08.001 — sang tháng mới thì lần cập nhật reset về 001.
   Nguồn duy nhất là số phiên bản gói cài (semver 26.8.1) lấy từ tag. */
const fs = require("fs");
const path = require("path");
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "version — định dạng Ver YY.MM.NNN, verKey";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const K = APP.verKey, F = APP.fmtVer;

    t.case("semver của gói cài → nhãn hiển thị");
    t.eq(F("26.8.1"), "Ver 26.08.001", "tháng và lần cập nhật được đệm số 0");
    t.eq(F("26.8.12"), "Ver 26.08.012");
    t.eq(F("26.12.345"), "Ver 26.12.345");
    t.eq(F("26.9.1"), "Ver 26.09.001", "sang tháng mới, lần cập nhật về 001");
    t.eq(F("27.1.1"), "Ver 27.01.001", "sang năm mới");
    t.eq(F("2026.8.1"), "Ver 26.08.001", "năm 4 chữ số vẫn rút về 2 số cuối");

    t.case("chuỗi rác không tạo ra nhãn bịa");
    t.eq(F(""), "");
    t.eq(F(null), "");
    t.eq(F("linh tinh"), "");

    t.case("APPVER đúng khuôn đang dùng");
    t.ok(/Ver \d{2}\.\d{2}\.\d{3}/.test(APP.APPVER), "APPVER = " + APP.APPVER);
    t.ok(K(APP.APPVER) > 0, "APPVER phải quy đổi được thành số so sánh");
    t.eq(APP.appVersionLabel(), APP.APPVER.replace("Tiến độ thi công ", ""),
      "nhãn hiển thị là phần Ver… của APPVER");

    t.case("số phiên bản trong package.json khớp quy ước");
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"));
    t.ok(/^\d{2}\.\d{1,2}\.\d{1,3}$/.test(pkg.version), "version = " + pkg.version);
    t.ok(F(pkg.version).length > 0, "dựng được nhãn từ version: " + F(pkg.version));
    const mm = +pkg.version.split(".")[1];
    t.ok(mm >= 1 && mm <= 12, "phần tháng phải là 1..12, đang là " + mm);

    t.case("chuỗi không đúng khuôn quy về 0");
    t.eq(K(""), 0);
    t.eq(K(null), 0);
    t.eq(K("linh tinh"), 0);

    t.case("lần cập nhật trong tháng tăng thì phiên bản lớn hơn");
    t.ok(K("Ver 26.08.002") > K("Ver 26.08.001"));
    t.ok(K("Ver 26.08.010") > K("Ver 26.08.009"));

    t.case("sang tháng mới lớn hơn, dù lần cập nhật reset về 001");
    t.ok(K("Ver 26.09.001") > K("Ver 26.08.999"), "đây chính là chỗ dễ sai nhất của quy ước reset");

    t.case("sang năm mới thắng tất cả");
    t.ok(K("Ver 27.01.001") > K("Ver 26.12.999"));

    t.case("bản theo khuôn mới luôn mới hơn bản đã phát hành theo khuôn cũ");
    t.ok(K("Ver 26.08.001") > K("Ver.0826.24.004"), "máy đang chạy bản cũ vẫn nhận được bản mới");
    t.ok(K("Ver 26.08.001") > K("Tiến độ thi công Ver.0726.13.026"));

    t.case("tiền tố không ảnh hưởng, hai chuỗi giống nhau thì bằng nhau");
    t.eq(K("Tiến độ thi công Ver 26.08.001"), K("Ver 26.08.001"));

    t.case("applyUpdateInfo bỏ qua dữ liệu rỗng hoặc hỏng");
    t.eq(APP.applyUpdateInfo(null), false);
    t.eq(APP.applyUpdateInfo({}), false);
    t.eq(APP.applyUpdateInfo({ ver: "" }), false);

    t.case("applyUpdateInfo bỏ qua bản cũ hơn hoặc bằng");
    t.eq(APP.applyUpdateInfo({ ver: APP.APPVER }), false, "bằng phiên bản hiện tại");
    t.eq(APP.applyUpdateInfo({ ver: "Tiến độ thi công Ver 01.01.001" }), false, "cũ hơn nhiều");

    t.case("applyUpdateInfo báo có bản mới khi phiên bản lớn hơn");
    t.eq(APP.applyUpdateInfo({ ver: "Tiến độ thi công Ver 99.12.999", note: "thử" }), true);

    t.case("nhãn phiên bản hiện ở góc phải hàng ribbon trên cùng");
    const doc = APP.__dom.window.document;
    const badge = doc.querySelector("#appVer");
    t.ok(!!badge, "có ô #appVer");
    t.ok(/Ver \d{2}\.\d{2}\.\d{3}/.test(badge.textContent), "nội dung: " + badge.textContent);
    const row = badge.closest(".hrow1");
    t.ok(!!row, "nằm trong hàng ribbon trên cùng");
    t.eq(row.lastElementChild.id, "appVer", "là phần tử ngoài cùng bên phải của hàng");

    t.case("nút cập nhật hiện lên khi có bản mới");
    const btn = doc.querySelector("#updBtn");
    t.ok(btn, "nút #updBtn tồn tại trong DOM");
    t.eq(btn.style.display, "inline-block");
    t.ok(btn.textContent.indexOf("Ver") >= 0, "nút hiện số phiên bản: " + btn.textContent);
  } finally { closeApp(APP); }
};
