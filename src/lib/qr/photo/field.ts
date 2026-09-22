/**
 * Photo → tone/color fields, at QR-module resolution.
 *
 * The photograph is decomposed by visual frequency:
 *   LOW  — heavy blur (≈2 modules): composition, silhouettes, sky/ground.
 *   MID  — band-pass around 0.5–1 module: eyes, mouth, horizon, boundaries.
 *   HIGH — dropped. Sub-module texture cannot survive a phone camera; the
 *          engine never spends a single pixel on it (hard rule).
 *
 * Deterministic: box blurs + percentile stretch only. No ML, no network.
 */

import { clamp, lumaPlane, type Bitmap } from "./imaging";

export interface ToneField {
  size: number; // module count
  /** Low-frequency brightness (0–1) per module — the silhouette carrier. */
  low: Float32Array;
  /** Final per-module tone (0–1 bright) = low + weighted mid band. */
  tone: Float32Array;
  /** Photo color per module (RGB 0–255). */
  color: Uint8Array; // size² * 3
}

function boxBlur1d(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (radius * 2 + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = clamp(x + k, 0, w - 1);
        s += src[y * w + xx]!;
      }
      tmp[y * w + x] = s * norm;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = clamp(y + k, 0, h - 1);
        s += tmp[yy * w + x]!;
      }
      out[y * w + x] = s * norm;
    }
  }
  return out;
}

/** Percentile stretch so flat photos still use the full tone range. */
function stretch(plane: Float32Array, amount: number): void {
  const n = plane.length;
  if (n < 16 || amount <= 0.01) return;
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(n / 3000));
  for (let i = 0; i < n; i += step) sample.push(plane[i]!);
  sample.sort((a, b) => a - b);
  const lo = sample[Math.floor(sample.length * 0.05)] ?? 0.1;
  const hi = sample[Math.floor(sample.length * 0.95)] ?? 0.9;
  const span = Math.max(0.12, hi - lo);
  for (let i = 0; i < n; i++) {
    const t = clamp((plane[i]! - lo) / span, 0, 1);
    plane[i] = plane[i]! + (t - plane[i]!) * amount;
  }
}

function sampleColor(src: Bitmap, fx: number, fy: number, out: Uint8Array, o: number) {
  const x = clamp(Math.round(fx * (src.w - 1)), 0, src.w - 1);
  const y = clamp(Math.round(fy * (src.h - 1)), 0, src.h - 1);
  const i = (y * src.w + x) * 4;
  out[o] = src.data[i]!;
  out[o + 1] = src.data[i + 1]!;
  out[o + 2] = src.data[i + 2]!;
}

export interface ToneFieldOptions {
  /** Weight of the mid-frequency band, 0–1. 0 = silhouettes only. */
  detail: number;
  /** Percentile stretch amount (0–1). */
  normalize?: number;
}

/**
 * Build the tone field from a square photo atlas (contain-fitted — same
 * atlas the studio already draws, so what you see is what is measured).
 * `atlasRes` is the atlas edge in px; internally downsampled to ~3 px/module
 * before blurring (cameras see blocks, not pixels).
 */
export function buildToneField(atlas: Bitmap, size: number, opts: ToneFieldOptions): ToneField {
  const smallEdge = Math.max(24, size * 3);
  const f = atlas.w / smallEdge;
  const atlasLum = lumaPlane(atlas);
  // nearest-ish box downscale via lumaSmall-style pooling
  const lum = new Float32Array(smallEdge * smallEdge);
  const step = Math.max(1, Math.floor(f));
  for (let y = 0; y < smallEdge; y++) {
    for (let x = 0; x < smallEdge; x++) {
      const x0 = Math.min(atlas.w - 1, Math.floor(x * f));
      const y0 = Math.min(atlas.h - 1, Math.floor(y * f));
      let acc = 0;
      let n = 0;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          acc += atlasLum[Math.min(atlas.h - 1, y0 + dy) * atlas.w + Math.min(atlas.w - 1, x0 + dx)]!;
          n++;
        }
      }
      lum[y * smallEdge + x] = acc / n;
    }
  }

  const lowFine = boxBlur1d(lum, smallEdge, smallEdge, Math.max(1, Math.round(smallEdge / size) * 2));
  const midFine = boxBlur1d(lum, smallEdge, smallEdge, Math.max(1, Math.round(smallEdge / size)));
  stretch(lowFine, opts.normalize ?? 0.8);

  const low = new Float32Array(size * size);
  const tone = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 3);
  const detailW = clamp(opts.detail, 0, 1);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mi = y * size + x;
      const fx = (x + 0.5) / size;
      const fy = (y + 0.5) / size;
      const sx = clamp(Math.round(fx * smallEdge - 0.5), 0, smallEdge - 1);
      const sy = clamp(Math.round(fy * smallEdge - 0.5), 0, smallEdge - 1);
      const lo = lowFine[sy * smallEdge + sx]!;
      const band = midFine[sy * smallEdge + sx]! - lowFine[sy * smallEdge + sx]!;
      // Mid band adds recognizable edges (eyes, mouth) on top of the base,
      // clamped so it can never flip a large region's polarity.
      const t = clamp(lo + band * detailW * 0.9, 0, 1);
      low[mi] = lo;
      tone[mi] = t;
      sampleColor(atlas, fx, fy, color, mi * 3);
    }
  }
  return { size, low, tone, color };
}

/** Exported for tests: build from an arbitrary luma plane directly. */
export function toneFieldFromLuma(
  lum: Float32Array,
  edge: number,
  size: number,
  opts: ToneFieldOptions,
): ToneField {
  const atlas: Bitmap = { data: new Uint8ClampedArray(edge * edge * 4), w: edge, h: edge };
  for (let p = 0; p < edge * edge; p++) {
    const v = clamp(lum[p]!, 0, 1) * 255;
    atlas.data[p * 4] = v;
    atlas.data[p * 4 + 1] = v;
    atlas.data[p * 4 + 2] = v;
    atlas.data[p * 4 + 3] = 255;
  }
  return buildToneField(atlas, size, opts);
}

export { lumaPlane };
