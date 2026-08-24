/* CHỖ NGUY HIỂM NHẤT (CLAUDE.md §13.1 #6 #7).
   Số trong cột "Quan hệ phụ thuộc" là SỐ THỨ TỰ HIỂN THỊ ở cột STT,
   KHÔNG phải chỉ số mảng. Khi bật dòng tổng dự án (PST), dòng đó mang số 0
   nên toàn bộ ánh xạ dịch một bậc. pstOrdinal() và idxOfId() giữ việc quy đổi.
   Sai ở đây = sai lịch ÂM THẦM, không báo lỗi. Đã từng xảy ra. */
const { loadApp, closeApp, makeState, schedule } = require("../helpers/env");

exports.name = "PST ordinal — ánh xạ STT ↔ chỉ số mảng";

/* Dựng lại đúng cách setProjectSummary(true) biến đổi bảng. */
function withPST(tasks) {
  const shifted = tasks.map(t => Object.assign({}, t, { level: (t.level | 0) + 1 }));
  shifted.unshift({ name: "Toàn dự án", level: 0, dur: 0, preds: "", res: "", mStart: "", custom: {}, _pst: true, fmt: {} });
  return shifted;
}

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const base = [
      { name: "A", dur: 3 },              // STT 1 → 05..07
      { name: "B", dur: 2, preds: "1" }   // STT 2 → 08..09
    ];

    /* ---- Không có PST ---- */
    makeState(APP, { tasks: base.map(x => Object.assign({}, x)) });
    APP.compute();

    t.case("không có PST: STT bắt đầu từ 1");
    t.ok(!APP.state.tasks[0]._pst, "dòng đầu không phải PST");
    t.eq(APP.pstOrdinal(0), 1, "dòng đầu mang STT 1");
    t.eq(APP.pstOrdinal(1), 2);
    t.eq(APP.idxOfId(1), 0, "STT 1 → chỉ số mảng 0");
    t.eq(APP.idxOfId(2), 1);

    t.case("không có PST: đi vòng pstOrdinal → idxOfId không lệch");
    for (let i = 0; i < APP.state.tasks.length; i++) t.eq(APP.idxOfId(APP.pstOrdinal(i)), i, "i=" + i);

    let s = schedule(APP, base.map(x => Object.assign({}, x)));
    const noPst = { aStart: s[0].start, aFinish: s[0].finish, bStart: s[1].start, bFinish: s[1].finish };
    t.case("không có PST: lịch nền");
    t.eq(noPst.aStart, "2026-01-05");
    t.eq(noPst.bStart, "2026-01-08", "B nối sau A");

    /* ---- Có PST ---- */
    makeState(APP, { tasks: withPST(base), pst: true });
    APP.compute();

    t.case("có PST: dòng tổng mang STT 0");
    t.ok(APP.state.tasks[0]._pst, "dòng đầu là PST");
    t.eq(APP.pstOrdinal(0), 0, "dòng tổng dự án mang số 0");
    t.eq(APP.pstOrdinal(1), 1, "công việc A vẫn mang STT 1");
    t.eq(APP.pstOrdinal(2), 2);
    t.eq(APP.idxOfId(0), 0, "STT 0 → dòng tổng");
    t.eq(APP.idxOfId(1), 1, "STT 1 → chỉ số mảng 1 (đã dịch một bậc)");
    t.eq(APP.idxOfId(2), 2);

    t.case("có PST: đi vòng pstOrdinal → idxOfId không lệch");
    for (let i = 0; i < APP.state.tasks.length; i++) t.eq(APP.idxOfId(APP.pstOrdinal(i)), i, "i=" + i);

    t.case("BẤT BIẾN CỐT LÕI: bật PST không làm đổi lịch của công việc");
    const s2 = APP.sched;
    t.eq(APP.toISO(s2[1].start), noPst.aStart, "A giữ nguyên ngày bắt đầu");
    t.eq(APP.toISO(s2[1].finish), noPst.aFinish, "A giữ nguyên ngày kết thúc");
    t.eq(APP.toISO(s2[2].start), noPst.bStart, "B vẫn nối sau A — preds '1' vẫn trỏ đúng A");
    t.eq(APP.toISO(s2[2].finish), noPst.bFinish);
    t.eq(s2[2].err, null, "không phát sinh lỗi ID");

    t.case("có PST: dòng tổng dự án bao trọn toàn bộ công việc");
    t.ok(s2[0].summary, "PST là dòng tổng");
    t.eq(APP.toISO(s2[0].start), "2026-01-05");
    t.eq(APP.toISO(s2[0].finish), "2026-01-09");

    t.case("có PST: mọi công việc bị đẩy xuống cấp 1, PST ở cấp 0");
    t.eq(APP.state.tasks[0].level, 0);
    t.eq(APP.state.tasks[1].level, 1);

    t.case("có PST: chuỗi dài vẫn trỏ đúng");
    makeState(APP, {
      tasks: withPST([
        { name: "A", dur: 2 },              // STT 1
        { name: "B", dur: 2, preds: "1" },  // STT 2
        { name: "C", dur: 2, preds: "2" },  // STT 3
        { name: "D", dur: 2, preds: "3" }   // STT 4
      ]), pst: true
    });
    APP.compute();
    const g = APP.sched;
    t.eq(APP.toISO(g[1].start), "2026-01-05", "A");
    t.eq(APP.toISO(g[2].start), "2026-01-07", "B sau A");
    t.eq(APP.toISO(g[3].start), "2026-01-09", "C sau B");
    t.eq(APP.toISO(g[4].start), "2026-01-12", "D sau C, nhảy qua CN");
    for (let i = 1; i <= 4; i++) t.eq(g[i].err, null, "không có lỗi ID ở dòng " + i);

    t.case("bật/tắt PST bằng chính setProjectSummary(): lịch không đổi");
    makeState(APP, { tasks: [{ name: "A", dur: 3 }, { name: "B", dur: 2, preds: "1" }] });
    APP.renderAll();
    APP.compute();
    const before = APP.sched.map(x => APP.toISO(x.start) + ".." + APP.toISO(x.finish));

    APP.setProjectSummary(true);
    APP.compute();
    t.ok(APP.hasPST(), "đã bật dòng tổng dự án");
    t.eq(APP.state.tasks.length, 3, "chèn thêm đúng một dòng");
    t.eq(APP.state.tasks.map(x => x.level), [0, 1, 1], "công việc bị đẩy xuống cấp 1");
    const during = APP.sched.slice(1).map(x => APP.toISO(x.start) + ".." + APP.toISO(x.finish));
    t.eq(during, before, "lịch công việc KHÔNG đổi khi bật PST");

    APP.setProjectSummary(false);
    APP.compute();
    t.ok(!APP.hasPST(), "đã tắt dòng tổng dự án");
    t.eq(APP.state.tasks.length, 2, "dòng tổng được gỡ");
    t.eq(APP.state.tasks.map(x => x.level), [0, 0], "công việc được kéo lên lại cấp 0");
    const after = APP.sched.map(x => APP.toISO(x.start) + ".." + APP.toISO(x.finish));
    t.eq(after, before, "lịch công việc KHÔNG đổi khi tắt PST");

    t.case("bật PST hai lần không nhân đôi dòng tổng");
    APP.setProjectSummary(true);
    APP.setProjectSummary(true);
    t.eq(APP.state.tasks.length, 3);
    APP.setProjectSummary(false);

    t.case("có PST: preds trỏ tới STT quá lớn vẫn bị bắt lỗi");
    makeState(APP, { tasks: withPST([{ name: "A", dur: 2, preds: "99" }]), pst: true });
    APP.compute();
    t.eq(APP.sched[1].err, "ID sai");
  } finally { closeApp(APP); }
};
