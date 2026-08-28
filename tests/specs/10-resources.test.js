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

    /* Chữ "NHÂN LỰC (người)" từng vẽ ở x=12 còn số trục Y ở x=3 — đè lên nhau.
       Nay có máng trái, và bề rộng máng bám theo vị trí chữ do người dùng kéo. */
    t.case("chữ NHÂN LỰC nằm trong máng trái, không đè lên số trục Y");
    makeState(APP, { tasks: [{ name: "A", dur: 5, res: "44" }, { name: "B", dur: 4, res: "16" }] });
    APP.renderAll();
    const draw = x => {
      APP.state.histo.ytX = x;
      const svg = APP.buildHistoPrintSvg(280);
      const yt = svg.querySelector(".yTitle");
      const tick = svg.querySelector("text.ytick");
      const plot = svg.querySelector("g[transform]");
      return {
        w: +svg.getAttribute("width"),
        ytx: +yt.getAttribute("x"),
        tickX: +tick.getAttribute("x"),
        tickAnchor: tick.getAttribute("text-anchor"),
        shift: +String(plot.getAttribute("transform")).replace("translate(","").split(",")[0]
      };
    };
    const d0 = draw(0);
    t.eq(d0.tickAnchor, "end", "số trục Y canh phải để dồn sát vùng vẽ");
    t.ok(d0.ytx < d0.tickX, "chữ đứng bên trái số: " + d0.ytx + " < " + d0.tickX);
    t.ok(d0.tickX <= d0.shift, "số nằm gọn trong máng, không tràn vào vùng vẽ");
    t.ok(d0.shift > 0, "vùng vẽ được đẩy khỏi mép trái");

    t.case("kéo chữ sang phải bao nhiêu thì trục Y đẩy theo đúng bấy nhiêu");
    const d40 = draw(40);
    t.eq(d40.shift - d0.shift, 40, "kéo 40px → vùng vẽ dịch đúng 40px");
    t.eq(d40.ytx - d0.ytx, 40, "chữ cũng dịch đúng 40px");
    t.eq(d40.w - d0.w, 40, "khung SVG rộng thêm đúng 40px, không cắt mất biểu đồ");
    const d90 = draw(90);
    t.eq(d90.shift - d0.shift, 90);
    t.ok(d90.ytx < d90.tickX && d90.tickX <= d90.shift, "kéo xa vẫn không chồng lấn");
    APP.state.histo.ytX = 0;

    t.case("vị trí chữ được lưu vào state nên bản in dùng đúng chỗ đã đặt");
    const hd = APP.mergeDefaults && APP.state.histo;
    t.ok(hd && "ytX" in hd && "ytY" in hd, "state.histo có ytX/ytY");
    t.eq(APP.state.histo.ytY, 0.5, "mặc định nằm giữa trục");

  } finally { closeApp(APP); }
};
