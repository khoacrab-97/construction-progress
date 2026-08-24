/* Cột và định dạng ô (CLAUDE.md §3.1 §6.3 §7). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "columns & format — thứ tự cột, định dạng ô";

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("bộ cột mặc định đúng thứ tự đặc tả");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    t.eq(APP.state.colOrder, ["stt", "name", "dur", "start", "finish", "preds", "res"]);
    t.eq(APP.totalCols(), 7);

    t.case("nhãn cột mặc định bằng tiếng Việt");
    t.eq(APP.colLabelOf("stt"), "ID");
    t.eq(APP.colLabelOf("name"), "Tên công việc");
    t.eq(APP.colLabelOf("dur"), "Thời gian");
    t.eq(APP.colLabelOf("start"), "Bắt đầu");
    t.eq(APP.colLabelOf("finish"), "Kết thúc");
    t.eq(APP.colLabelOf("preds"), "Quan hệ phụ thuộc");
    t.eq(APP.colLabelOf("res"), "Nhân lực");

    t.case("đổi tên cột hệ thống được ghi vào colLabels");
    APP.state.colLabels.res = "Nhân công";
    t.eq(APP.colLabelOf("res"), "Nhân công");
    t.eq(APP.colLabelOf("name"), "Tên công việc", "cột khác không bị ảnh hưởng");

    t.case("colKeyAt / colIdxOf khớp nhau, cột STT không phải cột dữ liệu");
    t.eq(APP.colKeyAt(0), null, "cột 0 là STT — không nhập liệu được");
    t.eq(APP.colKeyAt(1), "name");
    t.eq(APP.colIdxOf("name"), 1);
    t.eq(APP.colIdxOf("res"), 6);
    t.eq(APP.colIdxOf("khong-ton-tai"), -1);

    t.case("cột tùy chỉnh được thêm vào cuối");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }], customCols: [{ id: "cc1", name: "Khối lượng" }] });
    APP.renderAll();
    t.eq(APP.state.colOrder[APP.state.colOrder.length - 1], "cc1");
    t.eq(APP.colLabelOf("cc1"), "Khối lượng");
    t.eq(APP.totalCols(), 8);

    t.case("moveColumn đổi thứ tự cột");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.moveColumn("res", "dur", false);
    t.eq(APP.state.colOrder, ["stt", "name", "res", "dur", "start", "finish", "preds"]);

    t.case("moveColumn đặt sau một cột khác");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.moveColumn("preds", "name", true);
    t.eq(APP.state.colOrder, ["stt", "name", "preds", "dur", "start", "finish", "res"]);

    t.case("cột STT luôn ở đầu, không kéo đi chỗ khác được");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.moveColumn("stt", "res", true);
    t.eq(APP.state.colOrder[0], "stt");

    t.case("mergeDefaults kéo cột STT về đầu nếu dữ liệu cũ bị lệch");
    APP.state.colOrder = ["name", "stt", "dur", "start", "finish", "preds", "res"];
    APP.mergeDefaults();
    t.eq(APP.state.colOrder[0], "stt");

    t.case("bề rộng cột: dùng giá trị người dùng, thiếu thì dùng mặc định");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }], colW: { name: 300 } });
    APP.renderAll();
    t.eq(APP.getColW("name"), 300);
    t.ok(APP.getColW("dur") > 0, "cột chưa chỉnh vẫn có bề rộng mặc định");
    t.eq(APP.getColW("cc_moi"), 110, "cột tùy chỉnh mặc định 110px");

    /* ---- Định dạng ô ---- */
    t.case("in đậm ô đang chọn");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2 }] });
    APP.renderAll();
    APP.focusCell(0, 1);
    APP.toggleFmt("b");
    t.eq(APP.getFmt(APP.state.tasks[0], "name").b, 1);
    t.eq(APP.getFmt(APP.state.tasks[1], "name"), null, "ô khác không bị đụng");

    t.case("bấm lần nữa thì bỏ đậm");
    APP.toggleFmt("b");
    t.eq(APP.getFmt(APP.state.tasks[0], "name").b, 0);

    t.case("định dạng cả một vùng chọn");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2 }, { name: "C", dur: 2 }] });
    APP.renderAll();
    APP.selectRect([0, 1], [2, 2]);
    APP.formatCells(f => { f.i = 1; });
    for (let r = 0; r < 3; r++) {
      t.eq(APP.getFmt(APP.state.tasks[r], "name").i, 1, "dòng " + r + " cột Tên");
      t.eq(APP.getFmt(APP.state.tasks[r], "dur").i, 1, "dòng " + r + " cột Thời gian");
    }

    t.case("định dạng không lan sang cột ngoài vùng chọn");
    t.eq(APP.getFmt(APP.state.tasks[0], "res"), null);

    t.case("màu chữ, màu nền, font, cỡ chữ đều lưu được");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.focusCell(0, 1);
    APP.formatCells(f => { f.c = "#c0392b"; f.bg = "#fff3cd"; f.ff = "Arial"; f.fs = 14; f.a = "c"; });
    const f0 = APP.getFmt(APP.state.tasks[0], "name");
    t.eq(f0.c, "#c0392b");
    t.eq(f0.bg, "#fff3cd");
    t.eq(f0.ff, "Arial");
    t.eq(f0.fs, 14);
    t.eq(f0.a, "c");

    t.case("định dạng được dịch sang CSS đúng");
    const css = APP.fmtStyleCss({ b: 1, i: 1, u: 1, a: "c", fs: 14, c: "#c0392b", bg: "#fff3cd" });
    t.ok(css.inp.indexOf("font-weight:700") >= 0);
    t.ok(css.inp.indexOf("font-style:italic") >= 0);
    t.ok(css.inp.indexOf("text-decoration:underline") >= 0);
    t.ok(css.inp.indexOf("text-align:center") >= 0);
    t.ok(css.inp.indexOf("font-size:14px") >= 0);
    t.ok(css.inp.indexOf("color:#c0392b") >= 0);
    t.ok(css.td.indexOf("background:#fff3cd") >= 0, "màu nền áp lên ô, không áp lên chữ");
    t.eq(APP.fmtStyleCss(null).inp, "", "không có định dạng thì không sinh CSS");

    t.case("căn trái/phải dịch đúng");
    t.ok(APP.fmtStyleCss({ a: "l" }).inp.indexOf("text-align:left") >= 0);
    t.ok(APP.fmtStyleCss({ a: "r" }).inp.indexOf("text-align:right") >= 0);

    t.case("định dạng TIÊU ĐỀ cột lưu riêng ở colFmt, không đụng dữ liệu dòng");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.selectCols(["name"]);
    APP.toggleFmt("b");
    t.eq(APP.state.colFmt.name.b, 1);
    t.eq(APP.getFmt(APP.state.tasks[0], "name"), null, "ô dữ liệu không bị đậm theo");

    t.case("xóa nội dung ô không xóa định dạng");
    makeState(APP, { tasks: [{ name: "A", dur: 5, res: "10" }] });
    APP.renderAll();
    APP.focusCell(0, 1);
    APP.formatCells(f => { f.b = 1; });
    APP.clearCellContents();
    t.eq(APP.state.tasks[0].name, "", "nội dung bị xóa");
    t.eq(APP.getFmt(APP.state.tasks[0], "name").b, 1, "định dạng giữ nguyên");

    t.case("nhãn trên thanh Gantt lấy đúng trường");
    makeState(APP, { tasks: [{ name: "Đào móng", dur: 3, res: "10" }] });
    APP.renderAll();
    t.eq(APP.labelVal(0, "name"), "Đào móng");
    t.eq(APP.labelVal(0, "start"), "05/01/2026");
    t.eq(APP.labelVal(0, "finish"), "07/01/2026");
    t.eq(APP.labelVal(0, "dur"), "3 ngày");
    t.eq(APP.labelVal(0, "res"), "10");
    t.eq(APP.labelVal(0, "khong-co"), "", "trường lạ trả rỗng");

    t.case("dòng tổng không hiện nhãn nhân lực");
    makeState(APP, {
      tasks: [
        { name: "Nhóm", level: 0, res: "99" },
        { name: "A", level: 1, dur: 2, res: "5" }
      ]
    });
    APP.renderAll();
    t.eq(APP.labelVal(0, "res"), "");
    t.eq(APP.labelVal(1, "res"), "5");
  } finally { closeApp(APP); }
};
