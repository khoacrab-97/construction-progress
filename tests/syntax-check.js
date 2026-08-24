#!/usr/bin/env node
/* Kiểm tra cú pháp phần <script> của app — bước bắt buộc ở CLAUDE.md §13.2 #2.
   Chạy trước bộ test để lỗi cú pháp hiện ra ngay, không lẫn vào lỗi khác.

     node tests/syntax-check.js
*/
const fs = require("fs");
const { APP_HTML } = require("./helpers/env");

const html = fs.readFileSync(APP_HTML, "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) {
  console.error("KHÔNG TÌM THẤY thẻ <script> trong " + APP_HTML);
  process.exit(1);
}
const code = m[1];
try {
  new Function(code);           // chỉ biên dịch, không chạy
} catch (e) {
  console.error("LỖI CÚ PHÁP trong phần <script>:");
  console.error("  " + e.message);
  process.exit(1);
}

const lines = code.split("\n").length;
const ver = (html.match(/let APPVER = "([^"]*)"/) || [])[1] || "(không đọc được)";
console.log("Cú pháp OK — " + lines + " dòng script. " + ver);
