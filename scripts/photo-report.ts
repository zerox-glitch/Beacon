/**
 * Photo QR measurement harness (node, deterministic).
 *
 *   node --experimental-strip-types scripts/photo-report.ts [quick|full]
 *
 * Renders the SAME matrix through the OLD sub-cell halftone renderer and the
 * NEW photo engine candidates, runs the camera-stress battery + fidelity
 * metric on the exported-size bitmap, and writes BMPs for visual inspection.
 * This is the calibration source for the candidate constants.
 */

import jsQR from "jsqr";
import { writeFileSync, mkdirSync } from "node:fs";
import { encode } from "uqr";
import { weaveHalftoneQr, pickSubmodules } from "../src/lib/qr/art/halftone-qr.ts";
import { rasterizePhotoQr } from "../src/lib/qr/photo/raster.ts";
import { buildToneField } from "../src/lib/qr/photo/field.ts";
import { runCameraBattery } from "../src/lib/qr/photo/camera-sim.ts";
import { photoFidelity } from "../src/lib/qr/photo/fidelity.ts";
import { PHOTO_CANDIDATES, ROBUSTNESS_GATE, FIDELITY_FLOOR } from "../src/lib/qr/photo/candidates.ts";
import { roleMaps, candidateParams, type StyleToParamsInput } from "../src/lib/qr/photo/score.ts";
import { bilinearScale, nearestScale, type Bitmap } from "../src/lib/qr/photo/imaging.ts";

const OUT = "/tmp/photo-qr-report";
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Deterministic synthetic photo gallery (soft, large-region photos — the
// product's target domain). 256×256 RGBA.
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Painter {
  data: Uint8ClampedArray;
  n: number;
  constructor(n = 256) {
    this.n = n;
    this.data = new Uint8ClampedArray(n * n * 4);
  }
  vgrad(y0: number, c0: Rgb, y1: number, c1: number) {
    for (let y = 0; y < this.n; y++) {
      const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
      const c: Rgb = [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
      for (let x = 0; x < this.n; x++) this.put(x, y, c);
    }
  }
  put(x: number, y: number, c: Rgb) {
    const i = (y * this.n + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }
  blend(x: number, y: number, c: Rgb, a: number) {
    const i = (y * this.n + x) * 4;
    this.data[i] = this.data[i]! * (1 - a) + c[0] * a;
    this.data[i + 1] = this.data[i + 1]! * (1 - a) + c[1] * a;
    this.data[i + 2] = this.data[i + 2]! * (1 - a) + c[2] * a;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Rgb, a = 1, soft = 1.5) {
    for (let y = Math.max(0, cy - ry - 2) | 0; y < Math.min(this.n, cy + ry + 2); y++) {
      for (let x = Math.max(0, cx - rx - 2) | 0; x < Math.min(this.n, cx + rx + 2); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) this.blend(x, y, c, a * Math.min(1, (1 - d) * rx * 0.12 * soft + 0.85));
      }
    }
  }
  rect(x0: number, y0: number, w: number, h: number, c: Rgb, a = 1) {
    for (let y = Math.max(0, y0) | 0; y < Math.min(this.n, y0 + h); y++)
      for (let x = Math.max(0, x0) | 0; x < Math.min(this.n, x0 + w); x++) this.blend(x, y, c, a);
  }
  poly(pts: [number, number][], c: Rgb, a = 1) {
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]!;
          const [xj, yj] = pts[j]!;
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.blend(x, y, c, a);
      }
    }
  }
  noise(amount: number, seed: number) {
    const rnd = mulberry(seed);
    for (let i = 0; i < this.data.length; i += 4) {
      const d = (rnd() - 0.5) * amount;
      this.data[i] += d;
      this.data[i + 1] += d;
      this.data[i + 2] += d;
    }
  }
  gray() {
    for (let i = 0; i < this.data.length; i += 4) {
      const L = 0.2126 * this.data[i]! + 0.7152 * this.data[i + 1]! + 0.0722 * this.data[i + 2]!;
      this.data[i] = L;
      this.data[i + 1] = L;
      this.data[i + 2] = L;
    }
  }
  scale(f: number) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] *= f;
      this.data[i + 1] *= f;
      this.data[i + 2] *= f;
    }
  }
  bm(): Bitmap {
    return { data: this.data, w: this.n, h: this.n };
  }
}

export function portrait(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [94, 108, 122], 256, [60, 66, 76]); // studio backdrop
  p.ellipse(128, 236, 92, 70, [38, 44, 58]); // shoulders
  p.ellipse(128, 118, 56, 68, [214, 168, 138]); // face
  p.ellipse(128, 62, 60, 34, [52, 38, 30]); // hair
  p.rect(72, 52, 20, 70, [52, 38, 30]); // hair sides
  p.rect(164, 52, 20, 70, [52, 38, 30]);
  p.ellipse(106, 108, 8, 6, [40, 32, 30]); // eyes
  p.ellipse(150, 108, 8, 6, [40, 32, 30]);
  p.rect(118, 108, 20, 5, [186, 140, 112], 0.7); // nose bridge shadow
  p.ellipse(128, 150, 16, 5, [140, 74, 70]); // mouth
  p.ellipse(90, 132, 12, 18, [196, 142, 110], 0.5); // cheek shadows
  p.ellipse(166, 132, 12, 18, [196, 142, 110], 0.5);
  return p.bm();
}

function dog(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [124, 158, 96], 256, [88, 118, 66]); // park
  p.ellipse(120, 180, 74, 48, [142, 96, 54]); // body
  p.ellipse(196, 120, 40, 38, [150, 102, 58]); // head
  p.poly([[170, 92], [188, 60], [200, 96]], [120, 78, 44]); // ear
  p.poly([[208, 90], [228, 62], [232, 100]], [120, 78, 44]); // ear
  p.ellipse(186, 114, 6, 6, [30, 24, 20]); // eye
  p.ellipse(210, 114, 6, 6, [30, 24, 20]);
  p.ellipse(230, 132, 9, 7, [40, 30, 24]); // snout
  p.rect(66, 210, 26, 34, [132, 88, 48]); // legs
  p.rect(160, 212, 26, 34, [132, 88, 48]);
  p.ellipse(48, 160, 16, 12, [142, 96, 54]); // tail
  return p.bm();
}

function cat(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [190, 178, 160], 256, [150, 138, 120]);
  p.ellipse(128, 170, 60, 52, [96, 92, 92]); // body
  p.ellipse(128, 96, 44, 40, [110, 104, 102]); // head
  p.poly([[96, 74], [88, 34], [116, 62]], [96, 90, 88]); // ears
  p.poly([[160, 74], [168, 34], [140, 62]], [96, 90, 88]);
  p.ellipse(112, 92, 8, 10, [168, 200, 90]); // eyes
  p.ellipse(144, 92, 8, 10, [168, 200, 90]);
  p.poly([[124, 104], [132, 104], [128, 112]], [220, 150, 140]); // nose
  p.rect(60, 214, 16, 34, [90, 86, 86]); // paws
  p.rect(180, 214, 16, 34, [90, 86, 86]);
  return p.bm();
}

function car(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [140, 168, 196], 170, [170, 186, 200]);
  p.rect(0, 170, 256, 86, [70, 70, 74]); // road
  p.rect(70, 120, 120, 44, [176, 44, 40]); // body
  p.ellipse(128, 120, 62, 20, [186, 52, 46]); // roofline
  p.rect(92, 96, 36, 26, [150, 200, 220], 0.9); // windows
  p.rect(134, 96, 34, 26, [150, 200, 220], 0.9);
  p.ellipse(94, 168, 20, 20, [30, 30, 32]); // wheels
  p.ellipse(168, 168, 20, 20, [30, 30, 32]);
  p.ellipse(94, 168, 9, 9, [150, 150, 150]);
  p.ellipse(168, 168, 9, 9, [150, 150, 150]);
  return p.bm();
}

function landscape(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [120, 160, 205], 130, [200, 214, 224]); // sky
  p.poly([[0, 150], [70, 66], [130, 150]], [96, 104, 122]); // mountain far
  p.poly([[90, 150], [180, 46], [256, 150]], [70, 78, 96]); // mountain near
  p.poly([[0, 150], [256, 150], [256, 256], [0, 256]], [88, 122, 74]); // valley
  p.ellipse(210, 44, 22, 22, [246, 238, 200]); // sun
  p.ellipse(60, 190, 60, 16, [70, 100, 60], 0.8); // foreground shadow
  return p.bm();
}

function building(): Bitmap {
  const p = new Painter();
  p.vgrad(0, [160, 180, 200], 256, [120, 140, 160]);
  p.rect(60, 40, 90, 216, [88, 84, 92]); // tower
  p.rect(150, 110, 70, 146, [104, 98, 100]); // wing
  for (let y = 56; y < 240; y += 22) {
    for (let x = 70; x < 140; x += 20) p.rect(x, y, 10, 12, [190, 200, 210], 0.85);
  }
  for (let y = 122; y < 244; y += 24) {
    for (let x = 160; x < 210; x += 18) p.rect(x, y, 9, 11, [170, 182, 190], 0.8);
  }
  return p.bm();
}

export interface GalleryEntry {
  id: string;
  bm: Bitmap;
}

export function gallery(): GalleryEntry[] {
  const portraitBm = portrait();
  const dark = portrait();
  {
    const p = Object.create(Object.getPrototypeOf(dark));
    void p;
  }
  const darkBm: Bitmap = (() => {
    const d = new Uint8ClampedArray(dark.data);
    for (let i = 0; i < d.length; i += 4) {
      d[i] *= 0.4;
      d[i + 1] *= 0.4;
      d[i + 2] *= 0.4;
    }
    return { data: d, w: dark.w, h: dark.h };
  })();
  const brightBm: Bitmap = (() => {
    const p2 = landscape();
    for (let i = 0; i < p2.data.length; i += 4) {
      p2.data[i] = p2.data[i]! * 0.45 + 150;
      p2.data[i + 1] = p2.data[i + 1]! * 0.45 + 150;
      p2.data[i + 2] = p2.data[i + 2]! * 0.45 + 150;
    }
    return p2;
  })();
  const bwBm = portrait();
  {
    for (let i = 0; i < bwBm.data.length; i += 4) {
      const L = 0.2126 * bwBm.data[i]! + 0.7152 * bwBm.data[i + 1]! + 0.0722 * bwBm.data[i + 2]!;
      bwBm.data[i] = L;
      bwBm.data[i + 1] = L;
      bwBm.data[i + 2] = L;
    }
  }
  const detailBm = portrait();
  {
    const rnd = mulberry(77);
    for (let i = 0; i < detailBm.data.length; i += 4) {
      const d = (rnd() - 0.5) * 150;
      detailBm.data[i] += d;
      detailBm.data[i + 1] += d;
      detailBm.data[i + 2] += d;
    }
  }
  const lowBm: Bitmap = (() => {
    const p2 = new Painter();
    p2.vgrad(0, [230, 200, 160], 256, [120, 90, 80]);
    p2.ellipse(150, 110, 60, 60, [250, 230, 190], 0.7);
    return p2.bm();
  })();
  return [
    { id: "portrait", bm: portraitBm },
    { id: "dog", bm: dog() },
    { id: "cat", bm: cat() },
    { id: "car", bm: car() },
    { id: "landscape", bm: landscape() },
    { id: "building", bm: building() },
    { id: "dark-portrait", bm: darkBm },
    { id: "bright-landscape", bm: brightBm },
    { id: "bw-portrait", bm: bwBm },
    { id: "high-detail", bm: detailBm },
    { id: "low-detail", bm: lowBm },
  ];
}

// ---------------------------------------------------------------------------
// Old renderer (pure part) at export parity
// ---------------------------------------------------------------------------

/** Stamp solid finder islands + separators onto the woven lattice (what
 *  drawPhotoFinders does on the canvas). */
function stampFinders(bm: Bitmap, qr: ReturnType<typeof encode>, px: number): void {
  const size = qr.size;
  const cell = px / size;
  const fg: Rgb = [18, 18, 18];
  const bg: Rgb = [244, 241, 234];
  const put = (mx: number, my: number, dark: boolean) => {
    const x0 = Math.floor(mx * cell);
    const y0 = Math.floor(my * cell);
    const x1 = Math.floor((mx + 1) * cell);
    const y1 = Math.floor((my + 1) * cell);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * px + x) * 4;
        const c = dark ? fg : bg;
        bm.data[i] = c[0];
        bm.data[i + 1] = c[1];
        bm.data[i + 2] = c[2];
      }
  };
  const corners = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  for (const [cx, cy] of corners) {
    for (let y = -1; y < 8; y++)
      for (let x = -1; x < 8; x++) {
        const mx = cx + x;
        const my = cy + y;
        if (mx < 0 || my < 0 || mx >= size || my >= size) continue;
        const inRing = x >= 0 && x < 7 && y >= 0 && y < 7;
        if (!inRing) {
          put(mx, my, false); // separator
          continue;
        }
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const ball = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        put(mx, my, edge || ball);
      }
  }
}

function renderOld(qr: ReturnType<typeof encode>, photo: Bitmap, eccStyle: string): Bitmap {
  const size = qr.size;
  const strength = 0.5;
  const contrast = 0.84;
  const sub = pickSubmodules("photo", strength, size, 0);
  const n = size * sub;
  // contain-fit the photo into n×n (photos here are square → direct scale)
  const atlas = bilinearScale(photo, n);
  const pixels = new Uint8ClampedArray(atlas.data);
  weaveHalftoneQr(pixels, qr, {
    sub: sub as 3 | 5 | 7,
    kind: "photo",
    contrast,
    strength,
    boost: 0,
    dotScale: 0.68,
    chroma: 0.86,
    dither: "fs",
  });
  const body = nearestScale({ data: pixels, w: n, h: n }, 512); // product blits the lattice nearest-neighbor
  stampFinders(body, qr, 512);
  return bilinearScale(quietPadBody(body, qr.size), 512);
}

// ---------------------------------------------------------------------------
// New renderer through the real candidate pipeline
// ---------------------------------------------------------------------------

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

function renderNew(
  qr: ReturnType<typeof encode>,
  photo: Bitmap,
  candIdx: number,
): { bm: Bitmap; fidelity: ReturnType<typeof photoFidelity> } {
  const cand = PHOTO_CANDIDATES[candIdx]!;
  const field = buildToneField(photo, qr.size, {
    detail: cand.detail * Math.min(1.15, Math.max(0, STYLE_INPUT.strength * 1.6)),
    normalize: 0.8,
  });
  const maps = roleMapsLocal(qr);
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
  const padded = bilinearScale(quietPadBody(bitmap, qr.size), 512);
  const rawBody = bilinearScale(bitmap, 512);
  return { bm: padded, fidelity: photoFidelity(photo, rawBody, 40, 1.6) };
}

function roleMapsLocal(qr: ReturnType<typeof encode>): { bits: Uint8Array; isProtected: Uint8Array } {
  const n = qr.size;
  const bits = new Uint8Array(n * n);
  const isProtected = new Uint8Array(n * n);
  const T = { Timing: 1, Alignment: 2, Position: 3, Function: 4 } as Record<number, number>;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      bits[i] = qr.data[y]![x] ? 1 : 0;
      const t = qr.types[y]![x]!;
      isProtected[i] = t === T.Timing || t === T.Alignment || t === T.Position || t === T.Function ? 1 : 0;
    }
  }
  return bits ? { bits, isProtected } : { bits, isProtected };
}

// ---------------------------------------------------------------------------
// BMP writer (for visual inspection with read_file)
// ---------------------------------------------------------------------------

function writeBmp(path: string, bm: Bitmap) {
  const { w, h } = bm;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const dataSize = rowSize * h;
  const buf = Buffer.alloc(54 + dataSize);
  buf.write("BM", 0);
  buf.writeUInt32LE(54 + dataSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(dataSize, 34);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = 54 + (h - 1 - y) * rowSize + x * 3;
      buf[o] = bm.data[i + 2]!;
      buf[o + 1] = bm.data[i + 1]!;
      buf[o + 2] = bm.data[i]!;
    }
  }
  writeFileSync(path, buf);
}

// ---------------------------------------------------------------------------

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

function main(mode: "quick" | "full") {
  const payloadText = "https://qrwho.vercel.app/welcome/photo-demo";
  const eccs = mode === "quick" ? (["H"] as const) : (["H", "Q", "M"] as const);
  const versions = mode === "quick" ? ([5] as const) : ([4, 5, 7, 10] as const);

  console.log(`\n=== PHOTO QR REBUILD REPORT (${mode}) ===`);
  console.log(`payload: ${payloadText}\n`);

  let worst = { photo: "", cand: "", robustness: 1, fidelity: 1 };
  let passCount = 0;
  let totalCount = 0;

  for (const photo of gallery()) {
    for (const ecc of eccs) {
      for (const minVersion of versions) {
        const qr = encode(payloadText, { ecc, boostEcc: false, minVersion, border: 0 });
        const label = `${photo.id} v${qr.size} ${ecc}`;

        // OLD renderer
        const oldBm = renderOld(qr, photo.bm, ecc);
        const oldBattery = runCameraBattery(oldBm, decode, payloadText);
        const oldFid = photoFidelity(photo.bm, oldBm, 40, 1.6);

        if (mode === "quick" && ecc === "H" && minVersion === 5 && ["portrait", "dog", "landscape", "high-detail", "low-detail", "dark-portrait"].includes(photo.id)) {
          writeBmp(`${OUT}/old-${photo.id}.bmp`, oldBm);
        }

        // NEW candidates
        const scores = PHOTO_CANDIDATES.map((cand, i) => {
          const { bm, fidelity } = renderNew(qr, photo.bm, i);
          const battery = runCameraBattery(bm, decode, payloadText);
          return { cand, bm, fidelity, battery };
        });

        const eligible = scores.filter(
          (s) => s.battery.cameraRobust && s.battery.robustness >= ROBUSTNESS_GATE && s.fidelity.score >= FIDELITY_FLOOR,
        );
        eligible.sort((a, b) => b.fidelity.score - a.fidelity.score || b.battery.robustness - a.battery.robustness);
        const winner = eligible[0] ?? null;

        if (winner) passCount++;
        totalCount++;

        if (winner && (mode === "quick" ? ["portrait", "dog", "landscape", "high-detail", "low-detail", "dark-portrait"].includes(photo.id) : photo.id === "portrait")) {
          writeBmp(`${OUT}/new-${winner.cand.id}-${photo.id}.bmp`, winner.bm);
          writeBmp(`${OUT}/photo-${photo.id}.bmp`, photo.bm);
        }

        // track worst winner
        for (const s of scores) {
          if (winner && s.cand.id === winner.cand.id) {
            if (s.battery.robustness < worst.robustness) {
              worst = { photo: label, cand: s.cand.id, robustness: s.battery.robustness, fidelity: s.fidelity.score };
            }
          }
        }

        // compact per-combo line
        const fmt = (s: { battery: { robustness: number }; fidelity: { score: number } } | null) =>
          s ? `R${s.battery.robustness.toFixed(2)}/F${s.fidelity.score.toFixed(2)}` : "none";
        console.log(
          `${label.padEnd(26)} OLD ${fmt({ battery: oldBattery, fidelity: oldFid })} | NEW best[${winner ? winner.cand.id : "NONE"}] ${fmt(winner)} (old ${oldBattery.failed.size} fails / new ${winner ? winner.battery.failed.size : "-"} fails)`,
        );
      }
    }
  }

  console.log(`\nSelection pass rate: ${passCount}/${totalCount}`);
  console.log(`Worst winning-candidate robustness: ${worst.robustness.toFixed(2)} (${worst.photo} via ${worst.cand})`);
  console.log(`BMPs in ${OUT}\n`);
}

const mode = (process.argv[2] as "quick" | "full") ?? "quick";
const isEntry = process.argv[1] && (process.argv[1].endsWith("photo-report.ts") || process.argv[1].endsWith("photo-report.mjs"));
if (isEntry) main(mode);
