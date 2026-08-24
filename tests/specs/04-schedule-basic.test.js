/* Forward pass cơ bản: ngày bắt đầu dự án, FS nối tiếp, mốc, dòng trống
   (CLAUDE.md §8.1 §8.2 §8.3). */
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "schedule cơ bản — FS, mốc, dòng trống";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("công việc đầu tiên bắt đầu đúng ngày bắt đầu dự án");
    let s = schedule(APP, [{ name: "Đào móng", dur: 3 }]);
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[0].finish, "2026-01-07", "3 ngày công: 05, 06, 07");
    t.eq(s[0].dur, 3);

    t.case("thời lượng 1 ngày: bắt đầu = kết thúc");
    s = schedule(APP, [{ name: "A", dur: 1 }]);
    t.eq(s[0].start, s[0].finish);

    t.case("thời lượng vắt qua ngày nghỉ thì kéo dài theo lịch");
    s = schedule(APP, [{ name: "A", dur: 8 }]);
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[0].finish, "2026-01-13", "8 ngày công, nhảy qua CN 11/01");

    t.case("ngày bắt đầu dự án rơi vào ngày nghỉ thì đẩy tới ngày làm việc kế");
    s = schedule(APP, [{ name: "A", dur: 1 }], { start: "2026-01-11" }); // Chủ nhật
    t.eq(s[0].start, "2026-01-12", "CN 11/01 → T2 12/01");

    t.case("FS mặc định: nối đuôi ngay ngày làm việc kế tiếp");
    s = schedule(APP, [
      { name: "A", dur: 3 },
      { name: "B", dur: 2, preds: "1" }
    ]);
    t.eq(s[0].finish, "2026-01-07");
    t.eq(s[1].start, "2026-01-08", "ngay sau khi A xong");
    t.eq(s[1].finish, "2026-01-09");

    t.case("chuỗi FS ba công việc");
    s = schedule(APP, [
      { name: "A", dur: 2 },
      { name: "B", dur: 2, preds: "1" },
      { name: "C", dur: 2, preds: "2" }
    ]);
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[1].start, "2026-01-07");
    t.eq(s[2].start, "2026-01-09");

    t.case("dur = 0 là mốc tiến độ");
    s = schedule(APP, [
      { name: "A", dur: 3 },
      { name: "Bàn giao", dur: 0, preds: "1" }
    ]);
    t.ok(s[1].ms, "được đánh dấu là mốc");
    t.eq(s[1].dur, 0);
    t.eq(s[1].start, s[1].finish, "mốc không có độ dài");
    t.eq(s[1].start, "2026-01-08");

    t.case("dòng tên rỗng bị bỏ qua khi tính lịch");
    s = schedule(APP, [
      { name: "A", dur: 2 },
      { name: "", dur: 5 },
      { name: "C", dur: 2, preds: "1" }
    ]);
    t.ok(s[1].blank, "dòng trống");
    t.eq(s[1].start, undefined, "dòng trống không có ngày");
    t.eq(s[2].start, "2026-01-07", "dòng trống không đẩy lịch của C");

    t.case("dòng chỉ có khoảng trắng cũng là dòng trống");
    s = schedule(APP, [{ name: "   ", dur: 3 }]);
    t.ok(s[0].blank);

    t.case("thời lượng âm hoặc rác được ép về 0");
    s = schedule(APP, [{ name: "A", dur: -5 }, { name: "B", dur: "xyz" }]);
    t.eq(s[0].dur, 0);
    t.eq(s[1].dur, 0);

    t.case("phụ thuộc vào dòng trống bị báo ID sai");
    s = schedule(APP, [
      { name: "", dur: 2 },
      { name: "B", dur: 2, preds: "1" }
    ]);
    t.eq(s[1].err, "ID sai");

    t.case("ID nằm ngoài bảng bị báo ID sai");
    s = schedule(APP, [{ name: "A", dur: 2, preds: "99" }]);
    t.eq(s[0].err, "ID sai");

    t.case("tự phụ thuộc chính mình bị báo ID sai");
    s = schedule(APP, [{ name: "A", dur: 2, preds: "1" }]);
    t.eq(s[0].err, "ID sai");

    t.case("cú pháp sai được báo, lịch vẫn tính được");
    s = schedule(APP, [{ name: "A", dur: 2, preds: "abc" }]);
    t.eq(s[0].err, "cú pháp");
    t.eq(s[0].start, "2026-01-05", "vẫn về ngày bắt đầu dự án");
  } finally { closeApp(APP); }
};
