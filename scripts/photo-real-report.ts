/**
 * Real-photo battery (node): runs the camera-stress battery + fidelity
 * metric against the ACTUAL sample photographs shipped with the product
 * (converted to BMP by scripts beforehand). Usage:
 *
 *   node --experimental-strip-types --import ./scripts/register-ts-hooks.mjs \
 *     scripts/photo-real-report.ts [dir=/tmp/photo-real]
 */

import jsQR from "jsqr";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encode } from "uqr";
import { runCameraBattery } from "../src/lib/qr/photo/camera-sim.ts";
import { photoFidelity } from "../src/lib/qr/photo/fidelity.ts";
import { buildToneField } from "../src/lib/qr/photo/field.ts";
import { rasterizePhotoQr } from "../src/lib/qr/photo/raster.ts";
import { roleMaps, candidateParams, type StyleToParamsInput } from "../src/lib/qr/photo/score.ts";
import { PHOTO_CANDIDATES, ROBUSTNESS_GATE, FIDELITY_FLOOR, type CandidateParams } from "../src/lib/qr/photo/candidates.ts";
import { bilinearScale, nearestScale, type Bitmap } from "../src/lib/qr/photo/imaging.ts";

function readBmp(path: string): Bitmap {
  const buf = readFileSync(path);
  const offset = buf.readUInt32LE(10);
  const w = buf.readInt32LE(18);
  const h = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  if (bpp !== 24 && bpp !== 32) throw new Error(`unsupported bpp ${bpp}`);
  const data = new Uint8ClampedArray(w * h * 4);
  const rowSize = Math.ceil((w * bpp) / 32) * 4;
  for (let y = 0; y < Math.abs(h); y++) {
    const srcY = h > 0 ? Math.abs(h) - 1 - y : y;
    for (let x = 0; x < w; x++) {
      const o = offset + srcY * rowSize + x * (bpp / 8);
      const i = (y * w + x) * 4;
      data[i] = buf[o + 2]!;
      data[i + 1] = buf[o + 1]!;
      data[i + 2] = buf[o]!;
      data[i + 3] = 255;
    }
  }
  return { data, w, h };
}

/** contain-fit a non-square photo into size×size with edge extension. */
function containSquare(bm: Bitmap, size: number): Bitmap {
  const scale = Math.min(size / bm.w, size / bm.h);
  const dw = Math.round(bm.w * scale);
  const dh = Math.round(bm.h * scale);
  const ox = Math.floor((size - dw) / 2);
  const oy = Math.floor((size - dh) / 2);
  const fitted = bilinearScale(bm, Math.max(dw, 1));
  const out = new Uint8ClampedArray(size * size * 4);
  const put = (x: number, y: boolean, src: number) => src;
  void put;
  // edge-extend bands (average of nearest column/row)
  const edgeCol = (x: number) => {
    for (let y = 0; y < size; y++) {
      const si = (y * fitted.w + x) * 4;
      return [fitted.data[si]!, fitted.data[si + 1]!, fitted.data[si + 2]!];
    }
    return [0, 0, 0];
  };
  const first = edgeCol(0);
  const last = edgeCol(fitted.w - 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let c: [number, number, number];
      if (y >= oy && y < oy + dh && x >= ox && x < ox + dw) {
        const fi = ((y - oy) * fitted.w + (x - ox)) * 4;
        c = [fitted.data[fi]!, fitted.data[fi + 1]!, fitted.data[fi + 2]!];
      } else if (x < ox) {
        c = [first[0], first[1], first[2]];
      } else {
        c = [last[0], last[1], last[2]];
      }
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
  }
  return { data: out, w: size, h: size };
}

const STYLE_INPUT: StyleToParamsInput = {
  mode: "photo",
  strength: 0.5,
  contrast: 0.84,
  dotScale: 0.68,
  chroma: 0.86,
  boost: 0,
  viewPxPerModule: 6.5,
  modules: 37,
  fg: [18, 18, 18],
  bg: [244, 241, 234],
};

function rasterBody(qr: ReturnType<typeof encode>, photo: Bitmap, cand: CandidateParams): Bitmap {
  const field = buildToneField(photo, qr.size, {
    detail: cand.detail * Math.min(1.15, Math.max(0, STYLE_INPUT.strength * 1.6)),
    normalize: 0.8,
  });
  const maps = roleMaps(qr);
  const { render } = candidateParams(cand, STYLE_INPUT);
  return rasterizePhotoQr(field, {
    size: qr.size,
    ss: 8,
    ...render,
    colorMode: "photo",
    fg: STYLE_INPUT.fg,
    bg: STYLE_INPUT.bg,
    duoDark: [30, 26, 20],
    duoLight: [236, 224, 200],
    bits: maps.bits,
    isProtected: maps.isProtected,
  }).bitmap;
}

function renderCandidate(qr: ReturnType<typeof encode>, photo: Bitmap, cand: CandidateParams) {
  const field = buildToneField(photo, qr.size, {
    detail: cand.detail * Math.min(1.15, Math.max(0, STYLE_INPUT.strength * 1.6)),
    normalize: 0.8,
  });
  const maps = roleMaps(qr);
  const { render } = candidateParams(cand, STYLE_INPUT);
  const { bitmap } = rasterizePhotoQr(field, {
    size: qr.size,
    ss: 8,
    ...render,
    colorMode: "photo",
    fg: STYLE_INPUT.fg,
    bg: STYLE_INPUT.bg,
    duoDark: [30, 26, 20],
    duoLight: [236, 224, 200],
    bits: maps.bits,
    isProtected: maps.isProtected,
  });
  return bilinearScale(quietPadBody(bitmap, qr.size), 512);
}

function writeBmp(path: string, bm: Bitmap) {
  const { w, h } = bm;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const buf = Buffer.alloc(54 + rowSize * h);
  buf.write("BM", 0);
  buf.writeUInt32LE(54 + rowSize * h, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(rowSize * h, 34);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = 54 + (h - 1 - y) * rowSize + x * 3;
      buf[o] = bm.data[i + 2]!;
      buf[o + 1] = bm.data[i + 1]!;
      buf[o + 2] = bm.data[i]!;
    }
  writeFileSync(path, buf);
}

const dir = process.argv[2] ?? "/tmp/photo-real";
const outDir = "/tmp/photo-real-out";
mkdirSync(outDir, { recursive: true });
const payloadText = "https://qrwho.vercel.app/welcome/photo-demo";
function quietPadBody(body: Bitmap, qrSize: number, quietModules = 4, paper: Rgb = [244, 241, 234]): Bitmap {
  const ss = body.w / qrSize;
  const pad = Math.round(quietModules * ss);
  const N = body.w + pad * 2;
  const out = new Uint8ClampedArray(N * N * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = paper[0];
    out[i + 1] = paper[1];
    out[i + 2] = paper[2];
    out[i + 3] = 255;
  }
  for (let y = 0; y < body.h; y++)
    for (let x = 0; x < body.w; x++) {
      const si = (y * body.w + x) * 4;
      const di = ((y + pad) * N + x + pad) * 4;
      out[di] = body.data[si]!;
      out[di + 1] = body.data[si + 1]!;
      out[di + 2] = body.data[si + 2]!;
      out[di + 3] = 255;
    }
  return { data: out, w: N, h: N };
}

const decode = (bm: Bitmap) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;
const qr = encode(payloadText, { ecc: "H", boostEcc: true, minVersion: 5, border: 0 });

let pass = 0;
let total = 0;
console.log(`\n=== REAL-PHOTO BATTERY (v${qr.size}, ECC H) ===`);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".bmp")).sort()) {
  const raw = readBmp(join(dir, file));
  const photo = containSquare(raw, 384);
  const scores = PHOTO_CANDIDATES.map((cand) => {
    const bm = renderCandidate(qr, photo, cand);
    const body = bilinearScale(rasterBody(qr, photo, cand), 512);
    return { cand, bm, fid: photoFidelity(photo, body, 40, 1.6), bat: runCameraBattery(bm, decode, payloadText) };
  });
  const eligible = scores.filter(
    (s) => s.bat.cameraRobust && s.bat.robustness >= ROBUSTNESS_GATE && s.fid.score >= FIDELITY_FLOOR,
  );
  eligible.sort((a, b) => b.fid.score - a.fid.score || b.bat.robustness - a.bat.robustness);
  const winner = eligible[0] ?? null;
  if (winner) {
    pass++;
    writeBmp(`${outDir}/winner-${file.replace(".bmp", "")}.bmp`, winner.bm);
  }
  total++;
  console.log(
    `${file.padEnd(16)} best[${winner ? winner.cand.id : "NONE"}] R${winner ? winner.bat.robustness.toFixed(2) : "-"} F${winner ? winner.fid.score.toFixed(2) : "-"} | default[balanced] R${scores[2]!.bat.robustness.toFixed(2)} F${scores[2]!.fid.score.toFixed(2)}`,
  );
}
console.log(`\nPass: ${pass}/${total}\nWinners in ${outDir}`);
