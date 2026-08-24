/* Bốn kiểu quan hệ, độ trễ, nhiều quan hệ lấy ngày muộn nhất
   (CLAUDE.md §6.1.1 §8.5). Mốc: dự án bắt đầu T2 05/01/2026, CN nghỉ. */
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "schedule liên kết — FS/SS/FF/SF, lag";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const A = { name: "A", dur: 3 };   // 05 → 07

    t.case("FS: bắt đầu sau khi việc trước kết thúc");
    let s = schedule(APP, [A, { name: "B", dur: 2, preds: "1FS" }]);
    t.eq(s[0].finish, "2026-01-07");
    t.eq(s[1].start, "2026-01-08");

    t.case("FS có độ trễ dương: chờ thêm N ngày làm việc");
    s = schedule(APP, [A, { name: "B", dur: 1, preds: "1FS+3" }]);
    t.eq(s[1].start, "2026-01-12", "07 + 4 ngày công, nhảy qua CN 11/01");

    t.case("FS có độ trễ âm: chồng lấn việc trước");
    s = schedule(APP, [A, { name: "B", dur: 1, preds: "1FS-1" }]);
    t.eq(s[1].start, "2026-01-07", "trùng ngày cuối của A");

    t.case("SS: bắt đầu cùng lúc việc trước");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1SS" }]);
    t.eq(s[1].start, "2026-01-05", "cùng ngày với A");
    t.eq(s[1].finish, "2026-01-06");

    t.case("SS có độ trễ: bắt đầu sau N ngày công kể từ khi việc trước bắt đầu");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1SS+2" }]);
    t.eq(s[1].start, "2026-01-07");

    t.case("FF: hai việc kết thúc cùng ngày");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1FF" }]);
    t.eq(s[1].finish, "2026-01-07", "cùng ngày kết thúc với A");
    t.eq(s[1].start, "2026-01-06");

    t.case("FF có độ trễ: kết thúc sau việc trước N ngày công");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1FF+1" }]);
    t.eq(s[1].finish, "2026-01-08");
    t.eq(s[1].start, "2026-01-07");

    t.case("SF có độ trễ lớn: kết thúc tính từ ngày bắt đầu việc trước");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1SF+10" }]);
    t.eq(s[1].finish, "2026-01-16");
    t.eq(s[1].start, "2026-01-15");

    t.case("không bao giờ sớm hơn ngày bắt đầu dự án");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1SF" }]);
    t.ok(s[1].start >= "2026-01-05", "SF lùi về quá khứ bị chặn ở ngày bắt đầu dự án");

    t.case("nhiều quan hệ → lấy ngày MUỘN NHẤT");
    s = schedule(APP, [
      { name: "A", dur: 2 },              // 05 → 06
      { name: "B", dur: 5 },              // 05 → 09
      { name: "C", dur: 1, preds: "1,2" }
    ]);
    t.eq(s[0].finish, "2026-01-06");
    t.eq(s[1].finish, "2026-01-09");
    t.eq(s[2].start, "2026-01-10", "theo B (muộn hơn), không theo A");

    t.case("thứ tự liệt kê không đổi kết quả");
    const s2 = schedule(APP, [
      { name: "A", dur: 2 },
      { name: "B", dur: 5 },
      { name: "C", dur: 1, preds: "2,1" }
    ]);
    t.eq(s2[2].start, "2026-01-10");

    t.case("phụ thuộc vào việc phía sau trong bảng vẫn tính đúng");
    s = schedule(APP, [
      { name: "A", dur: 2, preds: "2" },
      { name: "B", dur: 3 }
    ]);
    t.eq(s[1].finish, "2026-01-07");
    t.eq(s[0].start, "2026-01-08", "tính đệ quy, không phụ thuộc thứ tự dòng");

    t.case("bắt đầu tính ra rơi vào ngày nghỉ thì đẩy tới ngày làm việc kế");
    s = schedule(APP, [
      { name: "A", dur: 5 },              // 05 → 09 (T6)
      { name: "B", dur: 1, preds: "1FS+1" } // 09 + 2 công = 12
    ]);
    t.eq(s[1].start, "2026-01-12", "không rơi vào CN 11/01");
  } finally { closeApp(APP); }
};
