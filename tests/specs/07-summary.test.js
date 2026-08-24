/* Phân cấp ngầm theo level: dòng cha tự tổng hợp từ con (CLAUDE.md §6.1 §8.4). */
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "summary — phân cấp, tổng hợp cha từ con";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("cha nhận ngày sớm nhất và muộn nhất của con");
    let s = schedule(APP, [
      { name: "Nhóm 1", level: 0, dur: 99 },
      { name: "A", level: 1, dur: 3 },              // 05 → 07
      { name: "B", level: 1, dur: 2, preds: "2" }   // 08 → 09
    ]);
    t.ok(s[0].summary, "dòng 0 là dòng tổng");
    t.eq(s[0].start, "2026-01-05", "sớm nhất trong các con");
    t.eq(s[0].finish, "2026-01-09", "muộn nhất trong các con");
    t.eq(s[0].dur, 5, "thời lượng tính lại theo ngày công, bỏ qua dur người dùng gõ");
    t.ok(!s[1].summary, "con không phải dòng tổng");

    t.case("isSummary và blockEnd");
    t.ok(APP.isSummary(0));
    t.ok(!APP.isSummary(1));
    t.ok(!APP.isSummary(2), "dòng cuối không thể là cha");
    t.eq(APP.blockEnd(0), 2, "khối của cha gồm cả hai con");
    t.eq(APP.blockEnd(1), 1, "con không có con riêng");

    t.case("children() chỉ trả con TRỰC TIẾP");
    t.eq(APP.children(0), [1, 2]);
    t.eq(APP.children(1), []);

    t.case("con không theo thứ tự thời gian: cha vẫn lấy đúng biên");
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },
      { name: "Muộn", level: 1, dur: 2, mStart: "15/01/2026" }, // 15 → 16
      { name: "Sớm", level: 1, dur: 2 }                          // 05 → 06
    ]);
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[0].finish, "2026-01-16");

    t.case("lồng ba cấp: cha ngoài cùng bao trọn cháu");
    s = schedule(APP, [
      { name: "Hạng mục", level: 0 },
      { name: "Nhóm 1", level: 1 },
      { name: "A", level: 2, dur: 3 },              // 05 → 07
      { name: "B", level: 2, dur: 2, preds: "3" }   // 08 → 09
    ]);
    t.ok(s[0].summary);
    t.ok(s[1].summary);
    t.eq(s[1].start, "2026-01-05");
    t.eq(s[1].finish, "2026-01-09");
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[0].finish, "2026-01-09");
    t.eq(APP.blockEnd(0), 3);
    t.eq(APP.blockEnd(1), 3);

    t.case("cha chỉ tổng hợp con TRỰC TIẾP, cháu vào qua con");
    s = schedule(APP, [
      { name: "Cha", level: 0 },
      { name: "Con A", level: 1, dur: 2 },
      { name: "Cháu", level: 2, dur: 10 }           // 05 → 15
    ]);
    t.eq(s[1].finish, "2026-01-15", "Con A trở thành dòng tổng của Cháu");
    t.eq(s[0].finish, "2026-01-15");

    t.case("con là dòng trống thì bị bỏ qua khi tổng hợp");
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },
      { name: "", level: 1, dur: 30 },
      { name: "A", level: 1, dur: 2 }
    ]);
    t.eq(s[0].finish, "2026-01-06", "dòng trống không kéo dài dòng tổng");

    t.case("mọi con đều trống thì cha cũng là dòng trống");
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },
      { name: "", level: 1, dur: 5 },
      { name: "", level: 1, dur: 5 }
    ]);
    t.ok(s[0].blank);

    t.case("con lỗi thì cha báo lỗi con");
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },
      { name: "A", level: 1, dur: 2 },
      { name: "B", level: 1, dur: 2, preds: "99" }
    ]);
    t.eq(s[2].err, "ID sai");
    t.eq(s[0].err, "lỗi con");
    t.eq(s[0].start, "2026-01-05", "vẫn tổng hợp được từ con còn lại");

    t.case("việc khác có thể phụ thuộc vào dòng tổng");
    s = schedule(APP, [
      { name: "Nhóm", level: 0 },      // 05 → 09
      { name: "A", level: 1, dur: 3 },
      { name: "B", level: 1, dur: 2, preds: "2" },
      { name: "Sau nhóm", level: 0, dur: 1, preds: "1" }
    ]);
    t.eq(s[0].finish, "2026-01-09");
    t.eq(s[3].start, "2026-01-10");

    t.case("dòng cha không nhận mStart hay manual");
    s = schedule(APP, [
      { name: "Nhóm", level: 0, mStart: "20/01/2026", mode: "manual" },
      { name: "A", level: 1, dur: 2 }
    ]);
    t.ok(s[0].summary, "vẫn rollup, không thành manual");
    t.eq(s[0].start, "2026-01-05");
  } finally { closeApp(APP); }
};
