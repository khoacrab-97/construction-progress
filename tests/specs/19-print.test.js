/* In ấn — đầu ra QUAN TRỌNG NHẤT của app (CLAUDE.md §1 §3.4 §6.5). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "print — khổ giấy, token, bảng in";

const PX_MM = 96 / 25.4;
const round = v => Math.round(v * 100) / 100;

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    makeState(APP, {
      name: "Khu đô thị Nam Sông",
      tasks: [
        { name: "Đào móng", dur: 3, res: "10" },
        { name: "Đổ bê tông", dur: 2, preds: "1" }
      ],
      info: { congtrinh: "Hạ tầng kỹ thuật", hangmuc: "Đường giao thông", goithau: "Gói số 3", diadiem: "Tỉnh X" }
    });
    APP.renderAll();

    t.case("token thông tin dự án được thay đúng");
    t.eq(APP.prToken("{DUAN}"), "Khu đô thị Nam Sông");
    t.eq(APP.prToken("{CONGTRINH}"), "Hạ tầng kỹ thuật");
    t.eq(APP.prToken("{HANGMUC}"), "Đường giao thông");
    t.eq(APP.prToken("{GOITHAU}"), "Gói số 3");
    t.eq(APP.prToken("{DIADIEM}"), "Tỉnh X");

    t.case("token ngày lấy từ lịch đã tính, định dạng dd/mm/yyyy");
    t.eq(APP.prToken("{BATDAU}"), "05/01/2026");
    t.eq(APP.prToken("{KETTHUC}"), "09/01/2026");
    t.ok(/^\d{2}\/\d{2}\/\d{4}$/.test(APP.prToken("{NGAYIN}")), "ngày in: " + APP.prToken("{NGAYIN}"));

    t.case("nhiều token trong một câu, chữ xung quanh giữ nguyên");
    t.eq(APP.prToken("Công trình: {CONGTRINH} — từ {BATDAU} đến {KETTHUC}"),
      "Công trình: Hạ tầng kỹ thuật — từ 05/01/2026 đến 09/01/2026");

    t.case("token lặp lại đều được thay");
    t.eq(APP.prToken("{DUAN} / {DUAN}"), "Khu đô thị Nam Sông / Khu đô thị Nam Sông");

    t.case("chuỗi rỗng và chuỗi không có token không bị đụng tới");
    t.eq(APP.prToken(""), "");
    t.eq(APP.prToken(null), "");
    t.eq(APP.prToken("Không có token"), "Không có token");
    t.eq(APP.prToken("{KHONGTONTAI}"), "{KHONGTONTAI}", "token lạ để nguyên");

    t.case("token số trang do sectText thay, theo từng trang");
    t.eq(APP.sectText("Trang {TRANG}/{SOTRANG}", 2, 5), "Trang 2/5");
    t.eq(APP.sectText("Trang {TRANG}/{SOTRANG}", 1, 1), "Trang 1/1");
    t.eq(APP.sectText("{DUAN} — trang {TRANG}", 3, 9), "Khu đô thị Nam Sông — trang 3");

    t.case("A4 dọc: vùng in = khổ giấy trừ lề");
    APP.state.print.paper = "A4";
    APP.state.print.orient = "portrait";
    APP.state.print.margins = { t: 10, b: 10, l: 10, r: 10 };
    let sz = APP.printableSizePx();
    t.eq(round(sz.w), round((210 - 20) * PX_MM), "rộng 190mm");
    t.eq(round(sz.h), round((297 - 20) * PX_MM), "cao 277mm");

    t.case("A4 ngang: đảo chiều rộng/cao");
    APP.state.print.orient = "landscape";
    sz = APP.printableSizePx();
    t.eq(round(sz.w), round((297 - 20) * PX_MM));
    t.eq(round(sz.h), round((210 - 20) * PX_MM));

    t.case("A3 ngang rộng hơn A4 ngang");
    APP.state.print.paper = "A3";
    const a3 = APP.printableSizePx();
    t.ok(a3.w > sz.w, "A3 rộng hơn");
    t.eq(round(a3.w), round((420 - 20) * PX_MM));

    t.case("lề lớn hơn thì vùng in nhỏ lại");
    APP.state.print.margins = { t: 20, b: 20, l: 25, r: 25 };
    const narrow = APP.printableSizePx();
    t.ok(narrow.w < a3.w);
    t.eq(round(narrow.w), round((420 - 50) * PX_MM));

    t.case("khổ giấy lạ thì lùi về A4, không vỡ");
    APP.state.print.paper = "A0";
    APP.state.print.orient = "portrait";
    APP.state.print.margins = { t: 10, b: 10, l: 10, r: 10 };
    t.eq(round(APP.printableSizePx().w), round((210 - 20) * PX_MM));
    APP.state.print.paper = "A4";

    t.case("chọn cột in: chỉ in cột được tick");
    APP.state.print.cols = { stt: 1, name: 1, dur: 0, start: 0, finish: 0, preds: 0, res: 0 };
    let cols = APP.activePrintCols();
    t.eq(cols.map(c => c.k), ["stt", "name"]);

    t.case("bỏ tick hết thì vẫn giữ tối thiểu STT + Tên công việc");
    APP.state.print.cols = { stt: 0, name: 0, dur: 0, start: 0, finish: 0, preds: 0, res: 0 };
    cols = APP.activePrintCols();
    t.eq(cols.length, 2);
    t.eq(cols[0].k, "stt");
    t.eq(cols[1].k, "name");

    t.case("bề rộng bảng in = tổng bề rộng các cột được chọn");
    APP.state.print.cols = { stt: 1, name: 1, dur: 1, start: 1, finish: 1, preds: 1, res: 1 };
    const all = APP.activePrintCols();
    t.eq(APP.printTableWidth(), all.reduce((a, c) => a + c.w, 0) + 10);
    APP.state.print.cols.res = 0;
    t.ok(APP.printTableWidth() < all.reduce((a, c) => a + c.w, 0) + 10, "bỏ một cột thì hẹp lại");
    APP.state.print.cols.res = 1;

    t.case("bảng in dựng ra HTML có đủ dòng và đúng nội dung");
    const html = APP.buildPrintTable(0, 1);
    t.ok(html.indexOf("<table") >= 0, "là một bảng HTML");
    t.ok(html.indexOf("Đào móng") >= 0);
    t.ok(html.indexOf("Đổ bê tông") >= 0);
    t.ok(html.indexOf("05/01/2026") >= 0, "ngày in dạng dd/mm/yyyy");

    t.case("bảng in cắt đúng khoảng dòng được yêu cầu (phục vụ chia trang)");
    const only1 = APP.buildPrintTable(0, 0);
    t.ok(only1.indexOf("Đào móng") >= 0);
    t.ok(only1.indexOf("Đổ bê tông") < 0, "dòng ngoài khoảng không được in");

    t.case("bảng in thoát ký tự đặc biệt, không vỡ HTML");
    makeState(APP, { tasks: [{ name: "Lắp <ống> & phụ kiện", dur: 2 }] });
    APP.renderAll();
    const esc = APP.buildPrintTable(0, 0);
    t.ok(esc.indexOf("&lt;ống") >= 0, "dấu < được thoát");
    t.ok(esc.indexOf(">Lắp <ống") < 0, "không lọt thẻ HTML thô vào bảng in");
    t.ok(esc.indexOf("&amp;") >= 0, "dấu & được thoát");

    t.case("vị trí hiện của đầu trang/chân trang theo tùy chọn on");
    t.eq(APP.sectShow({ on: "every" }, 2, 5), true);
    t.eq(APP.sectShow({ on: "first" }, 1, 5), true);
    t.eq(APP.sectShow({ on: "first" }, 2, 5), false);
    t.eq(APP.sectShow({ on: "end" }, 5, 5), true, "chân trang chỉ ở trang cuối");
    t.eq(APP.sectShow({ on: "end" }, 4, 5), false);
    t.eq(APP.sectShow({ on: "none" }, 1, 1), false);
    t.eq(APP.sectShow(null, 1, 1), false, "không cấu hình = không hiện");

    t.case("chiều cao chân trang tăng theo số dòng chữ trong hộp");
    const h1 = APP.ftrHeightPx({ boxes: [{ text: "Một dòng", y: 0, fs: 10 }] });
    const h3 = APP.ftrHeightPx({ boxes: [{ text: "Một\nHai\nBa", y: 0, fs: 10 }] });
    t.ok(h3 > h1, "hộp 3 dòng cao hơn hộp 1 dòng");
    t.eq(APP.ftrHeightPx({ boxes: [] }), 22, "không có hộp nào vẫn chừa chỗ tối thiểu");
    t.ok(APP.ftrHeightPx({ boxes: [{ text: "x", y: 999, fs: 40 }] }) <= 240, "có trần chiều cao");

    t.case("cấu hình in mặc định đầy đủ và hợp lệ");
    const dp = APP.defaultPrint();
    t.ok(["A4", "A3"].includes(dp.paper), "khổ giấy mặc định: " + dp.paper);
    t.ok(["portrait", "landscape"].includes(dp.orient));
    t.ok(!!dp.margins && isFinite(dp.margins.t), "có lề mặc định");
    t.ok(!!APP.state.print.cols, "danh sách cột in được mergeDefaults bổ sung");
    t.ok(!!dp.hdr && !!dp.ftr, "có cấu hình đầu trang và chân trang");

    /* Thanh trạng thái từng bị sót trong danh sách ẩn khi in, và in ra thừa
       hẳn một trang chỉ có "40 dòng · Auto fit · Fit all · x ngày/cột".
       Nay ẩn theo cách chặn hết rồi chừa lại, nên thêm hộp thoại mới không
       tái phát được nữa. */
    t.case("khi in chỉ #printRoot được hiện, mọi thứ khác bị ẩn");
    const doc = APP.__dom.window.document;
    const win = APP.__dom.window;
    const printCss = Array.from(doc.querySelectorAll("style"))
      .map(e => e.textContent).join(String.fromCharCode(10))
      .split("@media print{")[1] || "";
    t.ok(printCss.indexOf("body>*{display:none!important}") >= 0,
      "chặn hết con trực tiếp của body");
    t.ok(printCss.indexOf("body>#printRoot{display:block!important}") >= 0,
      "rồi chừa lại đúng #printRoot");
    t.ok(printCss.indexOf("body>header,#main,#overlay") < 0,
      "không còn danh sách ẩn liệt kê tay — đó là chỗ đã quên #statusBar");

    t.case("thanh trạng thái và các hộp thoại đều là con trực tiếp của body");
    /* Nếu một ngày nào đó chúng bị bọc thêm một lớp div thì luật body>* hết
       tác dụng — canh luôn ở đây. */
    ["statusBar", "printOverlay", "prevOverlay", "svOverlay", "recOverlay", "updOverlay"]
      .forEach(id => {
        const el = doc.getElementById(id);
        t.ok(el && el.parentElement === doc.body, "#" + id + " là con trực tiếp của body");
      });
    t.ok(doc.getElementById("printRoot").parentElement === doc.body,
      "#printRoot cũng vậy, nếu không luật chừa lại sẽ trượt");

    /* Gõ một ký tự vào ô của hộp Page Setup từng rơi xuống nhánh "đang chọn
       mà gõ ký tự" của bộ bắt phím toàn cục, làm con trỏ nhảy về bảng công
       việc giữa chừng — gõ Header/Footer/Legend đều dính. */
    t.case("gõ trong hộp Page Setup KHÔNG kéo con trỏ về bảng công việc");
    makeState(APP, { tasks: [{ name: "Đào móng", dur: 3 }, { name: "Đổ bê tông", dur: 2 }] });
    APP.renderAll();
    const editingCount = () => doc.querySelectorAll("#gridBody .editing").length;
    const press = (el, key) => el.dispatchEvent(
      new win.KeyboardEvent("keydown", { key: key, bubbles: true, cancelable: true }));

    [["#phL", "Header trái"], ["#phC", "Header giữa"], ["#phR", "Header phải"],
     ["#pfBoxText", "hộp chữ Footer"], ["#pmT", "ô lề trên"], ["#rbStart", "ô Bắt đầu trên ribbon"]]
      .forEach(([sel, ten]) => {
        const el = doc.querySelector(sel);
        t.ok(!!el, "có ô " + sel);
        if (!el) return;
        APP.focusCell(0, 1);                       // con trỏ đang ở bảng
        doc.querySelectorAll("#gridBody .editing").forEach(x => x.classList.remove("editing"));
        press(el, "A");
        t.eq(editingCount(), 0, "gõ vào " + ten + " không mở ô nào trong bảng");
      });

    t.case("nhưng gõ trong chính bảng thì vẫn vào chế độ gõ như cũ");
    APP.focusCell(0, 1);
    doc.querySelectorAll("#gridBody .editing").forEach(x => x.classList.remove("editing"));
    const cellInput = doc.querySelector("#gridBody tr td input, #gridBody tr td textarea");
    t.ok(!!cellInput, "tìm được ô nhập trong bảng");
    if (cellInput) {
      press(cellInput, "A");
      t.ok(editingCount() > 0, "chốt mới không được chặn nhầm phím của bảng");
    }
  } finally { closeApp(APP); }
};
