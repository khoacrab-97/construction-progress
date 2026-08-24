/* Vòng lặp quan hệ phải được phát hiện và báo lỗi, KHÔNG treo app (CLAUDE.md §8.8). */
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "cycle — vòng lặp quan hệ không treo app";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("vòng lặp hai công việc: cả hai bị đánh dấu lỗi");
    const t0 = Date.now();
    let s = schedule(APP, [
      { name: "A", dur: 2, preds: "2" },
      { name: "B", dur: 2, preds: "1" }
    ]);
    const ms = Date.now() - t0;
    t.ok(ms < 2000, "compute() trả về nhanh (" + ms + "ms), không lặp vô hạn");
    t.ok(!!s[0].err, "A có lỗi");
    t.ok(!!s[1].err, "B có lỗi");

    t.case("công việc trong vòng lặp vẫn có ngày để vẽ được thanh");
    t.eq(s[0].start, "2026-01-05", "lùi về ngày bắt đầu dự án thay vì undefined");
    t.ok(!!s[0].finish);

    t.case("vòng lặp ba công việc");
    s = schedule(APP, [
      { name: "A", dur: 2, preds: "3" },
      { name: "B", dur: 2, preds: "1" },
      { name: "C", dur: 2, preds: "2" }
    ]);
    t.ok(!!s[0].err);
    t.ok(!!s[1].err);
    t.ok(!!s[2].err);

    t.case("việc phụ thuộc vào công việc trong vòng lặp cũng bị báo lỗi");
    s = schedule(APP, [
      { name: "A", dur: 2, preds: "2" },
      { name: "B", dur: 2, preds: "1" },
      { name: "C", dur: 2, preds: "1" }
    ]);
    t.eq(s[2].err, "lỗi CV phụ thuộc");

    t.case("việc KHÔNG dính vòng lặp vẫn tính đúng, không bị lây lỗi");
    s = schedule(APP, [
      { name: "A", dur: 2, preds: "2" },
      { name: "B", dur: 2, preds: "1" },
      { name: "Độc lập", dur: 3 }
    ]);
    t.eq(s[2].err, undefined);
    t.eq(s[2].start, "2026-01-05");
    t.eq(s[2].finish, "2026-01-07");

    t.case("vòng lặp bên trong một nhóm: không treo, nhóm không có con hợp lệ");
    const t1 = Date.now();
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },
      { name: "A", level: 1, dur: 2, preds: "3" },
      { name: "B", level: 1, dur: 2, preds: "2" }
    ]);
    t.ok(Date.now() - t1 < 2000, "không treo");
    t.ok(!!s[1].err, "con A lỗi");
    t.ok(!!s[2].err, "con B lỗi");
    t.ok(s[0].blank, "mọi con đều lỗi → nhóm không tổng hợp được, coi như dòng trống");

    t.case("bảng lớn có vòng lặp vẫn tính xong trong thời gian hợp lý");
    const many = [];
    for (let i = 0; i < 200; i++) many.push({ name: "T" + (i + 1), dur: 1, preds: i ? String(i) : "" });
    many[0].preds = "200"; // khép vòng
    const t2 = Date.now();
    s = schedule(APP, many);
    const ms2 = Date.now() - t2;
    t.ok(ms2 < 5000, "200 dòng khép vòng xong trong " + ms2 + "ms");
    t.eq(s.length, 200);
    t.ok(!!s[0].err);
  } finally { closeApp(APP); }
};
