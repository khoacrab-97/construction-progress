/* Trục thời gian: phạm vi phải bao trọn tiến độ; Auto fit gom ngày theo cột
   thay vì nén pixel (CLAUDE.md §8.10 §9 #10). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "timeline — phạm vi, auto fit, đơn vị";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const end = tl => new Date(tl.start.getTime() + (tl.days - 1) * 86400000);

    t.case("trục bao trọn toàn bộ công việc");
    makeState(APP, { tasks: [{ name: "A", dur: 3 }, { name: "B", dur: 10, preds: "1" }] });
    APP.compute();
    let tl = APP.buildTimeline();
    const last = APP.sched[1].finish;
    t.ok(tl.start <= APP.sched[0].start, "bắt đầu không muộn hơn công việc sớm nhất");
    t.ok(end(tl) >= last, "kết thúc không sớm hơn công việc muộn nhất");
    t.ok(tl.days > 0);

    t.case("có chừa lề trái/phải cho nhãn chữ");
    t.ok(tl.start < APP.sched[0].start, "chừa lề trái");
    t.ok(end(tl) > last, "chừa lề phải");

    t.case("Auto fit: toàn bộ trục vừa bề rộng khung");
    t.eq(APP.state.ts.auto, 1, "mặc định bật Auto fit");
    t.ok(tl.ppd > 0, "px mỗi ngày phải dương");
    t.ok(tl.ppd <= 42, "không phóng quá 42 px/ngày");
    t.ok(tl.ppd * tl.days <= 1000, "tổng bề rộng không vượt khung (" + Math.round(tl.ppd * tl.days) + "px)");

    t.case("Auto fit: dự án dài thì px/ngày nhỏ lại, KHÔNG cắt bớt ngày");
    makeState(APP, { tasks: [{ name: "Dài", dur: 300 }] });
    APP.compute();
    const tlLong = APP.buildTimeline();
    t.ok(tlLong.days > 300, "vẫn đủ ngày cho công việc 300 ngày công");
    t.ok(tlLong.ppd < tl.ppd, "px/ngày co lại so với dự án ngắn");
    t.ok(tlLong.ppd >= 0.5, "không co xuống dưới 0.5 px/ngày");
    t.ok(end(tlLong) >= APP.sched[0].finish, "vẫn bao trọn công việc");

    t.case("tắt Auto fit: px/ngày lấy đúng mức zoom người dùng chọn");
    makeState(APP, { tasks: [{ name: "A", dur: 5 }], ts: { mode: "date", unit: "day", count: 1, zoom: 20, auto: 0 } });
    APP.compute();
    let tlManual = APP.buildTimeline();
    t.eq(tlManual.ppd, 20);

    makeState(APP, { tasks: [{ name: "A", dur: 5 }], ts: { mode: "date", unit: "day", count: 1, zoom: 8, auto: 0 } });
    APP.compute();
    t.eq(APP.buildTimeline().ppd, 8, "đổi zoom thì đổi theo");

    t.case("tắt Auto fit: trục kéo dài rộng rãi để cuộn ngang");
    t.ok(APP.buildTimeline().days >= 30, "tối thiểu 30 ngày khi không Auto fit");

    t.case("đơn vị Tháng: trục bắt đầu từ ngày 1 của tháng");
    makeState(APP, { tasks: [{ name: "A", dur: 20 }], ts: { mode: "date", unit: "month", count: 1, zoom: 24, auto: 1 } });
    APP.compute();
    tl = APP.buildTimeline();
    t.eq(tl.start.getDate(), 1);

    t.case("đơn vị Tuần: trục bắt đầu từ thứ Hai");
    makeState(APP, { tasks: [{ name: "A", dur: 20 }], ts: { mode: "date", unit: "week", count: 1, zoom: 24, auto: 1 } });
    APP.compute();
    tl = APP.buildTimeline();
    t.eq(tl.start.getDay(), 1, "1 = thứ Hai");

    t.case("bảng rỗng vẫn cho trục hợp lệ, không vỡ");
    makeState(APP, { tasks: [{ name: "", dur: 0 }] });
    APP.compute();
    tl = APP.buildTimeline();
    t.ok(tl.days >= 5);
    t.ok(!isNaN(tl.start.getTime()));
    t.ok(tl.ppd > 0);

    t.case("prjStart trên trục là ngày làm việc, đã đẩy khỏi ngày nghỉ");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }], start: "2026-01-11" }); // Chủ nhật
    APP.compute();
    tl = APP.buildTimeline();
    t.eq(APP.toISO(tl.prjStart), "2026-01-12");
  } finally { closeApp(APP); }
};
