/* mergeDefaults() là lớp chuyển đổi hồ sơ cũ. Bỏ hoặc sửa ẩu = hồ sơ cũ mở lên
   bị hỏng hoặc mất thiết lập (CLAUDE.md §13.1 #5 #9). */
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "migration — mergeDefaults nâng cấp hồ sơ cũ";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    /* Hồ sơ "cổ": chỉ có những trường thời kỳ đầu. */
    function oldState(extra) {
      return Object.assign({
        name: "Hồ sơ cũ",
        start: "2026-01-05",
        workDays: [0, 1, 1, 1, 1, 1, 1],
        holidays: ["2026-02-17"],
        tasks: [{ name: "A", level: 0, dur: 3, preds: "", res: "5", mStart: "" }]
      }, extra || {});
    }

    t.case("hồ sơ thiếu gần hết trường vẫn mở được, không ném lỗi");
    APP.state = oldState();
    APP.mergeDefaults();
    let st = APP.state;
    t.ok(!!st.ts, "sinh thang thời gian mặc định");
    t.ok(!!st.print, "sinh cấu hình in mặc định");
    t.ok(!!st.barStyle, "sinh kiểu thanh mặc định");
    t.ok(!!st.font, "sinh font mặc định");
    t.ok(!!st.grid && !!st.nwt, "sinh gridlines và ngày nghỉ");
    t.ok(!!st.info, "sinh thông tin dự án");

    t.case("dữ liệu người dùng KHÔNG bị mergeDefaults ghi đè");
    t.eq(st.name, "Hồ sơ cũ");
    t.eq(st.start, "2026-01-05");
    t.eq(st.holidays, ["2026-02-17"]);
    t.eq(st.tasks.length, 1);
    t.eq(st.tasks[0].name, "A");
    t.eq(st.tasks[0].dur, 3);
    t.eq(st.tasks[0].res, "5");

    t.case("task cũ thiếu custom được vá lại");
    t.ok(!!st.tasks[0].custom, "custom được khởi tạo");

    t.case("colOrder được dựng lại đầy đủ, cột STT luôn đứng đầu");
    t.eq(st.colOrder[0], "stt");
    ["stt", "name", "dur", "start", "finish", "preds", "res"].forEach(k =>
      t.ok(st.colOrder.includes(k), "có cột " + k));

    t.case("cột tùy chỉnh được nối vào colOrder và vào danh sách cột in");
    APP.state = oldState({ customCols: [{ id: "cc1", name: "Khối lượng" }] });
    APP.mergeDefaults();
    st = APP.state;
    t.ok(st.colOrder.includes("cc1"));
    t.eq(st.print.cols.cc1, 1, "cột tùy chỉnh mặc định được in");

    t.case("colOrder chứa cột không còn tồn tại thì bị loại bỏ");
    APP.state = oldState({ colOrder: ["stt", "name", "cc_da_xoa", "dur"] });
    APP.mergeDefaults();
    t.ok(!APP.state.colOrder.includes("cc_da_xoa"));

    t.case("cấu hình in kiểu cũ hl/hc/hr được chuyển sang hdr");
    APP.state = oldState({ print: { hl: "Trái cũ", hc: "Giữa cũ", hr: "Phải cũ" } });
    APP.mergeDefaults();
    st = APP.state;
    t.eq(st.print.hdr.l, "Trái cũ");
    t.eq(st.print.hdr.c, "Giữa cũ");
    t.eq(st.print.hdr.r, "Phải cũ");
    t.eq(st.print.hl, undefined, "trường cũ được dọn đi");

    t.case("cấu hình chân trang kiểu cũ fl/fc/fr được chuyển sang ftr");
    APP.state = oldState({ print: { fl: "Chủ đầu tư", fc: "", fr: "Nhà thầu" } });
    APP.mergeDefaults();
    st = APP.state;
    t.ok(Array.isArray(st.print.ftr.boxes), "ftr chuyển sang mô hình hộp văn bản");
    t.eq(st.print.fl, undefined, "trường cũ được dọn đi");
    const txt = st.print.ftr.boxes.map(b => b.text).join(" | ");
    t.ok(txt.indexOf("Chủ đầu tư") >= 0, "giữ nội dung cũ: " + txt);
    t.ok(txt.indexOf("Nhà thầu") >= 0);

    t.case("GIỮ NGUYÊN tham chiếu object state.print — dialog in đang mở không bị mất");
    APP.state = oldState();
    APP.mergeDefaults();
    const ref = APP.state.print;
    APP.mergeDefaults();
    t.ok(APP.state.print === ref, "gọi lại mergeDefaults không thay object print");

    t.case("_boldV2: hồ sơ cũ được nâng cấp một lần sang chữ trên thanh in đậm");
    APP.state = oldState({ barStyle: { text: { b: 0 } } });
    APP.mergeDefaults();
    t.eq(APP.state.barStyle.text.b, 1, "bật đậm");
    t.eq(APP.state.barStyle._boldV2, 1, "đánh dấu đã nâng cấp");

    t.case("_boldV2: hồ sơ đã nâng cấp thì tôn trọng lựa chọn tắt đậm của người dùng");
    APP.state = oldState({ barStyle: { _boldV2: 1, text: { b: 0 } } });
    APP.mergeDefaults();
    t.eq(APP.state.barStyle.text.b, 0, "không bật lại lần hai");

    t.case("hồ sơ chưa có barStyles thì sinh từ barStyle cũ");
    APP.state = oldState();
    APP.mergeDefaults();
    t.ok(Array.isArray(APP.state.barStyles) && APP.state.barStyles.length > 0);
    APP.state.barStyles.forEach((s, i) => {
      t.ok(!!s.bars && !!s.bars.start && !!s.bars.mid && !!s.bars.end, "kiểu " + i + " đủ 3 đoạn thanh");
      t.eq(s.row, 1, "kiểu " + i + " có Row mặc định");
    });

    t.case("cờ pst được đồng bộ theo dữ liệu thật, không tin cờ đã lưu");
    APP.state = oldState({ pst: true });
    APP.mergeDefaults();
    t.eq(APP.state.pst, false, "không có dòng _pst thì cờ phải là false");

    t.case("calRanges hỏng bị loại bỏ, không làm treo lịch");
    APP.state = oldState({ calRanges: [{ from: "2026-01-01" }, { from: "a", to: "b", wd: [1, 1] }, { from: "2026-01-01", to: "2026-01-31", wd: [1, 1, 1, 1, 1, 1, 1] }] });
    APP.mergeDefaults();
    t.eq(APP.state.calRanges.length, 1, "chỉ giữ giai đoạn hợp lệ");

    t.case("view lạ được ép về gantt");
    APP.state = oldState({ view: "linh-tinh" });
    APP.mergeDefaults();
    t.eq(APP.state.view, "gantt");

    t.case("thang thời gian: giữ giá trị người dùng, chỉ bù trường thiếu");
    APP.state = oldState({ ts: { zoom: 9, auto: 0 } });
    APP.mergeDefaults();
    t.eq(APP.state.ts.zoom, 9, "giữ zoom");
    t.eq(APP.state.ts.auto, 0, "giữ auto");
    t.eq(APP.state.ts.unit, "day", "bù đơn vị mặc định");

    t.case("chữ thang thời gian mặc định Times New Roman 12");
    APP.state = oldState();
    APP.mergeDefaults();
    t.ok(/Times New Roman/.test(APP.state.tlFmt.ff), "font mặc định: " + APP.state.tlFmt.ff);
    t.eq(APP.state.tlFmt.fs, 12);
  } finally { closeApp(APP); }
};
