/**
 * PhotoQrV2 rasterizer — "a photograph constructed from QR information".
 *
 * Visual model (replaces the sub-cell halftone lattice):
 *
 *   • The smallest photo feature is ONE QR MODULE or larger — never a
 *     sub-module dot. Features below ~1 module cannot survive camera
 *     downsampling, so the engine refuses to draw them (hard rule).
 *   • Every module carries a KERNEL: a solid disc of its own QR polarity,
 *     centered on the module. Decoders sample the module centre; the kernel
 *     guarantees that sample. Its diameter never drops below `kernelMin`
 *     of the module — the camera-survivable floor.
 *   • The KERNEL SIZE carries the photograph: in dark photo regions dark
 *     kernels grow until they merge into organic blobs (silhouettes emerge
 *     across module groups); light kernels shrink to the floor. In bright
 *     regions the reverse. This is amplitude-modulated halftoning at module
 *     granularity — multi-module photographic structure by construction.
 *   • The SURROUND (the rest of the module) is painted with the photo's own
 *     tone (softened) and hue, so regions read photographically true.
 *   • Function patterns (finders, separators, timing, alignment, format,
 *     version) are solid polarity — untouched by tone. The quiet zone is
 *     never drawn on.
 *
 * Pure typed-array code: identical output in the browser and in node tests.
 */

import { clamp, setLuminance, type Bitmap } from "./imaging";
import type { ToneField } from "./field";

/** How much of the module the photo may shape, per style strength (0–1). */
export interface PhotoRenderParams {
  size: number; // module count N
  ss: number; // supersampled subpixels per module (output = N*ss square)
  /** Camera-floor kernel diameter as a fraction of the module (0.3–0.9). */
  kernelMin: number;
  /** Largest kernel diameter fraction (blobs merge above 1.0 of a module). */
  kernelMax: number;
  /** How sharply kernel size responds to tone (0.5–2). */
  toneGain: number;
  /** 0 = surround in safe polarity, 1 = surround fully photo-true. */
  surroundPhoto: number;
  /** Target luma for dark ink (0–1). */
  darkT: number;
  /** Target luma for light ink (0–1). */
  lightT: number;
  /** Photo chroma kept in inks (0–1; 0 = grayscale). */
  chroma: number;
  colorMode: "photo" | "mono" | "duotone";
  fg: [number, number, number];
  bg: [number, number, number];
  duoDark: [number, number, number];
  duoLight: [number, number, number];
  /** Bit + role maps from the encoded matrix. */
  bits: Uint8Array; // N*N
  isProtected: Uint8Array; // N*N — 1 = function pattern (solid)
}

export interface RenderedPhotoQr {
  /** RGBA at (size*ss)² — the QR body only (quiet zone drawn by the caller). */
  bitmap: Bitmap;
  /** Kernel diameter fractions actually used (for tests/telemetry). */
  kernelFloor: number;
}

const DARK_SOFT = 0.2; // surround floor for "safe polarity" painting
const LIGHT_SOFT = 0.8;

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Rasterize the photo QR body at supersampled resolution.
 * `field.tone` is brightness (1 = photo wants white, 0 = photo wants black).
 */
export function rasterizePhotoQr(field: ToneField, p: PhotoRenderParams): RenderedPhotoQr {
  const N = p.size;
  const ss = Math.round(p.ss);
  const W = N * ss;
  const out = new Uint8ClampedArray(W * W * 4);
  const kernelFloor = clamp(p.kernelMin, 0.3, 0.9);
  const kernelCeil = Math.max(kernelFloor + 0.05, clamp(p.kernelMax, 0.35, 1.25));
  const gain = clamp(p.toneGain, 0.4, 2.2);

  const half = ss / 2;
  const rMin = (kernelFloor * ss) / 2;
  const rMax = (kernelCeil * ss) / 2;

  // soft polarity targets for the surround
  const darkSoftT = p.darkT + (0.5 - p.darkT) * (1 - DARK_SOFT) * 0.55;
  const lightSoftT = p.lightT - (p.lightT - 0.5) * (1 - LIGHT_SOFT) * 0.55;

  // Per-cell scratch colors
  const surround: [number, number, number] = [0, 0, 0];
  const ink: [number, number, number] = [0, 0, 0];

  const mixChroma = (rgb: [number, number, number], keep: number) => {
    if (keep >= 0.999) return;
    const gray = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]);
    rgb[0] = gray + (rgb[0] - gray) * keep;
    rgb[1] = gray + (rgb[1] - gray) * keep;
    rgb[2] = gray + (rgb[2] - gray) * keep;
  };

  const pickInk = (dark: boolean, ci: number): [number, number, number] => {
    if (p.colorMode === "mono") return dark ? p.fg : p.bg;
    if (p.colorMode === "duotone") return dark ? p.duoDark : p.duoLight;
    const pr = field.color[ci]!;
    const pg = field.color[ci + 1]!;
    const pb = field.color[ci + 2]!;
    const t = setLuminance(pr, pg, pb, dark ? p.darkT : p.lightT);
    const rgb: [number, number, number] = [t[0], t[1], t[2]];
    mixChroma(rgb, p.chroma);
    return rgb;
  };

  for (let my = 0; my < N; my++) {
    for (let mx = 0; mx < N; mx++) {
      const mi = my * N + mx;
      const protectedCell = p.isProtected[mi] === 1;
      const bitDark = p.bits[mi] === 1;

      const x0 = mx * ss;
      const y0 = my * ss;
      const ci = mi * 3;

      if (protectedCell) {
        // Function patterns: solid polarity, style colors. Zero photo here —
        // finders must be trivially locatable.
        const c = pickInk(bitDark, ci);
        for (let y = y0; y < y0 + ss; y++) {
          for (let x = x0; x < x0 + ss; x++) {
            const i = (y * W + x) * 4;
            out[i] = c[0];
            out[i + 1] = c[1];
            out[i + 2] = c[2];
            out[i + 3] = 255;
          }
        }
        continue;
      }

      const tone = field.tone[mi]!; // 0..1 photo brightness
      const photoDark = 1 - tone;

      // Kernel diameter fraction: bright photo → small dark kernels; dark
      // photo → merged dark blobs. Light modules mirror the logic.
      const drive = bitDark ? photoDark : tone;
      const shaped = smoothstep(0.18, 0.82, 0.5 + (drive - 0.5) * gain);
      const diameter = kernelFloor + (kernelCeil - kernelFloor) * shaped;
      const radius = Math.max(rMin, (diameter * ss) / 2);

      // Surround color: photo tone-true (softened), hue from the photo.
      // surroundPhoto=0 collapses to a safe opposite-polarity wash.
      {
        const pr = field.color[ci]!;
        const pg = field.color[ci + 1]!;
        const pb = field.color[ci + 2]!;
        const photoT = clamp(0.18 + tone * 0.64, 0, 1); // softened photo tone
        const safeT = bitDark ? darkSoftT : lightSoftT;
        const t = safeT + (photoT - safeT) * clamp(p.surroundPhoto, 0, 1);
        const s = setLuminance(pr, pg, pb, t);
        surround[0] = s[0];
        surround[1] = s[1];
        surround[2] = s[2];
        mixChroma(surround, Math.min(1, p.chroma + 0.1));
      }
      const disc = pickInk(bitDark, ci);
      ink[0] = disc[0];
      ink[1] = disc[1];
      ink[2] = disc[2];

      const cx = x0 + half - 0.5;
      const cy = y0 + half - 0.5;
      const r2 = (radius + 0.25) * (radius + 0.25);

      // Paint: surround rect, then AA disc on top. A light module in a dark
      // region = light disc on dark surround; dark module in bright region =
      // dark disc on light surround. Both survive centre sampling.
      for (let y = y0; y < y0 + ss; y++) {
        const dy = y - cy;
        for (let x = x0; x < x0 + ss; x++) {
          const dx = x - cx;
          const d2 = dx * dx + dy * dy;
          // 2×2 subpixel coverage → cheap analytic AA
          let cov: number;
          if (d2 <= (radius - 0.75) * (radius - 0.75)) cov = 1;
          else if (d2 >= r2) cov = 0;
          else {
            // distance to circle edge over a ~1px transition band
            const d = Math.sqrt(d2);
            cov = clamp(radius + 0.25 - d, 0, 1);
          }
          const i = (y * W + x) * 4;
          out[i] = surround[0] + (ink[0] - surround[0]) * cov;
          out[i + 1] = surround[1] + (ink[1] - surround[1]) * cov;
          out[i + 2] = surround[2] + (ink[2] - surround[2]) * cov;
          out[i + 3] = 255;
        }
      }
    }
  }

  return { bitmap: { data: out, w: W, h: W }, kernelFloor };
}

/** Scale a bitmap by an integer-ish factor with nearest sampling (crisp). */
export function nearestUpscale(bm: Bitmap, factor: number): Bitmap {
  const f = Math.max(1, Math.round(factor));
  if (f === 1) return bm;
  const w = bm.w * f;
  const h = bm.h * f;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / f);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / f);
      const si = (sy * bm.w + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = bm.data[si]!;
      out[di + 1] = bm.data[si + 1]!;
      out[di + 2] = bm.data[si + 2]!;
      out[di + 3] = 255;
    }
  }
  return out ? { data: out, w, h } : bm;
}
