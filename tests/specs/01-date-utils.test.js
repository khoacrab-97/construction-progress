/* Ngày tháng LUÔN dd/mm/yyyy, không theo locale máy (CLAUDE.md §13.1 #8). */
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "date-utils — dd/mm/yyyy, ISO, parse";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const { fromISO, toISO, fmtDMY, fmtDM, parseDMY } = APP;

    t.case("fromISO/toISO đi vòng không lệch");
    t.eq(toISO(fromISO("2026-01-05")), "2026-01-05");
    t.eq(toISO(fromISO("2026-12-31")), "2026-12-31");
    t.eq(toISO(fromISO("2024-02-29")), "2024-02-29", "năm nhuận");

    t.case("fromISO tạo ngày local, không lệch múi giờ");
    const d = fromISO("2026-03-01");
    t.eq(d.getFullYear(), 2026);
    t.eq(d.getMonth() + 1, 3);
    t.eq(d.getDate(), 1);
    t.eq(d.getHours(), 0, "phải là nửa đêm local");

    t.case("fmtDMY luôn dd/mm/yyyy có đệm số 0");
    t.eq(fmtDMY(fromISO("2026-01-05")), "05/01/2026");
    t.eq(fmtDMY(fromISO("2026-11-09")), "09/11/2026");
    t.eq(fmtDMY(fromISO("2026-12-25")), "25/12/2026");
    t.ne(fmtDMY(fromISO("2026-01-05")), "01/05/2026", "không được ra mm/dd/yyyy");

    t.case("fmtDM là dd/mm");
    t.eq(fmtDM(fromISO("2026-01-05")), "05/01");

    t.case("parseDMY nhận dd/mm/yyyy và các dấu ngăn cách");
    t.eq(toISO(parseDMY("05/01/2026")), "2026-01-05");
    t.eq(toISO(parseDMY("5/1/2026")), "2026-01-05", "không đệm số 0");
    t.eq(toISO(parseDMY("05-01-2026")), "2026-01-05");
    t.eq(toISO(parseDMY("05.01.2026")), "2026-01-05");
    t.eq(toISO(parseDMY("  05/01/2026  ")), "2026-01-05", "bỏ khoảng trắng thừa");

    t.case("parseDMY hiểu năm 2 chữ số là 20xx");
    t.eq(toISO(parseDMY("05/01/26")), "2026-01-05");

    t.case("parseDMY cũng nhận dạng ISO");
    t.eq(toISO(parseDMY("2026-01-05")), "2026-01-05");

    t.case("parseDMY trả null khi không hợp lệ");
    t.eq(parseDMY(""), null);
    t.eq(parseDMY(null), null);
    t.eq(parseDMY("99/99/2026"), null, "ngày/tháng vượt ngưỡng");
    t.eq(parseDMY("31/02/2026"), null, "31/02 không tồn tại");
    t.eq(parseDMY("linh tinh"), null);

    t.case("parseDMY KHÔNG diễn giải theo kiểu Mỹ");
    t.eq(toISO(parseDMY("03/04/2026")), "2026-04-03", "03/04 = 3 tháng 4, không phải 4 tháng 3");
  } finally { closeApp(APP); }
};
