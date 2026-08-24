/* Copy/Paste hai chiều với Excel bằng định dạng TSV (CLAUDE.md §3.1 §10). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "clipboard — dán TSV từ Excel, copy bảng ra TSV";

/* Cột mặc định: 0=STT 1=Tên 2=Thời gian 3=Bắt đầu 4=Kết thúc 5=Quan hệ 6=Nhân lực */
const C_NAME = 1, C_DUR = 2, C_START = 3, C_FINISH = 4, C_PREDS = 5, C_RES = 6;

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("dán một khối ô từ Excel vào các cột tương ứng");
    makeState(APP, { tasks: [{ name: "", dur: 0 }, { name: "", dur: 0 }] });
    APP.renderAll();
    let n = APP.applyPaste(0, C_NAME, [
      ["Đào móng", "3"],
      ["Đổ bê tông", "2"]
    ]);
    t.eq(n, 4, "4 ô được dán");
    t.eq(APP.state.tasks[0].name, "Đào móng");
    t.eq(APP.state.tasks[0].dur, 3);
    t.eq(APP.state.tasks[1].name, "Đổ bê tông");
    t.eq(APP.state.tasks[1].dur, 2);

    t.case("dán vượt quá số dòng hiện có thì tự thêm dòng");
    makeState(APP, { tasks: [{ name: "", dur: 0 }] });
    APP.renderAll();
    APP.applyPaste(0, C_NAME, [["A"], ["B"], ["C"]]);
    t.eq(APP.state.tasks.length, 3);
    t.eq(APP.state.tasks.map(x => x.name), ["A", "B", "C"]);

    t.case("dán cột Thời gian: bỏ chữ, giữ số, không nhận số âm");
    makeState(APP, { tasks: [{ name: "A" }, { name: "B" }, { name: "C" }] });
    APP.renderAll();
    APP.applyPaste(0, C_DUR, [["5 ngày"], ["0"], ["-3"]]);
    t.eq(APP.state.tasks[0].dur, 5, "'5 ngày' → 5");
    t.eq(APP.state.tasks[1].dur, 0, "0 = mốc tiến độ");
    t.eq(APP.state.tasks[2].dur, 0, "số âm bị ép về 0");

    t.case("dán cột Bắt đầu: chuẩn hóa về dd/mm/yyyy");
    makeState(APP, { tasks: [{ name: "A" }, { name: "B" }, { name: "C" }] });
    APP.renderAll();
    APP.applyPaste(0, C_START, [["5/1/2026"], ["2026-01-09"], ["linh tinh"]]);
    t.eq(APP.state.tasks[0].mStart, "05/01/2026", "đệm số 0");
    t.eq(APP.state.tasks[1].mStart, "09/01/2026", "ISO cũng nhận, vẫn lưu dd/mm/yyyy");
    t.eq(APP.state.tasks[2].mStart, "", "giá trị rác không được nhận");

    t.case("dán ô ngày rỗng thì xóa ràng buộc");
    makeState(APP, { tasks: [{ name: "A", mStart: "09/01/2026" }] });
    APP.renderAll();
    APP.applyPaste(0, C_START, [[""]]);
    t.eq(APP.state.tasks[0].mStart, "");

    t.case("cột Kết thúc là cột tính toán — dán vào bị bỏ qua để giữ thẳng hàng");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    const beforeFinish = JSON.stringify(APP.state.tasks[0]);
    APP.applyPaste(0, C_FINISH, [["31/12/2030"]]);
    t.eq(JSON.stringify(APP.state.tasks[0]), beforeFinish, "không có gì thay đổi");

    t.case("dán cả một bảng từ Excel gồm nhiều cột");
    makeState(APP, { tasks: [{ name: "" }] });
    APP.renderAll();
    n = APP.applyPaste(0, C_NAME, [
      ["Đào móng", "3", "", "", "", "10"],
      ["Đổ bê tông", "2", "", "", "1", "Thợ nề[8]"]
    ]);
    t.eq(APP.state.tasks[1].preds, "1");
    t.eq(APP.state.tasks[1].res, "Thợ nề[8]");
    t.eq(APP.state.tasks[0].res, "10");
    t.ok(n >= 8, "đã dán " + n + " ô");

    t.case("dán vào cột STT bị đẩy sang cột Tên, không phá số thứ tự");
    makeState(APP, { tasks: [{ name: "" }] });
    APP.renderAll();
    APP.applyPaste(0, 0, [["Việc mới"]]);
    t.eq(APP.state.tasks[0].name, "Việc mới");

    t.case("dán cắt bỏ khoảng trắng thừa");
    makeState(APP, { tasks: [{ name: "" }] });
    APP.renderAll();
    APP.applyPaste(0, C_NAME, [["  Đào móng  "]]);
    t.eq(APP.state.tasks[0].name, "Đào móng");

    t.case("dán vào cột tùy chỉnh");
    makeState(APP, { tasks: [{ name: "A" }], customCols: [{ id: "cc1", name: "Khối lượng" }] });
    APP.renderAll();
    const ccIdx = APP.colIdxOf("cc1");
    t.ok(ccIdx > 0, "cột tùy chỉnh có mặt trong colOrder");
    APP.applyPaste(0, ccIdx, [["1250 m3"]]);
    t.eq(APP.state.tasks[0].custom.cc1, "1250 m3");

    t.case("copy bảng ra TSV: có dòng tiêu đề và đúng số cột");
    makeState(APP, {
      tasks: [
        { name: "Đào móng", dur: 3, res: "10" },
        { name: "Đổ bê tông", dur: 2, preds: "1" }
      ]
    });
    APP.renderAll();
    const cols = APP.printCols();
    const tsv = tsvOf(APP);
    const lines = tsv.split("\n");
    t.eq(lines.length, 3, "1 dòng tiêu đề + 2 dòng công việc");
    t.eq(lines[0].split("\t").length, cols.length, "số cột khớp");
    t.ok(lines[0].indexOf("Tên công việc") >= 0, "tiêu đề: " + lines[0]);

    t.case("copy bảng ra TSV: nội dung dòng đúng, ngày dd/mm/yyyy");
    const r1 = lines[1].split("\t");
    t.eq(r1[0], "1", "STT hiển thị");
    t.eq(r1[1], "Đào móng");
    t.eq(r1[2], "3");
    t.eq(r1[3], "05/01/2026", "ngày bắt đầu dạng dd/mm/yyyy");
    t.eq(r1[4], "07/01/2026");
    t.eq(r1[6], "10");
    t.eq(lines[2].split("\t")[5], "1", "quan hệ phụ thuộc");

    t.case("copy/dán đi vòng: dán lại TSV vừa copy thì dữ liệu không đổi");
    const grid = lines.slice(1).map(l => l.split("\t").slice(1));
    makeState(APP, { tasks: [{ name: "" }] });
    APP.renderAll();
    APP.applyPaste(0, C_NAME, grid);
    APP.compute();
    t.eq(APP.state.tasks[0].name, "Đào móng");
    t.eq(APP.state.tasks[0].dur, 3);
    t.eq(APP.state.tasks[0].res, "10");
    t.eq(APP.state.tasks[1].preds, "1");
    t.eq(APP.toISO(APP.sched[1].start), "2026-01-08", "lịch dựng lại giống hệt");
  } finally { closeApp(APP); }
};

/* copyTableTSV() đẩy thẳng vào clipboard; trong jsdom ta chặn lấy chuỗi TSV. */
function tsvOf(APP) {
  const win = APP.__dom.window;
  let captured = "";
  const orig = win.navigator.clipboard;
  Object.defineProperty(win.navigator, "clipboard", {
    configurable: true,
    value: { writeText: txt => { captured = txt; return Promise.resolve(); } }
  });
  APP.copyTableTSV();
  if (orig) Object.defineProperty(win.navigator, "clipboard", { configurable: true, value: orig });
  return captured;
}
