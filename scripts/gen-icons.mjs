// Generates the PWA icons as PNGs with no dependencies: run `node scripts/gen-icons.mjs`.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [31, 111, 92];
const FG = [255, 255, 255];
const ACCENT = [247, 196, 84];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** Building silhouette in a 0..1 coordinate space; `pad` shrinks it for maskable icons. */
function pixel(x, y, pad) {
  const u = (x - pad) / (1 - 2 * pad);
  const v = (y - pad) / (1 - 2 * pad);
  const inRect = (x0, y0, x1, y1) => u >= x0 && u < x1 && v >= y0 && v < y1;
  // window grid inside the tower
  const isWindow = (x0, y0, cols, rows, w, h, gx, gy) => {
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) if (inRect(x0 + c * (w + gx), y0 + r * (h + gy), x0 + c * (w + gx) + w, y0 + r * (h + gy) + h)) return true;
    return false;
  };
  if (isWindow(0.36, 0.3, 3, 3, 0.07, 0.07, 0.045, 0.06)) return BG;
  if (isWindow(0.18, 0.5, 1, 2, 0.06, 0.07, 0, 0.06)) return BG;
  if (inRect(0.47, 0.72, 0.53, 0.8)) return BG; // door
  if (inRect(0.32, 0.24, 0.72, 0.8)) return FG; // tower
  if (inRect(0.14, 0.44, 0.32, 0.8)) return FG; // annex
  if (inRect(0.1, 0.8, 0.9, 0.84)) return ACCENT; // ground
  if (inRect(0.66, 0.14, 0.86, 0.17) || inRect(0.66, 0.14, 0.69, 0.24)) return ACCENT; // crane arm
  return BG;
}

function png(size, pad) {
  const rows = [];
  const ss = 3; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const [pr, pg, pb] = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, pad);
          r += pr; g += pg; b += pb;
        }
      const n = ss * ss;
      row.set([Math.round(r / n), Math.round(g / n), Math.round(b / n), 255], 1 + x * 4);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), png(192, 0.06));
writeFileSync(new URL('icon-512.png', out), png(512, 0.06));
writeFileSync(new URL('maskable-512.png', out), png(512, 0.16));
writeFileSync(new URL('apple-touch-icon.png', out), png(180, 0.1));
console.log('icons written');
