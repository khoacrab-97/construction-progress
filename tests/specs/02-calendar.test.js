/* Lịch làm việc: chỉ tính ngày làm việc, nghỉ tuần + nghỉ lễ (CLAUDE.md §8.1). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "calendar — ngày làm việc, nghỉ tuần, nghỉ lễ";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const { fromISO, toISO, isWork, addWork, workSpan, compute } = APP;
    const D = s => fromISO(s);

    /* Mốc: 2026-01-05 là thứ Hai. CN nghỉ, T2..T7 làm. */
    makeState(APP, { tasks: [{ name: "A", dur: 1 }] });
    compute();

    t.case("mặc định: CN nghỉ, các ngày khác làm");
    t.ok(isWork(D("2026-01-05")), "thứ Hai");
    t.ok(isWork(D("2026-01-10")), "thứ Bảy");
    t.ok(!isWork(D("2026-01-11")), "Chủ nhật");

    t.case("addWork tiến theo ngày làm việc, nhảy qua CN");
    t.eq(toISO(addWork(D("2026-01-05"), 1)), "2026-01-06");
    t.eq(toISO(addWork(D("2026-01-05"), 5)), "2026-01-10", "T2 + 5 = T7");
    t.eq(toISO(addWork(D("2026-01-10"), 1)), "2026-01-12", "T7 + 1 nhảy qua CN");
    t.eq(toISO(addWork(D("2026-01-05"), 0)), "2026-01-05", "n=0 giữ nguyên");

    t.case("addWork lùi khi n âm");
    t.eq(toISO(addWork(D("2026-01-12"), -1)), "2026-01-10", "T2 lùi 1 về T7");
    t.eq(toISO(addWork(D("2026-01-12"), -6)), "2026-01-05");

    t.case("workSpan đếm cả hai đầu, bỏ ngày nghỉ");
    t.eq(workSpan(D("2026-01-05"), D("2026-01-05")), 1);
    t.eq(workSpan(D("2026-01-05"), D("2026-01-10")), 6);
    t.eq(workSpan(D("2026-01-05"), D("2026-01-11")), 6, "CN không tính");
    t.eq(workSpan(D("2026-01-05"), D("2026-01-12")), 7);

    t.case("workSpan không bao giờ trả 0");
    t.eq(workSpan(D("2026-01-11"), D("2026-01-11")), 1, "chỉ có CN vẫn trả 1");

    /* Nghỉ lễ */
    makeState(APP, { tasks: [{ name: "A", dur: 1 }], holidays: ["2026-01-07"] });
    compute();
    t.case("ngày lễ không phải ngày làm việc");
    t.ok(!isWork(D("2026-01-07")), "07/01 là ngày lễ");
    t.ok(isWork(D("2026-01-06")), "hôm trước vẫn làm");
    t.eq(toISO(addWork(D("2026-01-05"), 2)), "2026-01-08", "nhảy qua ngày lễ 07");
    t.eq(toISO(addWork(D("2026-01-06"), 1)), "2026-01-08", "06 + 1 bỏ qua lễ 07");
    t.eq(workSpan(D("2026-01-05"), D("2026-01-09")), 4, "5 ngày lịch - 1 lễ");

    /* Tuần làm việc khác: nghỉ cả T7 và CN */
    makeState(APP, { tasks: [{ name: "A", dur: 1 }], workDays: [0, 1, 1, 1, 1, 1, 0] });
    compute();
    t.case("nghỉ T7 + CN");
    t.ok(!isWork(D("2026-01-10")), "thứ Bảy nghỉ");
    t.eq(toISO(addWork(D("2026-01-09"), 1)), "2026-01-12", "T6 + 1 = T2 tuần sau");
    t.eq(workSpan(D("2026-01-05"), D("2026-01-11")), 5, "một tuần = 5 ngày công");

    /* Lịch theo giai đoạn đè lên lịch mặc định */
    makeState(APP, {
      tasks: [{ name: "A", dur: 1 }],
      workDays: [0, 1, 1, 1, 1, 1, 0],
      calRanges: [{ from: "2026-01-05", to: "2026-01-18", wd: [1, 1, 1, 1, 1, 1, 1] }]
    });
    compute();
    t.case("calRanges đè lịch mặc định trong khoảng ngày");
    t.ok(isWork(D("2026-01-11")), "trong giai đoạn nước rút: CN cũng làm");
    t.ok(!isWork(D("2026-01-25")), "ngoài giai đoạn: CN vẫn nghỉ");

    t.case("lịch rỗng được tự sửa để không treo");
    makeState(APP, { tasks: [{ name: "A", dur: 1 }], workDays: [0, 0, 0, 0, 0, 0, 0] });
    compute();
    t.ok(APP.state.workDays.some(v => v), "rebuildCalendar khôi phục lịch mặc định");
  } finally { closeApp(APP); }
};
