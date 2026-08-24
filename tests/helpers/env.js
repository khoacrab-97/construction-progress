/* Môi trường kiểm thử: nạp src/index.html vào jsdom và trả về window.APP.
   Toàn bộ ứng dụng nằm trong một file HTML nên không import module được —
   cách duy nhất để chạm vào logic là dựng DOM thật rồi lấy window.APP. */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

/* Mặc định là bản đang làm việc. Đặt CP_APP_HTML để trỏ sang bản khác —
   dùng khi so ảnh chụp Gantt giữa hai phiên bản (CLAUDE.md §13.3):
     git show HEAD:src/index.html > /tmp/truoc.html
     CP_APP_HTML=/tmp/truoc.html node tests/snap.js truoc.svg
     node tests/snap.js sau.svg && diff truoc.svg sau.svg            */
const APP_HTML = process.env.CP_APP_HTML
  ? path.resolve(process.env.CP_APP_HTML)
  : path.join(__dirname, "..", "..", "src", "index.html");

/* Nạp app vào một jsdom mới.
   opts.silent = true  → nuốt log của app, chỉ giữ lỗi thật.
   opts.url            → đặt location (dùng để thử #open=...). */
function loadApp(opts = {}) {
  const html = fs.readFileSync(APP_HTML, "utf8");
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", e => errors.push(e));
  if (!opts.silent) vc.sendTo(console, { omitJSDOMErrors: true });

  const dom = new JSDOM(html, {
    url: opts.url || "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc
  });

  const win = dom.window;
  /* App gọi checkUpdate() sau 3s. Test không được đụng mạng. */
  win.fetch = () => Promise.reject(new Error("network disabled in tests"));

  if (!win.APP) {
    const detail = errors.length ? "\n" + errors.map(e => e.detail || e.message).join("\n") : "";
    dom.window.close();
    throw new Error("Nạp app thất bại: window.APP không tồn tại." + detail);
  }
  win.APP.__dom = dom;
  win.APP.__errors = errors;
  return win.APP;
}

/* Đóng jsdom để process không bị treo bởi timer của app. */
function closeApp(APP) {
  try { APP.__dom.window.close(); } catch (e) { }
}

/* Dựng state tối thiểu, đủ dùng cho phần lớn test lịch. */
function makeState(APP, over = {}) {
  const tasks = (over.tasks || []).map(t => Object.assign({
    name: "", level: 0, dur: 0, preds: "", res: "", mStart: "", custom: {}
  }, t));
  const st = Object.assign({}, APP.state, {
    name: "Test",
    start: "2026-01-05",              // thứ Hai
    workDays: [0, 1, 1, 1, 1, 1, 1],  // CN nghỉ, T7 làm
    holidays: [],
    calRanges: [],
    customCols: [],                   // tránh rò rỉ cột tùy chỉnh từ test trước
    colOrder: [],                     // mergeDefaults sẽ dựng lại
    colLabels: {}, colFmt: {}, colW: {},
    tasks: tasks
  }, over, { tasks: tasks });
  APP.state = st;
  clearSelection(APP);
  return st;
}

/* Dựng state, chạy compute(), trả lịch đã quy về chuỗi ISO cho dễ so sánh. */
function schedule(APP, tasks, over) {
  makeState(APP, Object.assign({ tasks: tasks }, over || {}));
  APP.compute();
  return APP.sched.map(s => {
    if (!s) return null;
    const o = {};
    for (const k of ["blank", "err", "summary", "manual", "ms", "dur"]) if (s[k] !== undefined && s[k] !== null) o[k] = s[k];
    if (s.start) o.start = APP.toISO(s.start);
    if (s.finish) o.finish = APP.toISO(s.finish);
    return o;
  });
}

/* Xóa mọi vùng chọn còn sót lại giữa các test — chọn ô/dòng/cột là trạng thái
   toàn cục của app, không thuộc state dự án. */
function clearSelection(APP) {
  try { APP.cellSel.clear(); } catch (e) { }
  try { APP.rowSel.clear(); } catch (e) { }
  try { APP.colSel.clear(); } catch (e) { }
  try { APP.select(-1); } catch (e) { }
}

module.exports = { loadApp, closeApp, makeState, schedule, clearSelection, APP_HTML };
