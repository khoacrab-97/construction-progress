/* Khóa localStorage là hợp đồng với dữ liệu người dùng — đổi/xóa = mất dự án
   (CLAUDE.md §5, §13.1 #4). */
const fs = require("fs");
const { loadApp, closeApp, APP_HTML } = require("../helpers/env");

const REQUIRED_KEYS = [
  "tiendo_idx_v1",   // danh mục dự án
  "tiendo_cur_v1",   // dự án đang mở
  "tiendo_prj_",     // tiền tố state từng dự án
  "tiendo_gantt_v1", // khóa bản cũ — giữ để chuyển đổi
  "tiendo_lang_v1"   // ngôn ngữ giao diện
];

exports.name = "storage — khóa localStorage, danh mục dự án";
exports.run = function (t) {
  t.case("mọi khóa bắt buộc còn nguyên trong mã nguồn");
  const src = fs.readFileSync(APP_HTML, "utf8");
  REQUIRED_KEYS.forEach(k => t.ok(src.indexOf('"' + k + '"') >= 0, "còn khóa " + k));

  const APP = loadApp({ silent: true });
  try {
    const LS = APP.__dom.window.localStorage;

    t.case("prjKey ghép đúng tiền tố");
    t.eq(APP.prjKey("abc"), "tiendo_prj_abc");
    t.eq(APP.prjKey("p123"), "tiendo_prj_p123");

    t.case("saveIndex/loadIndex đi vòng qua đúng khóa tiendo_idx_v1");
    const ix = [{ id: "p1", name: "Dự án A", updated: 1 }, { id: "p2", name: "Dự án B", updated: 2 }];
    APP.saveIndex(ix);
    t.eq(JSON.parse(LS.getItem("tiendo_idx_v1")).length, 2, "ghi đúng khóa");
    t.eq(APP.loadIndex(), ix);

    t.case("danh mục hỏng thì trả mảng rỗng, không ném lỗi");
    LS.setItem("tiendo_idx_v1", "{không phải JSON");
    t.eq(APP.loadIndex(), []);
    LS.removeItem("tiendo_idx_v1");
    t.eq(APP.loadIndex(), []);

    t.case("mỗi dự án lưu ở khóa riêng, ghi cả dự án đang mở");
    APP.newProject();
    const id = APP.currentId;
    t.ok(!!id, "có id dự án");
    t.ok(LS.getItem("tiendo_prj_" + id) !== null, "state được lưu ở tiendo_prj_" + id);
    t.eq(LS.getItem("tiendo_cur_v1"), id, "id dự án đang mở được ghi lại");
    t.ok(APP.loadIndex().some(p => p.id === id), "dự án có mặt trong danh mục");

    t.case("state lưu xuống đọc lại được và giữ đúng các trường gốc");
    const saved = JSON.parse(LS.getItem("tiendo_prj_" + id));
    t.ok(Array.isArray(saved.tasks), "tasks là mảng");
    t.ok(/^\d{4}-\d{2}-\d{2}$/.test(saved.start), "start lưu dạng ISO: " + saved.start);
    t.eq(saved.workDays.length, 7, "workDays đủ 7 ngày");
    t.ok(Array.isArray(saved.holidays));

    t.case("tạo dự án thứ hai không đè lên dự án thứ nhất");
    APP.newProject();
    const id2 = APP.currentId;
    t.ne(id2, id, "id mới khác id cũ");
    t.ok(LS.getItem("tiendo_prj_" + id) !== null, "dự án cũ vẫn còn");
    t.ok(LS.getItem("tiendo_prj_" + id2) !== null, "dự án mới đã lưu");
    t.eq(APP.loadIndex().length, 2);

    t.case("giới hạn số dòng MAXROWS = 500 vẫn được giữ");
    t.ok(src.split(" ").join("").indexOf("MAXROWS=500") >= 0, "hằng số MAXROWS còn nguyên");
  } finally { closeApp(APP); }
};
