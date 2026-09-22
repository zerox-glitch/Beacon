/**
 * LEGACY — sub-cell Chu lattice (NOT in the render path since the Photo QR
 * rebuild). Kept as the measurement baseline for scripts/photo-report.ts and
 * its unit tests; the live photo pipeline is src/lib/qr/photo/*.
 *
 * Old behaviour (why it was replaced): photographic features lived in 1/S-of-
 * a-module subcells (≈1–2px on a phone) — isotropic high-frequency noise that
 * camera downsampling destroys, and only 1/S² of each module carried the bit.
 */

import type { EncodedQr } from "../encode";
import { cellRole, isDark, isProtectedRole } from "../structure";

export type HalftoneKind = "photo" | "halftone" | "duotone" | "mono";
export type DitherKind = "fs" | "bayer";

export interface HalftoneQrOpts {
  /** 3, 5 or 7 submodules per QR module. */
  sub: 3 | 5 | 7;
  kind: HalftoneKind;
  contrast: number;
  strength: number;
  /** Extra center lock after a failed decode (0–1). */
  boost?: number;
  /** Larger → bigger locked centroid (more QR, less photo). */
  dotScale?: number;
  /** Photo fade: 1 keeps hue + softer tones, 0 crushes toward ink. */
  chroma?: number;
  dither?: DitherKind;
  /** Used by binary / mono inks. */
  fg?: [number, number, number];
  bg?: [number, number, number];
  /** Used by duotone. */
  duoDark?: [number, number, number];
  duoLight?: [number, number, number];
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function setLuminance(r: number, g: number, b: number, target: number): [number, number, number] {
  const L = luma(r, g, b);
  const t = clamp(target, 0, 1);
  if (L < 0.0008) {
    const v = t * 255;
    return [v, v, v];
  }
  if (t <= L) {
    const k = t / L;
    return [r * k, g * k, b * k];
  }
  const k = (t - L) / (1 - L);
  return [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k];
}

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function bayer8(x: number, y: number): number {
  return ((BAYER8[y & 7]![x & 7]! + 0.5) / 64);
}

/** Percentile luma stretch so flat photos still have a usable tone range. */
function stretchLuma(pixels: Uint8ClampedArray, amount: number) {
  const n = pixels.length / 4;
  if (n < 16 || amount < 0.05) return;
  const samples: number[] = [];
  const step = Math.max(1, Math.floor(n / 4000));
  for (let p = 0; p < n; p += step) {
    const i = p * 4;
    samples.push(luma(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!));
  }
  samples.sort((a, b) => a - b);
  const lo = samples[Math.floor(samples.length * 0.06)] ?? 0.15;
  const hi = samples[Math.floor(samples.length * 0.94)] ?? 0.85;
  const span = Math.max(0.12, hi - lo);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const L = luma(r, g, b);
    const t = clamp((L - lo) / span, 0, 1);
    const mixed = lerp(L, t, amount);
    const [nr, ng, nb] = setLuminance(r, g, b, mixed);
    pixels[i] = nr;
    pixels[i + 1] = ng;
    pixels[i + 2] = nb;
  }
}

type LockKind = "center" | "plus" | "block";

function pickLock(sub: number, boost: number, dotScale: number): LockKind {
  // Chu binds the centroid. Plus / 3×3 are scan-safety, not the default look.
  if (boost > 0.65) return sub >= 5 ? "block" : "center";
  if (boost > 0.3) return sub >= 5 ? "plus" : "center";
  if (dotScale >= 0.88 && sub >= 5) return "block";
  if (dotScale >= 0.76 && sub >= 5) return "plus";
  // A 7×7 lattice with a 1-pixel centroid is below what most decoders sample.
  if (sub >= 7) return "block";
  return "center";
}

function centroidLocked(sx: number, sy: number, mid: number, kind: LockKind): boolean {
  const dx = Math.abs(sx - mid);
  const dy = Math.abs(sy - mid);
  if (dx === 0 && dy === 0) return true;
  if (kind === "plus") return dx + dy === 1;
  if (kind === "block") return Math.max(dx, dy) <= 1;
  return false;
}

function writeCell(
  pixels: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number,
  on: boolean,
  opts: HalftoneQrOpts,
  darkT: number,
  lightT: number,
) {
  if (opts.kind === "halftone" || opts.kind === "mono") {
    const c = on ? (opts.fg ?? [18, 18, 18]) : (opts.bg ?? [244, 241, 234]);
    pixels[i] = c[0];
    pixels[i + 1] = c[1];
    pixels[i + 2] = c[2];
    pixels[i + 3] = 255;
    return;
  }
  if (opts.kind === "duotone") {
    const c = on ? (opts.duoDark ?? [28, 24, 18]) : (opts.duoLight ?? [236, 220, 190]);
    pixels[i] = c[0];
    pixels[i + 1] = c[1];
    pixels[i + 2] = c[2];
    pixels[i + 3] = 255;
    return;
  }
  let [nr, ng, nb] = setLuminance(r, g, b, on ? darkT : lightT);
  const keep = clamp(opts.chroma ?? 1, 0.15, 1);
  if (keep < 0.999) {
    const gray = luma(nr, ng, nb) * 255;
    nr = lerp(gray, nr, keep);
    ng = lerp(gray, ng, keep);
    nb = lerp(gray, nb, keep);
  }
  pixels[i] = nr;
  pixels[i + 1] = ng;
  pixels[i + 2] = nb;
  pixels[i + 3] = 255;
}

/**
 * Chu et al. SIGGRAPH Asia 2013, simplified for the browser:
 * each QR module is S×S submodules. The centroid is bound to the QR bit
 * (scanners sample ~the module centre). The remaining submodules carry a
 * Floyd–Steinberg / Bayer halftone of the photograph, so image density —
 * not a coloured ring around a kernel — is what you see from a distance.
 *
 * Mutates `pixels` in place. `pixels` is the cover-sampled photo at
 * (qr.size * sub)² RGBA. Finder islands are left untouched for the
 * concentric-eye pass.
 */
export function weaveHalftoneQr(
  pixels: Uint8ClampedArray,
  qr: EncodedQr,
  opts: HalftoneQrOpts,
): void {
  const sub = opts.sub;
  const size = qr.size;
  const W = size * sub;
  if (pixels.length < W * W * 4) throw new Error("halftone buffer too small");

  const contrast = clamp(opts.contrast, 0.3, 1);
  stretchLuma(pixels, 0.35 + (1 - contrast) * 0.45);

  const boost = clamp(opts.boost ?? 0, 0, 1);
  const scale = clamp(opts.dotScale ?? 0.68, 0.5, 1);
  const fade = clamp(opts.chroma ?? 0.85, 0.1, 1);
  const lock = pickLock(sub, boost, scale);
  const mid = (sub - 1) / 2;
  const dither = opts.dither ?? "fs";
  const crush = clamp(contrast * lerp(1, 0.68, fade), 0.45, 1);
  const darkT = lerp(0.5, 0.04, crush);
  const lightT = lerp(0.5, 0.97, crush);

  const roles: ReturnType<typeof cellRole>[] = new Array(size * size);
  const bits = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      roles[i] = cellRole(qr, x, y);
      bits[i] = isDark(qr, x, y) ? 1 : 0;
    }
  }

  const err = new Float32Array(W * W);

  const addErr = (x: number, y: number, e: number, w: number) => {
    if (x < 0 || y < 0 || x >= W || y >= W) return;
    err[y * W + x] += e * w;
  };

  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const mx = (px / sub) | 0;
      const my = (py / sub) | 0;
      const sx = px - mx * sub;
      const sy = py - my * sub;
      const role = roles[my * size + mx]!;
      if (role === "finder" || role === "separator") continue;

      const i = (py * W + px) * 4;
      const r = pixels[i]!;
      const g = pixels[i + 1]!;
      const b = pixels[i + 2]!;
      const L = clamp(luma(r, g, b) + err[py * W + px]!, 0, 1);

      const locked = isProtectedRole(role) || centroidLocked(sx, sy, mid, lock);
      const qrBit = bits[my * size + mx] === 1;

      let on: boolean;
      if (locked) {
        on = qrBit;
      } else if (dither === "bayer") {
        on = L < 0.28 + bayer8(px, py) * 0.55;
      } else {
        on = L < 0.5;
      }

      writeCell(pixels, i, r, g, b, on, opts, darkT, lightT);

      if (dither === "fs") {
        const q = on ? 0 : 1;
        const e = L - q;
        addErr(px + 1, py, e, 7 / 16);
        addErr(px - 1, py + 1, e, 3 / 16);
        addErr(px, py + 1, e, 5 / 16);
        addErr(px + 1, py + 1, e, 1 / 16);
      }
    }
  }
}

export function pickSubmodules(
  kind: HalftoneKind,
  strength: number,
  qrSize: number,
  boost = 0,
): 3 | 5 | 7 {
  if (boost > 0.55 || qrSize >= 61) return 3;
  if (kind === "halftone") return strength > 0.55 && qrSize <= 53 ? 5 : 3;
  if (strength > 0.62 && qrSize <= 41) return 7;
  if (strength < 0.3) return 3;
  return 5;
}

export { luma, setLuminance };
