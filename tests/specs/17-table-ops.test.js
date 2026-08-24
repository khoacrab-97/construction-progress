/* Thao tác dòng của bảng và việc ĐÁNH SỐ LẠI quan hệ phụ thuộc.
   Chèn/xóa dòng phải kéo theo cập nhật số trong cột "Quan hệ phụ thuộc",
   nếu không sẽ sai lịch âm thầm (CLAUDE.md §13.1 #6). */
const { loadApp, closeApp, makeState } = require("../helpers/env");

exports.name = "table-ops — chèn/xóa dòng, đánh số lại preds";

function names(APP) { return APP.state.tasks.map(t => t.name || ""); }
function preds(APP) { return APP.state.tasks.map(t => t.preds || ""); }

/* Bật dòng tổng dự án đúng cách (qua chính hàm của app). */
function pstOn(APP) { APP.renderAll(); APP.setProjectSummary(true); }

exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    t.case("chèn dòng ở đầu: preds được dời số theo");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    APP.renderAll();
    APP.insertTaskAt(0, 0);
    t.eq(names(APP), ["", "A", "B"]);
    t.eq(preds(APP)[2], "2", "B vẫn trỏ vào A (nay mang STT 2)");

    t.case("chèn dòng ở giữa: chỉ số phía sau bị dời");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }, { name: "C", dur: 2, preds: "2" }] });
    APP.renderAll();
    APP.insertTaskAt(1, 0);
    t.eq(names(APP), ["A", "", "B", "C"]);
    t.eq(preds(APP)[2], "1", "B vẫn trỏ vào A — A không đổi số");
    t.eq(preds(APP)[3], "3", "C vẫn trỏ vào B (nay mang STT 3)");

    t.case("chèn nhiều dòng cùng lúc");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    APP.renderAll();
    APP.insertTasksAt(0, 0, 2);
    t.eq(APP.state.tasks.length, 4);
    t.eq(preds(APP)[3], "3", "dời hai bậc");

    t.case("chèn dòng giữ nguyên kiểu quan hệ và độ trễ");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1FS+3" }] });
    APP.renderAll();
    APP.insertTaskAt(0, 0);
    t.eq(preds(APP)[2], "2FS+3");

    t.case("chèn dòng cập nhật đúng cả danh sách nhiều quan hệ");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2 }, { name: "C", dur: 2, preds: "1,2" }] });
    APP.renderAll();
    APP.insertTaskAt(0, 0);
    t.eq(preds(APP)[3], "2,3");

    t.case("§13.1 #6 — CÓ dòng tổng dự án: chèn dòng vẫn trỏ đúng");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    pstOn(APP);
    t.eq(preds(APP)[2], "1", "trước khi chèn: B trỏ vào A (STT 1)");
    APP.insertTaskAt(1, 1);
    t.eq(names(APP)[2], "A", "A bị đẩy xuống một dòng");
    t.eq(preds(APP)[3], "2", "B phải trỏ vào STT 2 — KHÔNG được giữ nguyên '1'");
    APP.compute();
    t.eq(APP.toISO(APP.sched[3].start), "2026-01-07", "lịch của B vẫn nối sau A, không đổi");

    t.case("§13.1 #6 — CÓ dòng tổng dự án: chèn nhiều dòng vẫn trỏ đúng");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    pstOn(APP);
    APP.insertTasksAt(1, 1, 1);
    t.eq(preds(APP)[3], "2");

    t.case("xóa dòng: các dòng sau được đánh số lại");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }, { name: "C", dur: 2, preds: "1" }] });
    APP.renderAll();
    APP.selectRows([1]);
    APP.delTask();
    t.eq(names(APP), ["A", "C"]);
    t.eq(preds(APP)[1], "1", "C vẫn trỏ vào A");

    t.case("xóa dòng đang được trỏ tới: quan hệ đó bị gỡ bỏ");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }, { name: "C", dur: 2, preds: "1,2" }] });
    APP.renderAll();
    APP.selectRows([0]);
    APP.delTask();
    t.eq(names(APP), ["B", "C"]);
    t.eq(preds(APP)[0], "", "B mất quan hệ vì A đã bị xóa");
    t.eq(preds(APP)[1], "1", "C chỉ còn quan hệ tới B (nay mang STT 1)");

    t.case("xóa dòng cha thì xóa cả khối con");
    makeState(APP, {
      tasks: [
        { name: "Nhóm", level: 0 },
        { name: "A", level: 1, dur: 2 },
        { name: "B", level: 1, dur: 2 },
        { name: "Ngoài nhóm", level: 0, dur: 2 }
      ]
    });
    APP.renderAll();
    APP.selectRows([0]);
    APP.delTask();
    t.eq(names(APP), ["Ngoài nhóm"]);

    t.case("xóa dòng tổng dự án = tắt Project Summary Task, không mất công việc");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    pstOn(APP);
    APP.selectRows([0]);
    APP.delTask();
    t.ok(!APP.hasPST(), "dòng tổng đã tắt");
    t.eq(names(APP), ["A", "B"], "công việc còn nguyên");
    t.eq(preds(APP)[1], "1", "quan hệ trỏ lại đúng sau khi đánh số lại");

    t.case("tăng/giảm cấp bằng indent");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }, { name: "B", dur: 2, preds: "1" }] });
    APP.renderAll();
    APP.selectRows([1]);
    APP.indent(1);
    t.eq(APP.state.tasks[1].level, 1, "B thành con của A");
    t.ok(APP.isSummary(0), "A trở thành dòng tổng");
    APP.indent(-1);
    t.eq(APP.state.tasks[1].level, 0);
    t.ok(!APP.isSummary(0));

    t.case("dòng đầu tiên không tăng cấp được (không có cha phía trên)");
    APP.selectRows([0]);
    APP.indent(1);
    t.eq(APP.state.tasks[0].level, 0);

    t.case("indent kéo theo cả khối con");
    makeState(APP, {
      tasks: [
        { name: "Trên", level: 0, dur: 1 },
        { name: "Nhóm", level: 0 },
        { name: "Con", level: 1, dur: 2 }
      ]
    });
    APP.renderAll();
    APP.selectRows([1]);
    APP.indent(1);
    t.eq(APP.state.tasks.map(x => x.level), [0, 1, 2], "con đi theo cha");

    t.case("chuyển khối dòng bằng moveBlockTo");
    makeState(APP, { tasks: [{ name: "A", dur: 1 }, { name: "B", dur: 1 }, { name: "C", dur: 1 }] });
    APP.renderAll();
    APP.moveBlockTo(0, 3);
    t.eq(names(APP), ["B", "C", "A"]);

    t.case("chuyển cha thì con đi theo");
    makeState(APP, {
      tasks: [
        { name: "Nhóm", level: 0 },
        { name: "Con 1", level: 1, dur: 1 },
        { name: "Con 2", level: 1, dur: 1 },
        { name: "Khác", level: 0, dur: 1 }
      ]
    });
    APP.renderAll();
    APP.moveBlockTo(0, 4);
    t.eq(names(APP), ["Khác", "Nhóm", "Con 1", "Con 2"]);

    t.case("hoàn tác / làm lại");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.commitHistory();
    APP.state.tasks[0].name = "A đã sửa";
    APP.renderAll();
    APP.commitHistory();
    t.eq(APP.state.tasks[0].name, "A đã sửa");
    APP.doUndo();
    t.eq(APP.state.tasks[0].name, "A", "hoàn tác trở về giá trị cũ");
    APP.doRedo();
    t.eq(APP.state.tasks[0].name, "A đã sửa", "làm lại khôi phục giá trị mới");

    t.case("hoàn tác khi chưa có gì thì không vỡ");
    makeState(APP, { tasks: [{ name: "A", dur: 2 }] });
    APP.renderAll();
    APP.doUndo();
    APP.doRedo();
    t.ok(!!APP.state, "app vẫn sống");

    t.case("giới hạn 500 dòng: không chèn vượt quá");
    const many = [];
    for (let i = 0; i < 500; i++) many.push({ name: "T" + (i + 1), dur: 1 });
    makeState(APP, { tasks: many });
    APP.renderAll();
    APP.insertTaskAt(0, 0);
    t.eq(APP.state.tasks.length, 500, "đã đủ 500 dòng thì không chèn thêm");

    t.case("chèn nhiều dòng chỉ chèn được phần còn chỗ");
    const m2 = [];
    for (let i = 0; i < 498; i++) m2.push({ name: "T" + (i + 1), dur: 1 });
    makeState(APP, { tasks: m2 });
    APP.renderAll();
    APP.insertTasksAt(0, 0, 10);
    t.eq(APP.state.tasks.length, 500, "chỉ chèn 2 dòng còn lại");
  } finally { closeApp(APP); }
};
