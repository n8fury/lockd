// Generates the Lockd icons (16/32/48/128 px) as PNGs with zero dependencies,
// using Node's built-in zlib. The mark: a violet→pink gradient rounded square
// with a white diamond, matching the brand mark used across the UI.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from './_crc.mjs';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/icons');
const SIZES = [16, 32, 48, 128];

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function renderPng(S) {
  const px = Buffer.alloc(S * S * 4);
  const cx = S / 2;
  const cy = S / 2;
  const r = S * 0.28; // corner radius
  const half = S / 2;
  const hx = half - r;
  const hy = half - r;
  const rd = S * 0.22; // diamond radius

  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const fx = x + 0.5;
      const fy = y + 0.5;

      // Rounded-rect signed distance → anti-aliased coverage.
      const qx = Math.abs(fx - cx) - hx;
      const qy = Math.abs(fy - cy) - hy;
      const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
      const coverage = clamp01(0.5 - dist);

      // Diagonal gradient violet (#B47CFF) → pink (#FF6BCB).
      const t = (x + y) / (2 * (S - 1));
      let R = lerp(0xb4, 0xff, t);
      let G = lerp(0x7c, 0x6b, t);
      let B = lerp(0xff, 0xcb, t);

      // White diamond overlay.
      const dd = (Math.abs(fx - cx) + Math.abs(fy - cy)) / rd;
      const da = clamp01((1 - dd) * (S * 0.45)); // crisp edge, ~1px AA
      if (da > 0) {
        R = Math.round(R + (255 - R) * da);
        G = Math.round(G + (255 - G) * da);
        B = Math.round(B + (255 - B) * da);
      }

      const i = (y * S + x) * 4;
      px[i] = R;
      px[i + 1] = G;
      px[i + 2] = B;
      px[i + 3] = Math.round(coverage * 255);
    }
  }

  // Pack scanlines with filter byte 0.
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y += 1) {
    raw[y * (S * 4 + 1)] = 0;
    px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const S of SIZES) {
  const file = resolve(OUT_DIR, `icon-${S}.png`);
  writeFileSync(file, renderPng(S));
  console.log(`  icon-${S}.png`);
}
console.log(`Icons written to ${OUT_DIR}`);
