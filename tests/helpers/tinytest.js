/* Bộ chạy test tối giản — không dùng thư viện ngoài, đúng tinh thần dự án.
   Mỗi file spec export một hàm nhận (t) và gọi t.eq / t.ok / t.throws. */

class Suite {
  constructor(name) {
    this.name = name;
    this.asserts = 0;
    this.failures = [];
    this._case = "(chưa đặt tên)";
  }
  case(label) { this._case = label; }
  _fail(msg) { this.failures.push(this._case + " → " + msg); }
  ok(cond, msg) {
    this.asserts++;
    if (!cond) this._fail((msg || "ok") + ": kỳ vọng đúng, nhận được sai");
  }
  eq(actual, expected, msg) {
    this.asserts++;
    const a = fmt(actual), e = fmt(expected);
    if (a !== e) this._fail((msg || "eq") + ": kỳ vọng " + e + ", nhận được " + a);
  }
  ne(actual, expected, msg) {
    this.asserts++;
    if (fmt(actual) === fmt(expected)) this._fail((msg || "ne") + ": không được bằng " + fmt(expected));
  }
  throws(fn, msg) {
    this.asserts++;
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) this._fail((msg || "throws") + ": kỳ vọng ném lỗi");
  }
}

function fmt(v) {
  if (v instanceof Date) return isNaN(v) ? "Invalid Date" : v.toISOString().slice(0, 10);
  if (typeof v === "object" && v !== null) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  return String(v);
}

module.exports = { Suite, fmt };
