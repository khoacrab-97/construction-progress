#!/usr/bin/env node
/* Sinh assets/icon.ico — biểu tượng Gantt nhiều kích thước.
 *
 *   node tools/make-icon.js
 *
 * Vì sao vẽ bằng script thay vì nhúng file ảnh: giữ đúng tinh thần dự án
 * (không phụ thuộc công cụ ngoài), và muốn đổi màu/bố cục chỉ cần sửa phần
 * THAM SỐ bên dưới rồi chạy lại. Windows chọn ảnh đúng cỡ trong .ico thay vì
 * thu nhỏ ảnh 256px — đó là lý do icon cũ bị nhoè trên thanh taskbar.
 */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

/* ---------------- THAM SỐ ---------------- */
const SIZES = [16, 24, 32, 48, 64, 128, 256];
const BG_TOP = [31, 111, 178];    // #1f6fb2 xanh thép (--accent)
const BG_BOT = [20, 79, 128];     // #144f80 (--accent-dark)
const BARS = [
  { x0: 0.180, x1: 0.620, y0: 0.250, y1: 0.365, c: [255, 255, 255], a: 1.00 },
  { x0: 0.300, x1: 0.830, y0: 0.443, y1: 0.558, c: [255, 196, 87], a: 1.00 }, // thanh nhấn
  { x0: 0.225, x1: 0.700, y0: 0.635, y1: 0.750, c: [255, 255, 255], a: 0.86 }
];
const CORNER = 0.215;             // bo góc nền, theo tỉ lệ cạnh
const SS = 4;                     // siêu lấy mẫu để khử răng cưa

/* ---------------- VẼ ---------------- */
function roundRectCover(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r + 1e-9;
}
/* Vẽ ở độ phân giải S*SS rồi gộp ô vuông SS*SS → cạnh mượt, không cần thư viện */
function render(S) {
  const N = S * SS;
  const acc = new Float64Array(S * S * 4);
  for (let py = 0; py < N; py++) {
    const v = (py + 0.5) / N;
    for (let px = 0; px < N; px++) {
      const u = (px + 0.5) / N;
      let r = 0, g = 0, b = 0, a = 0;
      if (roundRectCover(u, v, 0, 0, 1, 1, CORNER)) {
        r = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * v;
        g = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * v;
        b = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * v;
        a = 1;
        for (const bar of BARS) {
          const rad = (bar.y1 - bar.y0) / 2;
          if (roundRectCover(u, v, bar.x0, bar.y0, bar.x1, bar.y1, rad)) {
            r = r + (bar.c[0] - r) * bar.a;
            g = g + (bar.c[1] - g) * bar.a;
            b = b + (bar.c[2] - b) * bar.a;
          }
        }
      }
      const i = ((py / SS) | 0) * S + ((px / SS) | 0);
      acc[i * 4] += r * a; acc[i * 4 + 1] += g * a; acc[i * 4 + 2] += b * a; acc[i * 4 + 3] += a;
    }
  }
  const out = Buffer.alloc(S * S * 4);
  const n = SS * SS;
  for (let i = 0; i < S * S; i++) {
    const a = acc[i * 4 + 3] / n;
    out[i * 4] = a > 0 ? Math.round(acc[i * 4] / acc[i * 4 + 3]) : 0;
    out[i * 4 + 1] = a > 0 ? Math.round(acc[i * 4 + 1] / acc[i * 4 + 3]) : 0;
    out[i * 4 + 2] = a > 0 ? Math.round(acc[i * 4 + 2] / acc[i * 4 + 3]) : 0;
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out; // RGBA, hàng trên xuống dưới
}

/* ---------------- ĐÓNG GÓI ---------------- */
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgba, S) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))
  ]);
}
/* Ảnh DIB 32-bit trong .ico: dữ liệu BGRA lật ngược + mặt nạ AND (bắt buộc có) */
function dib(rgba, S) {
  const head = Buffer.alloc(40);
  head.writeUInt32LE(40, 0); head.writeInt32LE(S, 4); head.writeInt32LE(S * 2, 8);
  head.writeUInt16LE(1, 12); head.writeUInt16LE(32, 14);
  const px = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    const sy = S - 1 - y;
    for (let x = 0; x < S; x++) {
      const s = (sy * S + x) * 4, d = (y * S + x) * 4;
      px[d] = rgba[s + 2]; px[d + 1] = rgba[s + 1]; px[d + 2] = rgba[s]; px[d + 3] = rgba[s + 3];
    }
  }
  const maskRow = ((S + 31) >> 5) * 4;
  return Buffer.concat([head, px, Buffer.alloc(maskRow * S)]);
}
const imgs = SIZES.map(S => {
  const rgba = render(S);
  return { S, data: S >= 256 ? png(rgba, S) : dib(rgba, S) };
});
const dir = Buffer.alloc(6 + imgs.length * 16);
dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(imgs.length, 4);
let off = dir.length;
imgs.forEach((im, i) => {
  const o = 6 + i * 16;
  dir[o] = im.S >= 256 ? 0 : im.S; dir[o + 1] = im.S >= 256 ? 0 : im.S;
  dir[o + 2] = 0; dir[o + 3] = 0;
  dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
  dir.writeUInt32LE(im.data.length, o + 8); dir.writeUInt32LE(off, o + 12);
  off += im.data.length;
});
const out = Buffer.concat([dir, ...imgs.map(i => i.data)]);
const dest = path.join(__dirname, "..", "assets", "icon.ico");
fs.writeFileSync(dest, out);
console.log("Đã ghi " + dest + " — " + imgs.length + " kích thước (" + SIZES.join(", ") + "), " + out.length + " byte");
/* PNG 256 để xem trước / dùng cho web */
fs.writeFileSync(path.join(__dirname, "..", "assets", "icon-256.png"), png(render(256), 256));
console.log("Đã ghi assets/icon-256.png để xem trước");
