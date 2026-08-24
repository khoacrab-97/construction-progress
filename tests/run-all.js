#!/usr/bin/env node
/* Chạy toàn bộ test trong tests/specs.
   Dùng:  node tests/run-all.js  [lọc-theo-tên]                */
const fs = require("fs");
const path = require("path");
const { Suite } = require("./helpers/tinytest");

const SPEC_DIR = path.join(__dirname, "specs");
const filter = process.argv[2] || "";

const files = fs.readdirSync(SPEC_DIR)
  .filter(f => f.endsWith(".test.js"))
  .filter(f => !filter || f.includes(filter))
  .sort();

if (!files.length) {
  console.error("Không tìm thấy tệp test nào" + (filter ? " khớp '" + filter + "'" : "") + ".");
  process.exit(1);
}

let totalAsserts = 0, failedSuites = 0, totalFailures = 0;
const started = Date.now();

for (const f of files) {
  const mod = require(path.join(SPEC_DIR, f));
  const name = mod.name || f.replace(/\.test\.js$/, "");
  const s = new Suite(name);
  try {
    mod.run(s);
  } catch (e) {
    s.failures.push("NGOẠI LỆ → " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n    ") : e));
  }
  totalAsserts += s.asserts;
  if (s.failures.length) {
    failedSuites++;
    totalFailures += s.failures.length;
    console.log("FAIL  " + pad(name) + s.asserts + " assertion");
    s.failures.forEach(m => console.log("        ✗ " + m));
  } else {
    console.log("ok    " + pad(name) + s.asserts + " assertion");
  }
}

function pad(s) { return (s + " ").padEnd(46, "."); }

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log("");
console.log("-".repeat(62));
console.log(
  (failedSuites ? "THẤT BẠI" : "TẤT CẢ ĐẠT") +
  ": " + (files.length - failedSuites) + "/" + files.length + " bộ test, " +
  totalAsserts + " assertion" +
  (totalFailures ? ", " + totalFailures + " lỗi" : "") +
  " — " + secs + "s"
);
process.exit(failedSuites ? 1 : 0);
