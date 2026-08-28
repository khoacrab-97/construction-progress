/* Lưu & phục hồi.

   Hai luồng nghiệp vụ:

   A. File .tdtc đang mở, app chết bất thường (mất điện, treo máy) → bản dở dang
      còn trong 🗂 Dự án của tôi, lần mở sau được hỏi có mở lại không. Chọn
      "Không" thì bỏ hẳn, không hỏi lại nữa.

   B. Dự án chưa từng ghi ra .tdtc, tắt thủ công → hộp Có/Không/Hủy. Chọn
      "Không" là xóa hẳn: 🗂 Dự án của tôi chỉ là BÃI ĐỖ TẠM, không phải kho
      lưu trữ, nên không còn bước "giữ lại trong My Project" nữa.
      Bấm New nhiều lần thì nhiều dự án đỗ lại; đóng cửa sổ hỏi một lượt về
      tất cả — lưu ra .tdtc, hoặc xóa hết.

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
  /* Mục chỉ có dòng danh mục mà không có nội dung sẽ bị pendingRecovery() lọc
     ra — dựng cả nội dung cho đúng đời thật. */
  const seed = ids => ids.forEach(id => LS.setItem("tiendo_prj_" + id,
    JSON.stringify({ name: id, tasks: [{ name: "Việc của " + id }] })));

  try {
    t.case("hộp thoại mới có mặt trong DOM");
    ["#ask2Overlay", "#ask2Msg", "#ask2Sub", "#ask2Icon", "#ask2Yes", "#ask2No",
      "#nameOverlay", "#nameInp", "#nameOk", "#nameCancel",
      "#recOverlay", "#recList", "#recLater", "#svMsg", "#svSub"]
      .forEach(s => t.ok(!!$(s), "có " + s));
    t.ok(!$("#recDropSel"), "đã bỏ nút bỏ-hàng-loạt, mỗi dòng chỉ còn Mở lại / Bỏ");
    t.ok(!!$("#svOverlay .dlg"), "hộp nhắc lưu dùng khung .dlg mới");
    t.ok(!$("#svOverlay .modal"), "không còn khung .modal cũ");

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

    t.case("dự án MỚI chưa có file cũng vào danh sách phục hồi");
    /* 🗂 Dự án của tôi là bãi đỗ tạm: đóng cửa sổ tử tế thì dọn sạch, nên thứ
       còn sót lúc khởi động là đồ của lần app chết — dù có file hay không. */
    LS.clear();
    win._srcUrl = null; win._docDirty = false;
    makeState(APP, { name: "Chưa lưu", tasks: [{ name: "Trồng cây", dur: 2 }] });
    APP.save();
    t.eq(APP.pendingRecovery().length, 1, "mất điện xong vẫn cứu được dự án chưa kịp đặt tên file");
    t.eq(APP.pendingRecovery()[0].srcUrl, undefined, "mục này chưa gắn file nào");

    t.case("mục còn sót từ bản cũ KHÔNG bị hiểu nhầm là đồ sót sau khi app chết");
    LS.clear();
    APP.saveIndex([{ id: "pOld", name: "Dự án từ bản trước", updated: 1 }]);
    LS.setItem("tiendo_prj_pOld", JSON.stringify({ name: "Dự án từ bản trước", tasks: [] }));
    t.eq(APP.pendingRecovery().length, 0, "không có cờ unsaved thì không bị lôi ra hỏi");
    t.ok(LS.getItem("tiendo_prj_pOld") !== null, "và cũng không bị xóa");

    t.case("purgeProject xóa sạch cả ba dấu vết");
    const idP = APP.currentId;
    LS.setItem("tiendo_cur_v1", idP);
    APP.purgeProject(idP);
    t.eq(LS.getItem("tiendo_prj_" + idP), null, "xóa state");
    t.ok(!APP.loadIndex().some(e => e.id === idP), "xóa khỏi danh mục");
    t.eq(LS.getItem("tiendo_cur_v1"), null, "xóa con trỏ dự án đang mở");

    /* ---------- Luồng B: tắt thủ công, dự án chưa có file ---------- */
    t.case("B — Hủy thì không được đóng app, dòng phụ nói đúng trường hợp");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    makeState(APP, { name: "Gói thầu 1", tasks: [{ name: "Đào móng", dur: 3 }] });
    APP.save();
    let p = APP.closeFlow();
    await tick();
    t.eq(vis("#svOverlay"), "flex", "hiện hộp Có/Không/Hủy");
    t.ok(/chưa từng được lưu/.test($("#svSub").textContent),
      "dự án chưa có file → dòng phụ nói rõ điều đó: " + $("#svSub").textContent);
    $("#svCancel").onclick();
    t.eq(await p, false, "closeFlow trả false → ở lại app");
    t.eq(vis("#svOverlay"), "none", "hộp đã đóng");

    t.case("B — chọn Không là xóa hẳn, không hỏi thêm bước nào");
    const idB = APP.currentId;
    t.ok(LS.getItem("tiendo_prj_" + idB) !== null, "trước khi tắt vẫn còn");
    p = APP.closeFlow();
    await tick();
    $("#svNo").onclick();
    t.eq(await p, true, "được phép đóng app");
    t.eq(vis("#ask2Overlay"), "none",
      "My Project là bãi đỗ tạm nên không còn hỏi 'giữ lại trong My Project?'");
    t.eq(LS.getItem("tiendo_prj_" + idB), null, "đã xóa state");
    t.ok(!APP.loadIndex().some(e => e.id === idB), "đã xóa khỏi danh mục — không để lại rác");

    t.case("nhiều dự án đỗ lại: đóng cửa sổ hỏi MỘT lượt về tất cả");
    /* Bấm New nhiều lần thì dự án cũ đỗ lại trong My Project. */
    LS.clear();
    win._srcUrl = null; win._docDirty = false;
    win._parked = new Set();
    ["pk1", "pk2"].forEach((id, i) => {
      LS.setItem("tiendo_prj_" + id, JSON.stringify({ name: "Đỗ lại " + (i + 1), tasks: [] }));
      win._parked.add(id);
    });
    APP.saveIndex([
      { id: "pk1", name: "Đỗ lại 1", updated: 1, unsaved: 1 },
      { id: "pk2", name: "Đỗ lại 2", updated: 2, unsaved: 1 },
      { id: "pOther", name: "Của cửa sổ khác", updated: 3, unsaved: 1 }
    ]);
    LS.setItem("tiendo_prj_pOther", JSON.stringify({ name: "Của cửa sổ khác", tasks: [] }));
    makeState(APP, { name: "Đang mở", tasks: [{ name: "X", dur: 1 }] });
    p = APP.resolveParked();
    await tick();
    t.eq(vis("#ask2Overlay"), "flex", "có hỏi về những dự án đỗ lại");
    t.ok($("#ask2Msg").textContent.indexOf("2") >= 0,
      "đếm đúng 2 mục của cửa sổ này: " + $("#ask2Msg").textContent);
    t.ok($("#ask2Sub").textContent.indexOf("Đỗ lại 1") >= 0, "liệt kê tên từng dự án");
    $("#ask2No").onclick();
    t.eq(await p, true, "được phép đóng");
    t.eq(LS.getItem("tiendo_prj_pk1"), null, "chọn Không → xóa hẳn");
    t.eq(LS.getItem("tiendo_prj_pk2"), null);
    t.ok(LS.getItem("tiendo_prj_pOther") !== null,
      "KHÔNG đụng mục của cửa sổ khác — đó là dữ liệu người ta đang dùng");

    t.case("không có gì đỗ lại thì không hỏi han gì");
    win._parked = new Set();
    t.eq(await APP.resolveParked(), true, "qua thẳng");

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
    t.ok(/ghi đè/.test($("#svSub").textContent),
      "dự án đã có file → dòng phụ nói về ghi đè: " + $("#svSub").textContent);
    $("#svNo").onclick();
    t.eq(await p, true, "đóng app luôn, không hỏi thêm");
    t.eq(vis("#ask2Overlay"), "none", "không hỏi câu thứ hai với file đã có sẵn");
    t.eq(APP.pendingRecovery().length, 0, "cờ đã xóa → lần mở sau không nhắc phục hồi");
    t.ok(LS.getItem("tiendo_prj_" + idD) !== null, "dự án vẫn nằm trong My Project");

    /* ---------- Hộp phục hồi nhiều mục ---------- */
    t.case("danh sách phục hồi gồm mọi mục còn cờ unsaved, có file hay không");
    LS.clear();
    win._srcUrl = null; win._srcName = ""; win._extDirty = false;
    APP.saveIndex([
      { id: "pA", name: "Dự án A", updated: 1, srcUrl: "C:/d/A.tdtc", unsaved: 1 },
      { id: "pB", name: "Dự án B", updated: 2, srcUrl: "C:/d/B.tdtc", unsaved: 1 },
      { id: "pC", name: "Dự án C", updated: 3, srcUrl: "C:/d/C.tdtc" },
      { id: "pD", name: "Dự án D", updated: 4, unsaved: 1 }
    ]);
    seed(["pA", "pB", "pC", "pD"]);
    t.eq(APP.pendingRecovery().length, 3, "chỉ C bị loại vì thiếu cờ; D không có file vẫn được cứu");
    t.eq(APP.renderRecList(), 3, "danh sách vẽ 3 dòng");
    t.eq(win.document.querySelectorAll("#recList .recRow").length, 3, "mỗi mục một dòng");
    t.eq(win.document.querySelectorAll("#recList input").length, 0, "không còn ô tích nào");
    t.eq(win.document.querySelectorAll("#recList .recRow")[0].querySelectorAll("button").length, 2,
      "mỗi dòng đúng hai nút: Mở lại và Bỏ");

    t.case("bỏ dần từng mục, hết mục thì không hiện hộp nữa");
    t.eq(APP.maybeShowRecovery(), true, "còn mục → hiện hộp");
    t.eq(vis("#recOverlay"), "flex");
    APP.clearUnsavedFlag("pA");
    t.eq(APP.renderRecList(), 2, "còn hai mục chờ");
    t.eq(APP.pendingRecovery().map(e => e.id), ["pB", "pD"], "đúng mục còn lại");
    APP.clearUnsavedFlag("pB");
    APP.clearUnsavedFlag("pD");
    t.eq(APP.renderRecList(), 0);
    $("#recOverlay").style.display = "none";
    t.eq(APP.maybeShowRecovery(), false, "hết mục → không hiện hộp");

    t.case("nút Bỏ trên từng dòng gỡ đúng mục đó");
    APP.saveIndex([
      { id: "pA", name: "A", updated: 1, srcUrl: "C:/d/A.tdtc", unsaved: 1 },
      { id: "pB", name: "B", updated: 2, srcUrl: "C:/d/B.tdtc", unsaved: 1 },
      { id: "pC", name: "C", updated: 3, srcUrl: "C:/d/C.tdtc", unsaved: 1 }
    ]);
    seed(["pA", "pB", "pC"]);
    APP.renderRecList();
    const rows = () => Array.from(win.document.querySelectorAll("#recList .recRow"));
    t.eq(rows().length, 3);
    /* Nút thứ hai của mỗi dòng là "Bỏ". Bỏ dòng đầu rồi bỏ dòng cuối. */
    rows()[0].querySelectorAll("button")[1].onclick();
    t.eq(APP.pendingRecovery().map(e => e.id), ["pB", "pC"], "gỡ đúng mục đầu");
    rows()[1].querySelectorAll("button")[1].onclick();
    t.eq(APP.pendingRecovery().map(e => e.id), ["pB"], "gỡ đúng mục cuối, mục giữa còn nguyên");

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
    t.ok(APP.pendingRecovery().some(e => e.id === "pX"),
      "bản dở dang vẫn còn cờ cho tới khi lưu ra .tdtc");

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
    t.ok(!APP.pendingRecovery().some(e => e.id === "pY"),
      "cờ của mục đó đã bỏ — chỉ hỏi đúng một lần");

    t.case("file không có bản dở dang thì mở thẳng, không hỏi gì");
    LS.clear();
    win._srcUrl = null; win._extDirty = false;
    $("#ask2Overlay").style.display = "none";
    p = APP.openExternalDataAsk("C:/d/Z.tdtc", onDisk, { name: "Z.tdtc" });
    t.eq(vis("#ask2Overlay"), "none", "không hiện hộp hỏi");
    await p;
    t.eq(APP.state.name, "BẢN TRÊN ĐĨA");


    /* Đổi ý so với thiết kế đầu: phục hồi KHÔNG còn ghi đè file gốc nữa.
       Mở bản dở dang ra rồi bấm Lưu sẽ tạo một .tdtc KHÁC. File gốc chỉ đổi
       khi người dùng chủ động chọn đè lên nó. */
    t.case("phục hồi KHÔNG ghi đè file gốc — Lưu sẽ tạo file mới");
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    const draft2 = JSON.parse(JSON.stringify(APP.state));
    draft2.name = "BẢN CỨU ĐƯỢC";
    draft2.tasks = [{ name: "Việc gõ dở lúc mất điện", level: 0, dur: 9,
                      preds: "", res: "", mStart: "", custom: {} }];
    LS.setItem("tiendo_prj_pR", JSON.stringify(draft2));
    APP.saveIndex([{ id: "pR", name: "BẢN CỨU ĐƯỢC", updated: 7,
                     srcUrl: "C:/du-an/Goc.tdtc", unsaved: 1 }]);
    await APP.recoverOne("pR");
    t.eq(APP.state.name, "BẢN CỨU ĐƯỢC", "nạp đúng bản dở dang");
    t.eq(APP.state.tasks[0].name, "Việc gõ dở lúc mất điện", "giữ nguyên phần gõ chưa lưu");
    t.eq(win._srcUrl, null, "đã CẮT liên kết tới file gốc — Lưu sẽ mở hộp Lưu thành");
    const eR = APP.loadIndex().find(x => x.id === APP.currentId);
    t.ok(!!eR, "vẫn có mục trong My Project");
    t.eq(eR.srcUrl, undefined, "mục không còn trỏ tới file gốc");
    t.eq(eR.unsaved, 1, "vẫn là việc chưa ghi ra đĩa, crash lần nữa vẫn cứu được");
    t.eq(APP.hasUnsavedWork(), true, "đóng cửa sổ sẽ hỏi lưu");


    t.case("phục hồi dự án CHƯA từng có file thì giữ nguyên id");
    /* Đi qua openExternalData sẽ sinh id mới vì nó tra theo srcUrl — mục cũ
       mắc kẹt trong danh sách phục hồi mãi không dứt. */
    LS.clear();
    win._srcUrl = null; win._extDirty = false; win._docDirty = false;
    const d3 = JSON.parse(JSON.stringify(APP.state));
    d3.name = "CHUA CO FILE";
    d3.tasks = [{ name: "Gõ dở chưa kịp đặt tên file", level: 0, dur: 4,
                  preds: "", res: "", mStart: "", custom: {} }];
    LS.setItem("tiendo_prj_pN", JSON.stringify(d3));
    APP.saveIndex([{ id: "pN", name: "CHUA CO FILE", updated: 5, unsaved: 1 }]);
    await APP.recoverOne("pN");
    t.eq(APP.currentId, "pN", "GIỮ NGUYÊN id, không sinh mục mới");
    t.eq(APP.state.tasks[0].name, "Gõ dở chưa kịp đặt tên file", "nạp đúng bản dở dang");
    t.eq(APP.loadIndex().filter(e => e.name === "CHUA CO FILE").length, 1,
      "không nhân bản mục trong danh mục");
    t.eq(win._srcUrl, null, "vẫn chưa gắn file nào — Lưu sẽ mở hộp Lưu thành");

    /* ---------- Màn hình đầu ---------- */
    t.case("Backstage có đủ mục rail và các vùng nội dung");
    ["#startOverlay", "#stBack", "#stSave", "#stSaveAs", "#stPrint", "#stCloseDoc",
      "#stBlank", "#stRecentList", "#stMineList", "#stHello", "#stVer",
      "#stOpenList", "#stBrowse"]
      .forEach(sel => t.ok(!!$(sel), "có " + sel));
    ["home", "new", "open", "lang"].forEach(p => {
      t.ok(!!win.document.querySelector('#startOverlay .st-nav[data-pane="' + p + '"]'), "có mục rail " + p);
      t.ok(!!win.document.querySelector('#startOverlay .st-pane[data-pane="' + p + '"]'), "có vùng " + p);
    });

    t.case("bấm tab File mở Backstage chứ không đổi bảng ribbon");
    t.ok(!!win.document.querySelector('.rtabs button[data-tab="file"]'), "vẫn có tab File");
    win.document.querySelector('.rtabs button[data-tab="file"]').onclick();
    t.ok($("#startOverlay").classList.contains("on"), "Backstage đã mở");

    t.case("chuyển qua lại giữa các vùng");
    APP.stPane("open");
    t.ok(win.document.querySelector('#startOverlay .st-pane[data-pane="open"]').classList.contains("on"),
      "vùng Mở đang hiện");
    t.ok(!win.document.querySelector('#startOverlay .st-pane[data-pane="home"]').classList.contains("on"),
      "vùng Home đã ẩn");
    APP.stPane("home");
    t.ok(win.document.querySelector('#startOverlay .st-pane[data-pane="home"]').classList.contains("on"));
    APP.closeStart();

    t.case("vùng Mở gom file theo Hôm nay / Tuần trước / Cũ hơn");
    LS.clear();
    const DAY = 86400000;
    LS.setItem("tiendo_recent_v1", JSON.stringify([
      { path: "C:/d/homnay.tdtc", name: "homnay.tdtc", ts: Date.now() - 3600e3 },
      { path: "C:/d/tuantruoc.tdtc", name: "tuantruoc.tdtc", ts: Date.now() - 3 * DAY },
      { path: "C:/d/cu.tdtc", name: "cu.tdtc", ts: Date.now() - 40 * DAY }
    ]));
    APP.renderOpenPane();
    const caps = Array.from(win.document.querySelectorAll("#stOpenList .st-grp")).map(e => e.textContent);
    t.eq(caps.length, 3, "ba nhóm thời gian: " + caps.join(" / "));
    t.eq(win.document.querySelectorAll("#stOpenList .st-item").length, 3, "đủ ba file");

    t.case("danh sách file mở gần đây");
    LS.clear();
    t.eq(APP.loadRecent(), [], "ban đầu trống");
    APP.pushRecent("C:/du-an/A.tdtc", "A.tdtc");
    APP.pushRecent("C:/du-an/B.tdtc", "B.tdtc");
    t.eq(APP.loadRecent().map(e => e.name), ["B.tdtc", "A.tdtc"], "mới nhất lên đầu");
    APP.pushRecent("C:/du-an/A.tdtc", "A.tdtc");
    t.eq(APP.loadRecent().map(e => e.name), ["A.tdtc", "B.tdtc"],
      "mở lại file cũ thì nhảy lên đầu, KHÔNG thành hai dòng");
    t.eq(APP.loadRecent().length, 2);
    for (let k = 0; k < 30; k++) APP.pushRecent("C:/d/f" + k + ".tdtc", "f" + k);
    t.ok(APP.loadRecent().length <= 15, "có trần, không phình mãi: " + APP.loadRecent().length);
    t.eq(LS.getItem("tiendo_recent_v1") !== null, true, "lưu ở khóa riêng, không đụng danh mục");

    t.case("màn hình đầu vẽ đúng Gần đây và 🗂 Dự án của tôi");
    LS.clear();
    APP.pushRecent("C:/du-an/HaTang.tdtc", "HaTang.tdtc");
    APP.saveIndex([
      { id: "pM1", name: "Bản dở dang", updated: 9, unsaved: 1 },
      { id: "pM2", name: "Dự án từ bản cũ", updated: 8 }
    ]);
    makeState(APP, { name: "Đang mở", tasks: [{ name: "X", dur: 1 }] });
    APP.renderStart();
    const rec = win.document.querySelectorAll("#stRecentList .st-item");
    t.eq(rec.length, 1, "một dòng Gần đây");
    t.ok(rec[0].textContent.indexOf("HaTang.tdtc") >= 0, "hiện tên file");
    const mine = win.document.querySelectorAll("#stMineList .st-item");
    t.eq(mine.length, 2, "hiện cả bản dở dang lẫn mục từ bản cũ — không giấu của ai");
    t.ok(mine[0].textContent.indexOf("🛟") >= 0, "bản dở dang có dấu phao cứu sinh");

    t.case("mở / đóng màn hình đầu");
    APP.openStart();
    t.ok($("#startOverlay").classList.contains("on"), "đã mở");
    APP.closeStart();
    t.ok(!$("#startOverlay").classList.contains("on"), "đã đóng");


    t.case("dự án RỖNG không bị lôi vào danh sách phục hồi");
    /* Cờ unsaved có thể còn sót từ phiên mà người dùng gõ rồi xóa hết.
       Mời cứu một dự án trống là làm phiền, mỗi lần khởi động một lần. */
    LS.clear();
    LS.setItem("tiendo_prj_pEmpty", JSON.stringify({ name: "Dự án mới", tasks: [{ name: "" }] }));
    LS.setItem("tiendo_prj_pFull", JSON.stringify({ name: "Có việc", tasks: [{ name: "Đào móng" }] }));
    APP.saveIndex([
      { id: "pEmpty", name: "Dự án mới", updated: 1, unsaved: 1 },
      { id: "pFull", name: "Có việc", updated: 2, unsaved: 1 }
    ]);
    t.eq(APP.pendingRecovery().map(e => e.id), ["pFull"], "chỉ mời cứu cái có việc thật");
    t.ok(LS.getItem("tiendo_prj_pEmpty") !== null, "nhưng KHÔNG tự xóa của người ta");
    t.eq(APP.stateHasContentOf(null), false, "state không đọc được thì coi như rỗng");
    t.eq(APP.stateHasContentOf({ tasks: [{ name: "  " }] }), false, "toàn khoảng trắng vẫn là rỗng");
    t.eq(APP.stateHasContentOf({ tasks: [], customCols: [{ id: "cc1" }] }), true,
      "có cột tùy chỉnh cũng là có nội dung");

  } finally { closeApp(APP); }
};
