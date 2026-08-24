/* Cú pháp nhân lực và biểu đồ nhân lực (CLAUDE.md §6.1.2 §3.5). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "resources — resUnits, biểu đồ nhân lực";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const R = APP.resUnits;

    t.case("rỗng = 0 người");
    t.eq(R(""), 0);
    t.eq(R(null), 0);
    t.eq(R(undefined), 0);

    t.case("số trần = số người");
    t.eq(R("12"), 12);
    t.eq(R("1"), 1);
    t.eq(R("12,5"), 12.5, "dấu phẩy thập phân kiểu Việt Nam");
    t.eq(R("12.5"), 12.5);

    t.case("tên có [n] thì cộng dồn");
    t.eq(R("Nhân công[10]"), 10);
    t.eq(R("Nhân công[10]; Thợ hàn[2]"), 12);
    t.eq(R("Nhân công[10], Thợ hàn[2], Lái máy[3]"), 15);
    t.eq(R("Nhân công [ 10 ]"), 10, "chấp nhận khoảng trắng trong ngoặc");
    t.eq(R("Thợ hàn[2,5]"), 2.5, "dấu phẩy thập phân trong ngoặc");

    t.case("tên không ghi số thì tính 1 người mỗi tên");
    t.eq(R("Thợ nề"), 1);
    t.eq(R("Thợ nề; Thợ mộc"), 2);
    t.eq(R("Thợ nề, Thợ mộc, Thợ điện"), 3);

    t.case("có ít nhất một [n] thì chỉ cộng các [n], bỏ tên trơ");
    t.eq(R("Nhân công[10]; Thợ nề"), 10);

    /* ---- Biểu đồ nhân lực ---- */
    t.case("biểu đồ nhân lực cộng theo từng ngày làm việc");
    makeState(APP, {
      tasks: [
        { name: "A", dur: 3, res: "10" },                        // 05,06,07
        { name: "B", dur: 2, preds: "1", res: "Thợ nề[4]; Phụ[1]" } // 08,09
      ]
    });
    APP.compute();
    let tl = APP.buildTimeline();
    let prof = APP.resourceProfile(tl);
    const at = iso => prof[Math.round((APP.fromISO(iso) - tl.start) / 86400000)];
    t.eq(prof.length, tl.days, "một ô cho mỗi ngày lịch của trục thời gian");
    t.eq(at("2026-01-05"), 10);
    t.eq(at("2026-01-07"), 10);
    t.eq(at("2026-01-08"), 5, "tổng của [4] + [1]");
    t.eq(at("2026-01-09"), 5);
    t.eq(at("2026-01-11"), 0, "Chủ nhật không có nhân lực");
    t.eq(prof.reduce((a, b) => a + b, 0), 40, "3×10 + 2×5");

    t.case("hai công việc chồng ngày thì cộng dồn");
    makeState(APP, {
      tasks: [
        { name: "A", dur: 3, res: "10" },
        { name: "B", dur: 3, res: "6" }
      ]
    });
    APP.compute();
    tl = APP.buildTimeline();
    prof = APP.resourceProfile(tl);
    const at2 = iso => prof[Math.round((APP.fromISO(iso) - tl.start) / 86400000)];
    t.eq(at2("2026-01-05"), 16);
    t.eq(prof.reduce((a, b) => a + b, 0), 48);

    t.case("dòng tổng và mốc không được tính vào biểu đồ nhân lực");
    makeState(APP, {
      tasks: [
        { name: "Nhóm", level: 0, res: "99" },
        { name: "A", level: 1, dur: 2, res: "5" },
        { name: "Mốc", level: 1, dur: 0, res: "7" }
      ]
    });
    APP.compute();
    tl = APP.buildTimeline();
    prof = APP.resourceProfile(tl);
    t.eq(prof.reduce((a, b) => a + b, 0), 10, "chỉ 2 ngày × 5 của A");

    t.case("dòng trống không được tính");
    makeState(APP, { tasks: [{ name: "", dur: 5, res: "20" }] });
    APP.compute();
    tl = APP.buildTimeline();
    prof = APP.resourceProfile(tl);
    t.eq(prof.reduce((a, b) => a + b, 0), 0);
  } finally { closeApp(APP); }
};
