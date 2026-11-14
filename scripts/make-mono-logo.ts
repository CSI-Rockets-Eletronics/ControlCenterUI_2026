// Makes public/csi-logo-mono.png from the color favicon:
//   bun scripts/make-mono-logo.ts public/android-chrome-512x512.png public/csi-logo-mono.png
// Turn the color CSI badge into a one-color stencil: blue -> opaque, white -> transparent.
import { deflateSync, inflateSync } from "node:zlib";

const [inPath, outPath] = process.argv.slice(2);
const buf = Buffer.from(await Bun.file(inPath).arrayBuffer());
let off = 8,
  w = 0,
  h = 0,
  bitDepth = 0,
  colorType = 0,
  interlace = 0;
const idat: Buffer[] = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString("ascii", off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === "IHDR") {
    w = data.readUInt32BE(0);
    h = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
    interlace = data[12];
  }
  if (type === "IDAT") idat.push(data);
  off += 12 + len;
}
if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType))
  throw new Error(
    `unsupported PNG: depth ${bitDepth} type ${colorType} interlace ${interlace}`,
  );
const bpp = colorType === 6 ? 4 : 3,
  stride = w * bpp;
const raw = inflateSync(Buffer.concat(idat));
const px = Buffer.alloc(h * stride);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)],
    line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? px[y * stride + x - bpp] : 0,
      b = y ? px[(y - 1) * stride + x] : 0,
      c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
    let v = line[x];
    if (f === 1) v += a;
    else if (f === 2) v += b;
    else if (f === 3) v += (a + b) >> 1;
    else if (f === 4) {
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    px[y * stride + x] = v & 255;
  }
}
const out = Buffer.alloc(h * (w * 4 + 1));
for (let y = 0; y < h; y++) {
  out[y * (w * 4 + 1)] = 0;
  for (let x = 0; x < w; x++) {
    const i = y * stride + x * bpp,
      r = px[i],
      g = px[i + 1],
      bl = px[i + 2],
      al = bpp === 4 ? px[i + 3] : 255;
    const blue = Math.max(0, Math.min(1, (bl - r - 10) / 120)); // 0 = white/background, 1 = logo blue
    const o = y * (w * 4 + 1) + 1 + x * 4;
    // close the gap between the outer ring and the disc: solid band r 205-221
    // (scaled for other sizes), with a 1px soft edge on each side
    const sc = w / 512,
      d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / sc;
    const band = Math.max(0, Math.min(1, d - 204, 222 - d));
    out[o] = out[o + 1] = out[o + 2] = 0;
    out[o + 3] = Math.round(Math.max(blue, band) * al);
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (t: string, d: Buffer) => {
  const l = Buffer.alloc(4);
  l.writeUInt32BE(d.length);
  const td = Buffer.concat([Buffer.from(t), d]);
  const cr = Buffer.alloc(4);
  cr.writeUInt32BE(crc(td));
  return Buffer.concat([l, td, cr]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8;
ihdr[9] = 6;
await Bun.write(
  outPath,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(out, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
console.log(`wrote ${outPath} ${w}x${h}`);
