/* Ràng buộc mStart ("không bắt đầu sớm hơn") và chế độ manual
   (CLAUDE.md §8.6 §8.7). mStart là ràng buộc VÔ HÌNH trên giao diện —
   đây là nguyên nhân thường gặp khi người dùng báo "quan hệ chạy sai". */
const { loadApp, closeApp, schedule } = require("../helpers/env");

exports.name = "schedule ràng buộc — mStart, manual";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const A = { name: "A", dur: 3 };  // 05 → 07

    t.case("mStart muộn hơn ngày tính từ quan hệ thì mStart thắng");
    let s = schedule(APP, [A, { name: "B", dur: 2, preds: "1", mStart: "15/01/2026" }]);
    t.eq(s[1].start, "2026-01-15");
    t.eq(s[1].finish, "2026-01-16");

    t.case("mStart sớm hơn ngày tính từ quan hệ thì bị bỏ qua");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1", mStart: "06/01/2026" }]);
    t.eq(s[1].start, "2026-01-08", "quan hệ vẫn thắng — đây là ràng buộc 'không sớm hơn'");

    t.case("mStart không có quan hệ: đẩy công việc khỏi ngày bắt đầu dự án");
    s = schedule(APP, [{ name: "A", dur: 2, mStart: "09/01/2026" }]);
    t.eq(s[0].start, "2026-01-09");

    t.case("mStart rơi vào ngày nghỉ thì đẩy tới ngày làm việc kế");
    s = schedule(APP, [{ name: "A", dur: 2, mStart: "11/01/2026" }]);
    t.eq(s[0].start, "2026-01-12", "CN 11/01 → T2 12/01");

    t.case("mStart sai định dạng thì bị bỏ qua, không làm hỏng lịch");
    s = schedule(APP, [{ name: "A", dur: 2, mStart: "linh tinh" }]);
    t.eq(s[0].start, "2026-01-05");
    t.eq(s[0].err, undefined);

    t.case("mStart 31/02 không tồn tại thì bị bỏ qua");
    s = schedule(APP, [{ name: "A", dur: 2, mStart: "31/02/2026" }]);
    t.eq(s[0].start, "2026-01-05");

    t.case("manual bỏ qua hoàn toàn quan hệ phụ thuộc");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1", mStart: "06/01/2026", mode: "manual" }]);
    t.ok(s[1].manual, "được đánh dấu manual");
    t.eq(s[1].start, "2026-01-06", "giữ ngày người dùng chốt, không đợi A");
    t.eq(s[1].finish, "2026-01-07");

    t.case("manual không có mStart thì về ngày bắt đầu dự án");
    s = schedule(APP, [A, { name: "B", dur: 2, preds: "1", mode: "manual" }]);
    t.eq(s[1].start, "2026-01-05");

    t.case("manual vẫn đẩy khỏi ngày nghỉ");
    s = schedule(APP, [{ name: "A", dur: 2, mStart: "11/01/2026", mode: "manual" }]);
    t.eq(s[0].start, "2026-01-12");

    t.case("manual với dur = 0 vẫn là mốc tiến độ");
    s = schedule(APP, [{ name: "Mốc", dur: 0, mStart: "09/01/2026", mode: "manual" }]);
    t.ok(s[0].ms);
    t.ok(s[0].manual);
    t.eq(s[0].start, s[0].finish);
    t.eq(s[0].start, "2026-01-09");

    t.case("manual không báo lỗi dù quan hệ sai cú pháp");
    s = schedule(APP, [{ name: "A", dur: 2, preds: "abc", mode: "manual" }]);
    t.eq(s[0].err, undefined);

    t.case("việc phía sau vẫn nối tiếp đúng theo việc manual");
    s = schedule(APP, [
      { name: "A", dur: 2, mStart: "09/01/2026", mode: "manual" }, // 09 → 10
      { name: "B", dur: 1, preds: "1" }
    ]);
    t.eq(s[0].finish, "2026-01-10");
    t.eq(s[1].start, "2026-01-12");
  } finally { closeApp(APP); }
};
