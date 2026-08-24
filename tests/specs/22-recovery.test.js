/* Lưu & phục hồi.

   Hai luồng nghiệp vụ:

   A. File .tdtc đang mở, app chết bất thường (mất điện, treo máy) → bản dở dang
      còn trong 🗂 Dự án của tôi, lần mở sau được hỏi có mở lại không. Chọn
      "Không" thì bỏ hẳn, không hỏi lại nữa.

   B. Dự án chưa từng ghi ra .tdtc, tắt thủ công → hộp Có/Không/Hủy. Chọn
      "Không" thì hỏi thêm có giữ trong 🗂 Dự án của tôi không; không giữ thì
      xóa hẳn, không để lại rác.

   Cơ chế: cờ `unsaved` trên từng mục của tiendo_idx_v1. Cờ còn sót lúc khởi
   động = lần trước app chết bất thường — vì tắt tử tế thì closeFlow() đã xóa.  */
const { loadApp, closeApp, makeState } = require("../helpers/env");

const tick = () => new Promise(r => setTimeout(r, 0));

exports.name = "recovery — cờ chưa lưu, luồng tắt app, phục hồi";
exports.run = async function (t) {
  const APP = loadApp({ silent: true });
  const win = APP.__dom.window;
  const LS = win.localStorage;
  const $ = sel => win.document.querySelector(sel);
  /* Bản trình duyệt: không có cầu desktop, closeFlow vẫn chạy đủ các nhánh. */
  const vis = sel => ($(sel) ? $(sel).style.display : "(không có)");

  try {
    t.case("hộp thoại mới có mặt trong DOM");
    ["#ask2Overlay", "#ask2Yes", "#ask2No", "#nameOverlay", "#nameInp", "#nameOk",
      "#nameCancel", "#recOverlay", "#recList", "#recDropSel", "#recLater"]
      .forEach(s => t.ok(!!$(s), "có " + s));

    t.case("baseNameOf tách tên file cho cả hai kiểu dấu phân cách");
    t.eq(APP.baseNameOf("C:/du-an/A.tdtc"), "A.tdtc");
    t.eq(APP.baseNameOf("C:" + String.fromCharCode(92) + "du-an" + String.fromCharCode(92) + "B.tdtc"), "B.tdtc");
    t.eq(APP.baseNameOf("C.tdtc"), "C.tdtc");
    t.eq(APP.baseNameOf(""), "");
    t.eq(APP.baseNameOf(null), "");

    /* ---------- isDiskDirty với dự án chưa có file ---------- */
    t.case("dự án trống chưa sửa thì không coi là chưa lưu");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { tasks: [{ name: "", dur: 0 }] });
    t.eq(APP.hasUnsavedWork(), false, "chưa sửa, chưa có nội dung");
    win._docDirty = true;
    t.eq(APP.hasUnsavedWork(), false, "có sửa nhưng không có nội dung thật → vẫn không hỏi");

    t.case("dự án có nội dung và đã sửa: hasUnsavedWork bắt, isDiskDirty thì không");
    win._docDirty = false;
    makeState(APP, { tasks: [{ name: "Đào móng", dur: 3 }] });
    t.eq(APP.hasUnsavedWork(), false, "mới nạp, chưa sửa");
    APP.save();
    t.eq(APP.hasUnsavedWork(), true, "tắt app sẽ hỏi");
    t.eq(APP.isDiskDirty(), false,
      "nhưng KHÔNG chặn tự cập nhật / Dự án mới — dữ liệu vẫn an toàn trong My Project");

    /* ---------- cờ unsaved trên danh mục ---------- */
    t.case("save() gắn cờ unsaved khi dự án gắn với một file .tdtc");
    LS.clear();
    win._docDirty = false;
    makeState(APP, { name: "Dự án A", tasks: [{ name: "San nền", dur: 5 }] });
    win._srcUrl = "C:/du-an/A.tdtc";
    APP.save();
    const idA = APP.currentId;
    const eA = APP.loadIndex().find(e => e.id === idA);
    t.ok(!!eA, "có mục trong danh mục");
    t.eq(eA.srcUrl, "C:/du-an/A.tdtc", "nhớ đường dẫn file");
    t.eq(eA.unsaved, 1, "có cờ chưa lưu");
    t.eq(APP.pendingRecovery().length, 1, "vào danh sách chờ phục hồi");

    t.case("clearUnsavedFlag xóa cờ nhưng giữ nguyên dự án");
    APP.clearUnsavedFlag(idA);
    t.eq(APP.pendingRecovery().length, 0, "hết chờ phục hồi");
    t.ok(LS.getItem("tiendo_prj_" + idA) !== null, "dữ liệu dự án vẫn còn");
    t.ok(APP.loadIndex().some(e => e.id === idA), "mục danh mục vẫn còn");

    t.case("markUnsaved bật lại cờ cho dự án đang mở");
    APP.markUnsaved();
    t.eq(APP.pendingRecovery().length, 1);

    t.case("dự án chưa gắn file thì KHÔNG vào danh sách phục hồi");
    LS.clear();
    win._srcUrl = null; win._docDirty = false;
    makeState(APP, { name: "Chưa lưu", tasks: [{ name: "Trồng cây", dur: 2 }] });
    APP.save();
    t.eq(APP.pendingRecovery().length, 0, "chỉ nằm im trong My Project, không nhắc phục hồi");

    t.case("purgeProject xóa sạch cả ba dấu vết");
    const idP = APP.currentId;
    LS.setItem("tiendo_cur_v1", idP);
    APP.purgeProject(idP);
    t.eq(LS.getItem("tiendo_prj_" + idP), null, "xóa state");
    t.ok(!APP.loadIndex().some(e => e.id === idP), "xóa khỏi danh mục");
    t.eq(LS.getItem("tiendo_cur_v1"), null, "xóa con trỏ dự án đang mở");

    /* ---------- Luồng B: tắt thủ công, dự án chưa có file ---------- */
    t.case("B — Hủy thì không được đóng app");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { name: "Gói thầu 1", tasks: [{ name: "Đào móng", dur: 3 }] });
    APP.save();
    let p = APP.closeFlow();
    await tick();
    t.eq(vis("#svOverlay"), "flex", "hiện hộp Có/Không/Hủy");
    $("#svCancel").onclick();
    t.eq(await p, false, "closeFlow trả false → ở lại app");
    t.eq(vis("#svOverlay"), "none", "hộp đã đóng");

    t.case("B — Không rồi Không: xóa hẳn khỏi 🗂 Dự án của tôi");
    const idB = APP.currentId;
    t.ok(LS.getItem("tiendo_prj_" + idB) !== null, "trước khi tắt vẫn còn");
    p = APP.closeFlow();
    await tick();
    $("#svNo").onclick();
    await tick();
    t.eq(vis("#ask2Overlay"), "flex", "hỏi tiếp: giữ trong Dự án của tôi?");
    $("#ask2No").onclick();
    t.eq(await p, true, "được phép đóng app");
    t.eq(LS.getItem("tiendo_prj_" + idB), null, "đã xóa state");
    t.ok(!APP.loadIndex().some(e => e.id === idB), "đã xóa khỏi danh mục — không để lại rác");

    t.case("B — Không rồi Có: đặt tên rồi cất vào 🗂 Dự án của tôi");
    LS.clear();
    win._srcUrl = null; win._docDirty = false;
    makeState(APP, { name: "Dự án mới", tasks: [{ name: "Cấp nước", dur: 4 }] });
    APP.save();
    const idC = APP.currentId;
    p = APP.closeFlow();
    await tick();
    $("#svNo").onclick();
    await tick();
    $("#ask2Yes").onclick();
    await tick();
    t.eq(vis("#nameOverlay"), "flex", "hiện hộp đặt tên");
    t.eq($("#nameInp").value, "Dự án mới", "điền sẵn tên hiện tại");
    $("#nameInp").value = "Đường N5 - Gói 2";
    $("#nameOk").onclick();
    t.eq(await p, true, "được phép đóng app");
    t.eq(APP.state.name, "Đường N5 - Gói 2", "tên mới đã áp vào state");
    t.ok(LS.getItem("tiendo_prj_" + idC) !== null, "state còn nguyên");
    t.ok(APP.loadIndex().some(e => e.id === idC && e.name === "Đường N5 - Gói 2"),
      "danh mục mang tên mới");

    t.case("B — hủy ở bước đặt tên thì quay lại, không đóng và không mất dữ liệu");
    win._docDirty = true;
    p = APP.closeFlow();
    await tick();
    $("#svNo").onclick();
    await tick();
    $("#ask2Yes").onclick();
    await tick();
    $("#nameCancel").onclick();
    t.eq(await p, false, "ở lại app");
    t.ok(LS.getItem("tiendo_prj_" + idC) !== null, "dự án vẫn còn nguyên");

    /* ---------- Luồng A: tắt thủ công một file .tdtc ---------- */
    t.case("A — chọn Không thì đóng bình thường và KHÔNG nhắc phục hồi lần sau");
    LS.clear();
    win._docDirty = false;
    makeState(APP, { name: "Hạ tầng", tasks: [{ name: "Cống D600", dur: 6 }] });
    win._srcUrl = "C:/du-an/HaTang.tdtc";
    win._srcName = "HaTang.tdtc";
    APP.save();
    win._extDirty = true;
    const idD = APP.currentId;
    t.eq(APP.pendingRecovery().length, 1, "đang có cờ chưa lưu");
    p = APP.closeFlow();
    await tick();
    t.eq(vis("#svOverlay"), "flex", "vẫn hỏi Có/Không/Hủy");
    $("#svNo").onclick();
    t.eq(await p, true, "đóng app luôn, không hỏi thêm");
    t.eq(vis("#ask2Overlay"), "none", "không hỏi câu thứ hai với file đã có sẵn");
    t.eq(APP.pendingRecovery().length, 0, "cờ đã xóa → lần mở sau không nhắc phục hồi");
    t.ok(LS.getItem("tiendo_prj_" + idD) !== null, "dự án vẫn nằm trong My Project");

    /* ---------- Hộp phục hồi nhiều mục ---------- */
    t.case("danh sách phục hồi chỉ gồm mục có cờ unsaved VÀ gắn file");
    LS.clear();
    win._srcUrl = null; win._srcName = ""; win._extDirty = false;
    APP.saveIndex([
      { id: "pA", name: "Dự án A", updated: 1, srcUrl: "C:/d/A.tdtc", unsaved: 1 },
      { id: "pB", name: "Dự án B", updated: 2, srcUrl: "C:/d/B.tdtc", unsaved: 1 },
      { id: "pC", name: "Dự án C", updated: 3, srcUrl: "C:/d/C.tdtc" },
      { id: "pD", name: "Dự án D", updated: 4, unsaved: 1 }
    ]);
    t.eq(APP.pendingRecovery().length, 2, "C thiếu cờ, D thiếu file → loại");
    t.eq(APP.renderRecList(), 2, "danh sách vẽ 2 dòng");
    t.eq(win.document.querySelectorAll("#recList .recCb").length, 2, "mỗi dòng một ô tick");

    t.case("bỏ dần từng mục, hết mục thì không hiện hộp nữa");
    t.eq(APP.maybeShowRecovery(), true, "còn mục → hiện hộp");
    t.eq(vis("#recOverlay"), "flex");
    APP.clearUnsavedFlag("pA");
    t.eq(APP.renderRecList(), 1, "còn một mục chờ");
    t.eq(APP.pendingRecovery().map(e => e.id), ["pB"], "đúng mục còn lại");
    APP.clearUnsavedFlag("pB");
    t.eq(APP.renderRecList(), 0);
    $("#recOverlay").style.display = "none";
    t.eq(APP.maybeShowRecovery(), false, "hết mục → không hiện hộp");

    t.case("bỏ hàng loạt qua ô tick");
    APP.saveIndex([
      { id: "pA", name: "A", updated: 1, srcUrl: "C:/d/A.tdtc", unsaved: 1 },
      { id: "pB", name: "B", updated: 2, srcUrl: "C:/d/B.tdtc", unsaved: 1 },
      { id: "pC", name: "C", updated: 3, srcUrl: "C:/d/C.tdtc", unsaved: 1 }
    ]);
    APP.renderRecList();
    const cbs = Array.from(win.document.querySelectorAll("#recList .recCb"));
    t.eq(cbs.length, 3);
    cbs[0].checked = true; cbs[2].checked = true;
    $("#recDropSel").onclick();
    t.eq(APP.pendingRecovery().map(e => e.id), ["pB"], "bỏ đúng hai mục đã tick");

    t.case("'Để sau' chỉ đóng hộp, các mục vẫn chờ lần mở sau");
    APP.maybeShowRecovery();
    $("#recLater").onclick();
    t.eq(vis("#recOverlay"), "none", "hộp đã đóng");
    t.eq(APP.pendingRecovery().length, 1, "mục chưa xử lý vẫn còn chờ");

    /* ---------- Mở lại file .tdtc khi bản trong máy mới hơn ---------- */
    t.case("mở file có bản dở dang: hỏi trước, KHÔNG âm thầm đè");
    LS.clear();
    win._srcUrl = null; win._extDirty = false;
    const draft = JSON.parse(JSON.stringify(APP.state));
    draft.name = "BẢN DỞ DANG";
    draft.tasks = [{ name: "Việc mới thêm chưa lưu", level: 0, dur: 7, preds: "", res: "", mStart: "", custom: {} }];
    LS.setItem("tiendo_prj_pX", JSON.stringify(draft));
    APP.saveIndex([{ id: "pX", name: "BẢN DỞ DANG", updated: 9, srcUrl: "C:/d/X.tdtc", unsaved: 1 }]);
    const onDisk = JSON.parse(JSON.stringify(APP.state));
    onDisk.name = "BẢN TRÊN ĐĨA";
    onDisk.tasks = [{ name: "Việc cũ", level: 0, dur: 2, preds: "", res: "", mStart: "", custom: {} }];

    p = APP.openExternalDataAsk("C:/d/X.tdtc", onDisk, { name: "X.tdtc" });
    await tick();
    t.eq(vis("#ask2Overlay"), "flex", "có hỏi trước khi nạp");
    t.ne(APP.state.name, "BẢN TRÊN ĐĨA", "chưa nạp gì khi còn đang hỏi");
    $("#ask2Yes").onclick();
    await p;
    t.eq(APP.state.name, "BẢN DỞ DANG", "chọn Có → lấy bản dở dang, không lấy nội dung file");
    t.eq(APP.state.tasks[0].name, "Việc mới thêm chưa lưu");
    t.eq(win._extDirty, true, "vẫn tính là chưa ghi ra file");
    t.eq(APP.pendingRecovery().length, 1, "vẫn còn cờ cho tới khi lưu ra .tdtc");

    t.case("chọn Không thì lấy nội dung file và bỏ cờ, lần sau không hỏi lại");
    LS.clear();
    win._srcUrl = null; win._extDirty = false;
    LS.setItem("tiendo_prj_pY", JSON.stringify(draft));
    APP.saveIndex([{ id: "pY", name: "BẢN DỞ DANG", updated: 9, srcUrl: "C:/d/Y.tdtc", unsaved: 1 }]);
    p = APP.openExternalDataAsk("C:/d/Y.tdtc", onDisk, { name: "Y.tdtc" });
    await tick();
    $("#ask2No").onclick();
    await p;
    t.eq(APP.state.name, "BẢN TRÊN ĐĨA", "nạp đúng nội dung file");
    t.eq(APP.pendingRecovery().length, 0, "cờ đã bỏ — chỉ hỏi đúng một lần");

    t.case("file không có bản dở dang thì mở thẳng, không hỏi gì");
    LS.clear();
    win._srcUrl = null; win._extDirty = false;
    $("#ask2Overlay").style.display = "none";
    p = APP.openExternalDataAsk("C:/d/Z.tdtc", onDisk, { name: "Z.tdtc" });
    t.eq(vis("#ask2Overlay"), "none", "không hiện hộp hỏi");
    await p;
    t.eq(APP.state.name, "BẢN TRÊN ĐĨA");

  } finally { closeApp(APP); }
};
