/* Phiên bản và kênh cập nhật (CLAUDE.md §13.1 #1, §13.2). */
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "version — verKey, APPVER, applyUpdateInfo";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const K = APP.verKey;

    t.case("APPVER đúng khuôn Ver.MMYY.DD.NNN");
    t.ok(/Ver\.\d{4}\.\d{2}\.\d{3}/.test(APP.APPVER), "APPVER = " + APP.APPVER);
    t.ok(K(APP.APPVER) > 0, "APPVER phải quy đổi được thành số so sánh");

    t.case("chuỗi không đúng khuôn quy về 0");
    t.eq(K(""), 0);
    t.eq(K(null), 0);
    t.eq(K(undefined), 0);
    t.eq(K("linh tinh"), 0);
    t.eq(K("Ver.1.2.3"), 0, "thiếu số chữ số");

    t.case("số thứ tự trong ngày tăng thì phiên bản lớn hơn");
    t.ok(K("Ver.0826.22.002") > K("Ver.0826.22.001"));

    t.case("ngày lớn hơn thì phiên bản lớn hơn");
    t.ok(K("Ver.0826.23.001") > K("Ver.0826.22.999"));

    t.case("tháng lớn hơn thì phiên bản lớn hơn");
    t.ok(K("Ver.0926.01.001") > K("Ver.0826.31.999"));

    t.case("năm lớn hơn thắng tất cả — không so sánh theo thứ tự chữ");
    t.ok(K("Ver.0127.01.001") > K("Ver.1226.31.999"), "01/2027 mới hơn 12/2026");

    t.case("hai chuỗi giống nhau thì bằng nhau");
    t.eq(K("Ver.0826.22.001"), K("Ver.0826.22.001"));
    t.eq(K("Tiến độ thi công Ver.0826.22.001"), K("Ver.0826.22.001"), "tiền tố không ảnh hưởng");

    t.case("applyUpdateInfo bỏ qua dữ liệu rỗng hoặc hỏng");
    t.eq(APP.applyUpdateInfo(null), false);
    t.eq(APP.applyUpdateInfo({}), false);
    t.eq(APP.applyUpdateInfo({ ver: "" }), false);

    t.case("applyUpdateInfo bỏ qua bản cũ hơn hoặc bằng");
    t.eq(APP.applyUpdateInfo({ ver: APP.APPVER }), false, "bằng phiên bản hiện tại");
    t.eq(APP.applyUpdateInfo({ ver: "Tiến độ thi công Ver.0101.01.001" }), false, "cũ hơn nhiều");

    t.case("applyUpdateInfo báo có bản mới khi phiên bản lớn hơn");
    t.eq(APP.applyUpdateInfo({ ver: "Tiến độ thi công Ver.9999.31.999", note: "thử" }), true);

    t.case("nút cập nhật hiện lên khi có bản mới");
    const btn = APP.__dom.window.document.querySelector("#updBtn");
    t.ok(btn, "nút #updBtn tồn tại trong DOM");
    t.eq(btn.style.display, "inline-block");
    t.ok(btn.textContent.indexOf("Ver.") >= 0, "nút hiện số phiên bản: " + btn.textContent);
  } finally { closeApp(APP); }
};
