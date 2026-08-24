/* Kiểm tra phần VẼ Gantt — chỗ dễ hỏng nhất và lỗi không hiện ra ngay
   (CLAUDE.md §13.3). Test này bắt các lỗi kiểu "mất vạch hôm nay",
   "thiếu thanh", "mất đường quan hệ" mà mắt thường khó thấy. */
const fs = require("fs");
const { loadApp, closeApp, makeState, APP_HTML } = require("../helpers/env");

exports.name = "render — cấu trúc SVG biểu đồ Gantt";

function svgOf(APP) { return APP.__dom.window.document.querySelector("#ganttSvg"); }
function count(svg, sel) { return svg.querySelectorAll(sel).length; }

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    makeState(APP, {
      tasks: [
        { name: "Nhóm 1", level: 0 },
        { name: "Đào móng", level: 1, dur: 3, res: "10" },
        { name: "Đổ bê tông", level: 1, dur: 2, preds: "2" },
        { name: "Bàn giao", level: 0, dur: 0, preds: "3" }
      ]
    });
    APP.renderAll();
    let svg = svgOf(APP);

    t.case("SVG được dựng với kích thước thật");
    t.ok(!!svg, "có #ganttSvg");
    t.ok(+svg.getAttribute("width") > 0, "width = " + svg.getAttribute("width"));
    t.ok(+svg.getAttribute("height") > 0, "height = " + svg.getAttribute("height"));
    t.eq(APP.sched.map(s => s.err), [null, null, null, null], "dữ liệu mẫu không có lỗi lịch");

    t.case("mỗi công việc thường có đúng một thanh");
    t.eq(count(svg, "rect.bar-leaf"), 2, "Đào móng + Đổ bê tông");

    t.case("mốc tiến độ vẽ hình kim cương, không phải thanh chữ nhật");
    const diamonds = [...svg.querySelectorAll("path")]
      .filter(p => !p.getAttribute("class") && /^M[\d.]+,\d+ L/.test(p.getAttribute("d") || ""));
    t.ok(diamonds.length >= 1, "có ít nhất một hình kim cương cho mốc");

    t.case("dòng tổng vẽ thanh riêng, khác màu thanh công việc thường");
    const leafFill = svg.querySelector("rect.bar-leaf").getAttribute("fill");
    const sumBars = [...svg.querySelectorAll("rect")].filter(r =>
      !r.getAttribute("class") && r.getAttribute("fill") !== leafFill &&
      +r.getAttribute("height") > 0 && +r.getAttribute("height") < 30);
    t.ok(sumBars.length >= 1, "có thanh dòng tổng");

    t.case("mỗi quan hệ phụ thuộc vẽ một đường nối");
    t.eq(count(svg, "path.link"), 2, "Đào móng→Đổ bê tông, Đổ bê tông→Bàn giao");

    t.case("đường nối có mũi tên");
    t.ok(count(svg, "marker#arrow") >= 1, "định nghĩa marker mũi tên trong <defs>");
    t.eq(svg.querySelector("path.link").getAttribute("class"), "link", "đường nối mang class .link");
    const css = fs.readFileSync(APP_HTML, "utf8");
    t.ok(/\.link\s*\{[^}]*marker-end:\s*url\(#arrow\)/.test(css), "CSS .link gắn mũi tên #arrow");

    t.case("vạch ngày bắt đầu dự án luôn được vẽ");
    t.eq(count(svg, "line.startline"), 1);

    t.case("ngày nghỉ được tô nền (Non-working time)");
    const nwtColor = APP.state.nwt.c;
    const nwt = [...svg.querySelectorAll("rect")].filter(r => r.getAttribute("fill") === nwtColor);
    t.ok(nwt.length >= 3, "các Chủ nhật trong tháng được tô: " + nwt.length + " vùng");

    t.case("thêm quan hệ thì thêm đúng một đường nối");
    const before = count(svg, "path.link");
    APP.state.tasks[3].preds = "2,3";
    APP.renderAll();
    svg = svgOf(APP);
    t.eq(count(svg, "path.link"), before + 1);

    t.case("tắt vẽ ngày nghỉ thì không còn vùng tô");
    APP.state.nwt.draw = "none";
    APP.renderAll();
    svg = svgOf(APP);
    t.eq([...svg.querySelectorAll("rect")].filter(r => r.getAttribute("fill") === nwtColor).length, 0);
    APP.state.nwt.draw = "behind";

    t.case("vạch HÔM NAY hiện khi tiến độ phủ ngày hôm nay");
    makeState(APP, { start: APP.toISO(new Date()), tasks: [{ name: "Đang thi công", dur: 30 }] });
    APP.state.barStyle.today = 1;
    APP.renderAll();
    svg = svgOf(APP);
    t.eq(count(svg, "line.todayline"), 2, "một vạch trên thang thời gian + một vạch dọc suốt biểu đồ");

    t.case("tắt vạch hôm nay thì vạch biến mất");
    APP.state.barStyle.today = 0;
    APP.renderAll();
    t.eq(count(svgOf(APP), "line.todayline"), 0);
    APP.state.barStyle.today = 1;

    t.case("vạch hôm nay KHÔNG vẽ khi hôm nay nằm ngoài phạm vi trục");
    makeState(APP, { start: "2020-01-06", tasks: [{ name: "Cũ", dur: 3 }] });
    APP.renderAll();
    t.eq(count(svgOf(APP), "line.todayline"), 0);

    t.case("bảng rỗng vẫn vẽ được, không ném lỗi");
    makeState(APP, { tasks: [{ name: "", dur: 0 }] });
    APP.renderAll();
    svg = svgOf(APP);
    t.ok(!!svg);
    t.eq(count(svg, "rect.bar-leaf"), 0, "không có thanh nào");
    t.eq(APP.__errors.length, 0, "không có lỗi JS trong suốt quá trình vẽ");

    t.case("thu gọn nhóm thì thanh của con không được vẽ");
    makeState(APP, {
      tasks: [
        { name: "Nhóm", level: 0 },
        { name: "A", level: 1, dur: 2 },
        { name: "B", level: 1, dur: 2, preds: "2" }
      ]
    });
    APP.renderAll();
    t.eq(count(svgOf(APP), "rect.bar-leaf"), 2);
    APP.state.tasks[0].collapsed = true;
    APP.renderAll();
    t.eq(count(svgOf(APP), "rect.bar-leaf"), 0, "con bị ẩn khi thu gọn nhóm");
  } finally { closeApp(APP); }
};
