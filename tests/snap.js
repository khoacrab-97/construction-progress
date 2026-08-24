#!/usr/bin/env node
/* Chụp ảnh chuẩn phần vẽ Gantt — quy trình bắt buộc ở CLAUDE.md §13.3.
 *
 *   node tests/snap.js snap_before.svg     ← trước khi sửa
 *   ... sửa code ...
 *   node tests/snap.js snap_after.svg      ← sau khi sửa
 *   diff snap_before.svg snap_after.svg    ← khác biệt PHẢI giải thích được
 *
 * Dự án mẫu cố định (ngày cứng, không phụ thuộc "hôm nay") nên hai lần chụp
 * chỉ khác nhau khi lõi vẽ thay đổi.
 */
const fs = require("fs");
const path = require("path");
const { loadApp, closeApp, makeState } = require("./helpers/env");

/* Dự án mẫu: đủ 4 loại dòng (tổng, thường, mốc, dòng trống), có quan hệ,
   có ngày lễ, có nhân lực — chạm vào hầu hết nhánh vẽ. */
const FIXTURE = {
  start: "2026-01-05",
  workDays: [0, 1, 1, 1, 1, 1, 1],
  holidays: ["2026-01-16"],
  tasks: [
    { name: "Hạ tầng kỹ thuật", level: 0 },
    { name: "Đào móng", level: 1, dur: 4, res: "Nhân công[10]" },
    { name: "Đổ bê tông lót", level: 1, dur: 2, preds: "2", res: "8" },
    { name: "Lắp cống thoát nước", level: 1, dur: 6, preds: "3SS+1", res: "Thợ ống[6]" },
    { name: "Nghiệm thu phần ngầm", level: 1, dur: 0, preds: "4" },
    { name: "", level: 0 },
    { name: "Cảnh quan", level: 0 },
    { name: "San nền", level: 1, dur: 3, preds: "5", res: "12" },
    { name: "Trồng cây xanh", level: 1, dur: 5, preds: "8FF+2", res: "Công nhân[15]" }
  ]
};

function snapshot() {
  const APP = loadApp({ silent: true });
  try {
    makeState(APP, FIXTURE);
    APP.state.barStyle.today = 0;   // vạch "hôm nay" phụ thuộc ngày chạy → tắt cho ảnh ổn định
    APP.state.ts.auto = 0;
    APP.state.ts.zoom = 18;         // px/ngày cố định thay vì phụ thuộc bề rộng khung
    APP.renderAll();
    const doc = APP.__dom.window.document;
    const parts = ["ganttHeadSvg", "ganttSvg", "histoSvg"].map(id => {
      const el = doc.querySelector("#" + id);
      return "<!-- " + id + " -->\n" + (el ? el.outerHTML : "(không có)");
    });
    if (APP.__errors.length) {
      console.error("CẢNH BÁO: có " + APP.__errors.length + " lỗi JS khi vẽ.");
    }
    return prettify(parts.join("\n\n"));
  } finally { closeApp(APP); }
}

/* Mỗi thẻ một dòng để `diff` chỉ ra đúng phần tử thay đổi. */
function prettify(svg) {
  return svg.replace(/></g, ">\n<");
}

const out = process.argv[2];
const text = snapshot();
if (!out) {
  process.stdout.write(text + "\n");
} else {
  fs.writeFileSync(path.resolve(out), text, "utf8");
  const lines = text.split("\n").length;
  console.log("Đã ghi " + out + " — " + lines + " dòng, " + text.length + " ký tự.");
}
