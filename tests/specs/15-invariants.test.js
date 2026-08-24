/* Ràng buộc kiến trúc — kiểm ở mức MÃ NGUỒN, không phải hành vi.
   Đây là hàng rào cho những điều CLAUDE.md §13.1 cấm tự ý thay đổi. */
const fs = require("fs");
const path = require("path");
const { loadApp, closeApp, APP_HTML } = require("../helpers/env");

const ROOT = path.join(__dirname, "..", "..");

exports.name = "invariants — ràng buộc kiến trúc §13.1";
exports.run = function (t) {
  const src = fs.readFileSync(APP_HTML, "utf8");

  t.case("§13.1 #2 — toàn bộ ứng dụng vẫn nằm trong MỘT file HTML");
  const srcFiles = fs.readdirSync(path.join(ROOT, "src"));
  t.eq(srcFiles, ["index.html"], "thư mục src chỉ được có index.html");
  t.eq((src.match(/<script/g) || []).length, 1, "đúng một thẻ <script>");
  t.eq((src.match(/<script src=/g) || []).length, 0, "không nạp script từ file ngoài");

  t.case("§13.1 #3 — không có framework/thư viện ngoài");
  ["react", "vue.js", "jquery", "d3.min", "chart.js", "cdn.jsdelivr", "unpkg.com", "cdnjs."]
    .forEach(lib => t.ok(src.toLowerCase().indexOf(lib) < 0, "không thấy " + lib));

  t.case("không tải tài nguyên ngoài — app phải chạy offline");
  const externals = (src.match(/(?:src|href)="https?:\/\/[^"]*"/g) || []);
  t.eq(externals, [], "không có src/href http: " + externals.join(", "));

  t.case("§13.1 #1 — UPDATE_URL không được để trống");
  const m = src.match(/const UPDATE_URL = "([^"]*)"/);
  t.ok(!!m, "vẫn khai báo const UPDATE_URL");
  t.ok(!!(m && m[1].trim()), "UPDATE_URL có giá trị");
  t.ok(!!(m && /^https?:\/\//.test(m[1])), "UPDATE_URL là một URL hợp lệ");

  t.case("§13.1 #7 — pstOrdinal() và idxOfId() vẫn còn");
  t.ok(src.indexOf("function pstOrdinal(") >= 0);
  t.ok(src.indexOf("function idxOfId(") >= 0);
  t.ok(src.indexOf("function hasPST(") >= 0);

  t.case("§13.1 #9 — lớp chuyển đổi dữ liệu vẫn còn");
  t.ok(src.indexOf("function mergeDefaults(") >= 0);
  t.ok(src.indexOf("_boldV2") >= 0, "cờ nâng cấp chữ đậm trên thanh");

  t.case("§13.1 #8 — ngày tháng không bao giờ theo locale của máy");
  t.eq((src.match(/type="date"/g) || []).length, 0, 'không có <input type="date">');
  t.ok(src.indexOf("function dpOpen(") >= 0, "vẫn dùng lịch chọn ngày tự vẽ");
  src.split("toLocale").slice(1).forEach((chunk, i) => {
    const call = chunk.slice(0, 60).split("\n")[0];
    t.ok(call.indexOf("vi-VN") >= 0, "toLocale* thứ " + (i + 1) + " phải ghim locale: toLocale" + call);
  });

  t.case("§9 #4 — font mặc định Times New Roman cỡ 12");
  const APP = loadApp({ silent: true });
  try {
    const f = APP.defaultFont();
    t.ok(/Times New Roman/.test(f.family), "family = " + f.family);
    t.eq(f.size, 12);

    t.case("§13.2 #2 — phần <script> nạp được, không lỗi cú pháp");
    t.eq(APP.__errors.length, 0, "jsdom không báo lỗi khi chạy app");
    t.ok(!!APP.state, "app khởi động tới trạng thái dùng được");

    t.case("giới hạn 500 dòng còn nguyên");
    t.ok(src.split(" ").join("").indexOf("MAXROWS=500") >= 0, "giới hạn 500 dòng");
  } finally { closeApp(APP); }

  t.case("kênh cập nhật desktop (electron-updater + GitHub Releases) còn nguyên");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  t.ok(!!pkg.dependencies["electron-updater"], "còn phụ thuộc electron-updater");
  t.eq(pkg.main, "electron/main.js");
  t.ok(Array.isArray(pkg.build.publish) && pkg.build.publish[0].provider === "github", "kênh phát hành GitHub");
  t.ok(fs.existsSync(path.join(ROOT, "electron", "update-service.js")), "còn electron/update-service.js");

  t.case("đuôi file dự án .tdtc vẫn được đăng ký");
  t.ok(pkg.build.fileAssociations.some(a => a.ext === "tdtc"));
};
