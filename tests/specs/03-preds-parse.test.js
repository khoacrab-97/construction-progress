/* Cú pháp quan hệ phụ thuộc (CLAUDE.md §6.1.1). */
const { loadApp, closeApp } = require("../helpers/env");

exports.name = "preds — phân tích cú pháp quan hệ";
exports.run = function (t) {
  const APP = loadApp({ silent: true });
  try {
    const P = APP.parsePreds;

    t.case("rỗng → không có quan hệ nào");
    t.eq(P("").length, 0);
    t.eq(P(null).length, 0);
    t.eq(P("   ").length, 0);

    t.case("số trần mặc định kiểu FS, lag 0");
    t.eq(P("2"), [{ id: 2, type: "FS", lag: 0 }]);

    t.case("bốn kiểu quan hệ");
    t.eq(P("2FS")[0].type, "FS");
    t.eq(P("2SS")[0].type, "SS");
    t.eq(P("2FF")[0].type, "FF");
    t.eq(P("2SF")[0].type, "SF");
    t.eq(P("2ss")[0].type, "SS", "chữ thường vẫn nhận");

    t.case("độ trễ dương và âm");
    t.eq(P("2FS+3"), [{ id: 2, type: "FS", lag: 3 }]);
    t.eq(P("5SS-1"), [{ id: 5, type: "SS", lag: -1 }]);
    t.eq(P("7+2"), [{ id: 7, type: "FS", lag: 2 }], "lag không cần ghi kiểu");

    t.case("bỏ qua khoảng trắng thừa");
    t.eq(P(" 2 FS + 3 "), [{ id: 2, type: "FS", lag: 3 }]);

    t.case("nhiều quan hệ, ngăn bằng dấu phẩy hoặc chấm phẩy");
    t.eq(P("4,7").length, 2);
    t.eq(P("4;7").length, 2);
    t.eq(P("4, 7SS+1").map(x => x.id), [4, 7]);
    t.eq(P("4,,7").length, 2, "dấu phẩy thừa không sinh phần tử rỗng");

    t.case("cú pháp sai được đánh dấu bad, không ném lỗi");
    t.ok(P("abc")[0].bad, "chữ không phải số");
    t.eq(P("abc")[0].raw, "abc");
    t.ok(P("2XX")[0].bad, "kiểu quan hệ không tồn tại");
    t.ok(P("2FS+")[0].bad, "thiếu số sau dấu +");

    t.case("trộn hợp lệ và sai: vẫn giữ đủ phần tử");
    const mix = P("2,xyz,5SS");
    t.eq(mix.length, 3);
    t.eq(mix[0].id, 2);
    t.ok(mix[1].bad);
    t.eq(mix[2].type, "SS");
  } finally { closeApp(APP); }
};
