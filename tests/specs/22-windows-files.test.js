/* Cửa sổ, file và 🗂 Dự án của tôi.

   Mô hình hiện tại (người dùng chốt sau khi gỡ cơ chế phục hồi):

   · Mỗi dự án là MỘT CỬA SỔ riêng. Mở file .tdtc, hay bấm New khi cửa sổ đã
     có tài liệu, đều ra cửa sổ mới.
   · Đóng cửa sổ nào thì hỏi đúng tài liệu của cửa sổ đó — hộp Có/Không/Hủy.
     Chọn "Không" = bỏ hẳn, dự án bị GỠ khỏi 🗂 Dự án của tôi.
   · KHÔNG còn cơ chế hỏi phục hồi sau khi app tắt đột ngột. Quy tắc đầy đủ
     cho 🗂 Dự án của tôi sẽ được định nghĩa sau.                            */
const { loadApp, closeApp, makeState } = require("../helpers/env");

const tick = () => new Promise(r => setTimeout(r, 0));

exports.name = "cửa sổ & file — đóng, chuyển, Gần đây, Backstage";
exports.run = async function (t) {
  const APP = loadApp({ silent: true });
  const win = APP.__dom.window;
  const LS = win.localStorage;
  const $ = sel => win.document.querySelector(sel);
  const vis = sel => ($(sel) ? $(sel).style.display : "(không có)");

  try {
    /* ---------- Cơ chế phục hồi đã gỡ hẳn ---------- */
    t.case("mọi dấu vết của cơ chế phục hồi đã được gỡ");
    ["#recOverlay", "#ask2Overlay", "#nameOverlay"].forEach(sel =>
      t.ok(!$(sel), "không còn " + sel));
    ["pendingRecovery", "recoverOne", "maybeShowRecovery", "markUnsaved",
      "clearUnsavedFlag", "resolveParked", "openExternalDataAsk"].forEach(fn =>
        t.eq(typeof APP[fn], "undefined", "không còn hàm " + fn));

    t.case("save() không còn gắn cờ unsaved vào danh mục");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { name: "Dự án A", tasks: [{ name: "Đào móng", dur: 3 }] });
    APP.save();
    const e0 = APP.loadIndex().find(e => e.id === APP.currentId);
    t.ok(!!e0, "vẫn đăng ký vào danh mục");
    t.eq(e0.unsaved, undefined, "không còn cờ unsaved");

    /* ---------- Hộp nhắc lưu khi đóng cửa sổ ---------- */
    t.case("đóng cửa sổ khi có việc chưa lưu → hộp Có/Không/Hủy");
    t.eq(APP.hasUnsavedWork(), true, "có việc chưa ghi ra file");
    let p = APP.closeFlow();
    await tick();
    t.eq(vis("#svOverlay"), "flex", "hiện hộp nhắc lưu");
    $("#svCancel").onclick();
    t.eq(await p, false, "chọn Hủy → ở lại, không đóng");

    t.case("chọn Không thì đóng được, và dự án bị GỠ khỏi My Project");
    /* Người dùng không muốn thứ dở dang nằm lại trong 🗂 Dự án của tôi. */
    const idA = APP.currentId;
    p = APP.closeFlow();
    await tick();
    $("#svNo").onclick();
    t.eq(await p, true, "được phép đóng cửa sổ");
    t.eq(LS.getItem("tiendo_prj_" + idA), null, "đã xóa nội dung dự án");
    t.ok(!APP.loadIndex().some(e => e.id === idA), "đã gỡ khỏi danh mục");

    t.case("chọn Hủy thì KHÔNG xóa gì");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { name: "Giữ lại", tasks: [{ name: "Cống D600", dur: 4 }] });
    APP.save();
    const idKeep = APP.currentId;
    p = APP.closeFlow();
    await tick();
    $("#svCancel").onclick();
    t.eq(await p, false, "ở lại");
    t.ok(LS.getItem("tiendo_prj_" + idKeep) !== null, "dự án còn nguyên");

    t.case("không có gì chưa lưu thì đóng thẳng, không hỏi");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { tasks: [{ name: "", dur: 0 }] });
    $("#svOverlay").style.display = "none";
    t.eq(await APP.closeFlow(), true, "đóng luôn");
    t.eq(vis("#svOverlay"), "none", "không bật hộp nào");

    /* ---------- New cắt liên kết tới file .tdtc ---------- */
    t.case("resetSession cắt liên kết tới file — bấm New không kéo theo file cũ");
    /* Trước đây chỉ xóa fileHandle mà bỏ sót _srcUrl, nên sau khi New thì
       thanh tiêu đề vẫn hiện tên file cũ và save() gắn đường dẫn file cũ vào
       mục danh mục của dự án mới. */
    makeState(APP, { name: "Có file", tasks: [{ name: "San nền", dur: 2 }] });
    win._srcUrl = "C:/du-an/Cu.tdtc";
    win._srcName = "Cu.tdtc";
    win._extDirty = true;
    APP.newProject();
    t.eq(win._srcUrl, null, "_srcUrl đã cắt");
    t.eq(win._srcName, "", "_srcName đã cắt");
    t.eq(win._extDirty, false, "cờ sửa của file cũ đã tắt");
    t.eq(APP.state.name, "Dự án mới", "state đã reset");
    APP.save();
    const eNew = APP.loadIndex().find(e => e.id === APP.currentId);
    t.eq(eNew && eNew.srcUrl, undefined,
      "mục danh mục của dự án mới KHÔNG mang đường dẫn file cũ");

    /* ---------- Khóa chống mở một dự án ở hai cửa sổ ---------- */
    t.case("khóa 'đang mở ở cửa sổ nào'");
    LS.clear();
    t.eq(APP.openElsewhere("pZ"), false, "chưa ai giữ");
    APP.claimOpen("pZ");
    t.eq(APP.openElsewhere("pZ"), false, "chính cửa sổ này giữ thì không tính là nơi khác");
    const m = APP.loadOpenMap();
    m.pZ = { w: "cua-so-khac", ts: Date.now() };
    LS.setItem(APP.OPENKEY, JSON.stringify(m));
    t.eq(APP.openElsewhere("pZ"), true, "cửa sổ khác đang giữ");
    m.pZ = { w: "cua-so-khac", ts: Date.now() - 120000 };
    LS.setItem(APP.OPENKEY, JSON.stringify(m));
    t.eq(APP.openElsewhere("pZ"), false,
      "dấu quá hạn tự hết hiệu lực — cửa sổ tắt đột ngột không khóa vĩnh viễn");

    t.case("switchProject từ chối mở dự án đang ở cửa sổ khác");
    LS.setItem("tiendo_prj_pW", JSON.stringify({ name: "Của cửa sổ khác", tasks: [] }));
    APP.saveIndex([{ id: "pW", name: "Của cửa sổ khác", updated: 1 }]);
    const m2 = APP.loadOpenMap();
    m2.pW = { w: "cua-so-khac", ts: Date.now() };
    LS.setItem(APP.OPENKEY, JSON.stringify(m2));
    const truoc = APP.currentId;
    APP.switchProject("pW");
    t.eq(APP.currentId, truoc, "không chuyển sang, tránh hai cửa sổ ghi đè nhau");

    /* ---------- Danh sách file mở gần đây ---------- */
    t.case("danh sách Gần đây");
    LS.clear();
    t.eq(APP.loadRecent(), [], "ban đầu trống");
    APP.pushRecent("C:/du-an/A.tdtc", "A.tdtc");
    APP.pushRecent("C:/du-an/B.tdtc", "B.tdtc");
    APP.pushRecent("C:/du-an/A.tdtc", "A.tdtc");
    t.eq(APP.loadRecent().map(e => e.name), ["A.tdtc", "B.tdtc"],
      "mở lại file cũ thì nhảy lên đầu, không thành hai dòng");
    for (let k = 0; k < 30; k++) APP.pushRecent("C:/d/f" + k + ".tdtc", "f" + k);
    t.ok(APP.loadRecent().length <= 15, "có trần: " + APP.loadRecent().length);

    t.case("baseNameOf tách tên file cho cả hai kiểu dấu phân cách");
    t.eq(APP.baseNameOf("C:/du-an/A.tdtc"), "A.tdtc");
    t.eq(APP.baseNameOf("C:" + String.fromCharCode(92) + "du-an" + String.fromCharCode(92) + "B.tdtc"), "B.tdtc");
    t.eq(APP.baseNameOf(""), "");
    t.eq(APP.baseNameOf(null), "");

    /* ---------- Backstage ---------- */
    t.case("cửa sổ mở cho lệnh New vào thẳng bảng, không dừng ở Backstage");
    /* main.js nạp cửa sổ đó kèm hash #blank; renderer thấy hash này thì bỏ
       qua màn hình Backstage vì người dùng đã chọn "dự án trống" rồi. */
    const html = require("fs").readFileSync(
      require("path").join(__dirname, "..", "..", "src", "index.html"), "utf8");
    t.ok(html.indexOf('openWindow(null, { blank: true })') >= 0,
      "New xin cửa sổ trống kèm cờ blank");
    t.ok(html.indexOf('(location.hash || "") !== "#blank"') >= 0,
      "renderer bỏ qua Backstage khi mang hash #blank");
    const mainJs = require("fs").readFileSync(
      require("path").join(__dirname, "..", "..", "electron", "main.js"), "utf8");
    t.ok(mainJs.indexOf('{ hash: "blank" }') >= 0, "main.js nạp kèm hash đó");
    t.ok(mainJs.indexOf("function createWindow(filePath, opts)") >= 0, "createWindow nhận tuỳ chọn");

    t.case("Backstage có đủ rail và năm vùng");
    ["#startOverlay", "#stBack", "#stSave", "#stPrint", "#stCloseDoc",
      "#stBlank", "#stRecentList", "#stMineList", "#stHello", "#stVer",
      "#stOpenList", "#stBrowse", "#stBrowseSave", "#stSaveList"]
      .forEach(sel => t.ok(!!$(sel), "có " + sel));
    ["home", "new", "open", "saveas", "lang"].forEach(pane => {
      t.ok(!!win.document.querySelector('#startOverlay .st-nav[data-pane="' + pane + '"]'), "mục rail " + pane);
      t.ok(!!win.document.querySelector('#startOverlay .st-pane[data-pane="' + pane + '"]'), "vùng " + pane);
    });

    t.case("Backstage nằm DƯỚI mọi hộp thoại nên Lưu / In không phải đóng nó");
    const css = Array.from(win.document.querySelectorAll("style")).map(e => e.textContent).join(" ");
    const decl = css.slice(css.indexOf("#startOverlay{"));
    const zi = +decl.slice(decl.indexOf("z-index:") + 8).split(";")[0];
    t.ok(zi > 0, "có khai báo z-index: " + zi);
    t.ok(zi < 60, "phải thấp hơn hộp thoại thấp nhất (60), đang là " + zi);

    t.case("bấm tab File mở Backstage chứ không đổi bảng ribbon");
    win.document.querySelector('.rtabs button[data-tab="file"]').onclick();
    t.ok($("#startOverlay").classList.contains("on"), "Backstage đã mở");
    APP.stPane("open");
    t.ok(win.document.querySelector('#startOverlay .st-pane[data-pane="open"]').classList.contains("on"));
    APP.closeStart();
    t.ok(!$("#startOverlay").classList.contains("on"), "đóng được");

    t.case("vùng Mở gom file theo Hôm nay / Tuần trước / Cũ hơn");
    LS.clear();
    const DAY = 86400000;
    LS.setItem("tiendo_recent_v1", JSON.stringify([
      { path: "C:/d/homnay.tdtc", name: "homnay.tdtc", ts: Date.now() - 3600e3 },
      { path: "C:/d/tuantruoc.tdtc", name: "tuantruoc.tdtc", ts: Date.now() - 3 * DAY },
      { path: "C:/d/cu.tdtc", name: "cu.tdtc", ts: Date.now() - 40 * DAY }
    ]));
    APP.renderOpenPane();
    t.eq(win.document.querySelectorAll("#stOpenList .st-grp").length, 3, "ba nhóm thời gian");
    t.eq(win.document.querySelectorAll("#stOpenList .st-item").length, 3, "đủ ba file");

    t.case("vùng Lưu thành liệt kê THƯ MỤC đã dùng, không lặp");
    APP.renderSaveAsPane();
    const rows = win.document.querySelectorAll("#stSaveList .st-item");
    t.eq(rows.length, 1, "ba file cùng thư mục C:/d → một dòng");

    t.case("cột Dự án của tôi hiện mọi mục trừ mục đang mở ở cửa sổ khác");
    LS.clear();
    APP.saveIndex([
      { id: "pM1", name: "Dự án 1", updated: 9 },
      { id: "pM2", name: "Dự án 2", updated: 8 }
    ]);
    makeState(APP, { name: "Đang mở", tasks: [{ name: "X", dur: 1 }] });
    APP.renderStart();
    t.eq(win.document.querySelectorAll("#stMineList .st-item").length, 2, "hiện cả hai");
    const m3 = APP.loadOpenMap();
    m3.pM1 = { w: "cua-so-khac", ts: Date.now() };
    LS.setItem(APP.OPENKEY, JSON.stringify(m3));
    APP.renderStart();
    t.eq(win.document.querySelectorAll("#stMineList .st-item").length, 1,
      "giấu mục đang mở ở cửa sổ khác");

    t.case("purgeProject vẫn dùng được khi cần xóa hẳn");
    LS.setItem("tiendo_prj_pDel", JSON.stringify({ name: "x", tasks: [] }));
    APP.saveIndex([{ id: "pDel", name: "x", updated: 1 }]);
    APP.purgeProject("pDel");
    t.eq(LS.getItem("tiendo_prj_pDel"), null, "xóa state");
    t.ok(!APP.loadIndex().some(e => e.id === "pDel"), "xóa khỏi danh mục");

  } finally { closeApp(APP); }
};
