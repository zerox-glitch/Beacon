/**
 * Deterministic photo-fidelity scoring (§5, §12).
 *
 * Measures whether a human would still recognize the subject — NOT pixel
 * similarity. The rendered QR is blurred past the module lattice (the way a
 * viewer's eye merges the kernels), then compared against the equally
 * blurred source photo:
 *
 *   structure — Pearson correlation of the low-frequency luma fields
 *               (composition, silhouette, light direction)
 *   edges     — cosine similarity of Sobel edge maps (eyes, mouth, horizon)
 *   range     — penalizes outputs whose tonal range collapsed (a washed-out
 *               QR where the photo used to be)
 *
 * No ML, no network — pure array math.
 */

import { clamp, gaussBlur, lumaPlane, stats, type Bitmap } from "./imaging";

export interface FidelityBreakdown {
  /** 0–1 overall. */
  score: number;
  structure: number;
  edges: number;
  range: number;
}

function sobel(plane: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = plane[(y - 1) * w + x - 1]!;
      const t = plane[(y - 1) * w + x]!;
      const tr = plane[(y - 1) * w + x + 1]!;
      const l = plane[y * w + x - 1]!;
      const r = plane[y * w + x + 1]!;
      const bl = plane[(y + 1) * w + x - 1]!;
      const b = plane[(y + 1) * w + x]!;
      const br = plane[(y + 1) * w + x + 1]!;
      const gx = tl + 2 * l + bl - tr - 2 * r - br;
      const gy = tl + 2 * t + tr - bl - 2 * b - br;
      out[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

function pearson(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= n;
  mb /= n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - ma;
    const db = b[i]! - mb;
    ab += da * db;
    aa += da * da;
    bb += db * db;
  }
  if (aa < 1e-9 || bb < 1e-9) return 0;
  return clamp(ab / Math.sqrt(aa * bb), -1, 1);
}

function toSmall(bm: Bitmap, size: number, sigma: number): { luma: Float32Array; edge: Float32Array } {
  const stepX = bm.w / size;
  const stepY = bm.h / size;
  const small = new Float32Array(size * size);
  const plane = lumaPlane(bm);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = Math.min(bm.w - 1, Math.floor(x * stepX));
      const y0 = Math.min(bm.h - 1, Math.floor(y * stepY));
      small[y * size + x] = plane[y0 * bm.w + x0]!;
    }
  }
  const blurred = gaussBlur({ data: u8(small), w: size, h: size }, sigma);
  const luma = lumaPlane(blurred);
  return { luma, edge: sobel(luma, size, size) };
}

function u8(plane: Float32Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(plane.length * 4);
  for (let i = 0; i < plane.length; i++) {
    const v = clamp(plane[i]!, 0, 1) * 255;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * Compare a rendered photo QR against its source photo.
 * `blurModules` should exceed one module so the QR lattice merges into
 * photographic tone (≈1.6 modules works well at 40×40).
 */
export function photoFidelity(
  source: Bitmap,
  rendered: Bitmap,
  gridSize = 40,
  blurModules = 1.6,
): FidelityBreakdown {
  const a = toSmall(source, gridSize, blurModules);
  const b = toSmall(rendered, gridSize, blurModules);

  const structure = (pearson(a.luma, b.luma) + 1) / 2; // −1..1 → 0..1
  const edges = (pearson(a.edge, b.edge) + 1) / 2;

  const sa = stats(a.luma);
  const sb = stats(b.luma);
  const ratio = sa.std > 1e-4 ? sb.std / sa.std : sb.std > 1e-4 ? 1 : 0;
  // Full credit when the blurred render keeps 45%–160% of the photo's
  // contrast; falls off outside that band.
  const range =
    ratio >= 0.45 && ratio <= 1.6
      ? 1
      : ratio < 0.45
        ? clamp(ratio / 0.45, 0, 1)
        : clamp(1 - (ratio - 1.6) / 1.2, 0, 1);

  const score = clamp(0.62 * structure + 0.26 * edges + 0.12 * range, 0, 1);
  return { score, structure, edges, range };
}
