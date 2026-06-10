// PWAアイコン生成スクリプト: オレンジマッシュのドット絵をPNG化する(依存パッケージ不要)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

// --- minimal PNG encoder ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- art ---
const PALETTE = {
  a: '#ef7d2f', A: '#c95a1a', w: '#fff4e0', f: '#f7dfae', F: '#d9b97e',
  k: '#3a2a1e', m: '#c47a52', '.': null,
};
const MUSHROOM = [
  '......aaaaaa....',
  '....aaaaaaaaaa..',
  '...aawwaaaaaaaa.',
  '..aaawwaaaaaaaa.',
  '..aaaaaaaaawwaa.',
  '..aaaaaaaaawwaa.',
  '..aAAAAAAAAAAAa.',
  '...AAAAAAAAAAA..',
  '....ffffffffff..',
  '....fkkffffkkf..',
  '....fkkffffkkf..',
  '....ffffmmfff...',
  '.....ffffffff...',
  '......FF..FF....',
  '......FF..FF....',
];

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function makeIcon(size, { bg = null, pad = 0.14 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const put = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
  };
  if (bg) {
    // 縦グラデーション背景(空色→草原)
    const top = hex('#8fd3f4'), bottom = hex('#7ec850');
    for (let y = 0; y < size; y++) {
      const t = y / size;
      const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
      const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
      const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
      for (let x = 0; x < size; x++) put(x, y, r, g, b);
    }
  }
  const gw = MUSHROOM[0].length, gh = MUSHROOM.length;
  const inner = Math.floor(size * (1 - pad * 2));
  const scale = Math.floor(inner / Math.max(gw, gh)) || 1;
  const ox = Math.floor((size - gw * scale) / 2);
  const oy = Math.floor((size - gh * scale) / 2);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const c = PALETTE[MUSHROOM[y][x]];
      if (!c) continue;
      const [r, g, b] = hex(c);
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) put(ox + x * scale + dx, oy + y * scale + dy, r, g, b);
    }
  }
  return encodePNG(size, size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192, { bg: true }));
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512, { bg: true }));
writeFileSync(join(outDir, 'icon-512-maskable.png'), makeIcon(512, { bg: true, pad: 0.22 }));
console.log('icons generated: icon-192.png, icon-512.png, icon-512-maskable.png');
