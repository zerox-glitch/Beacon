/**
 * Deterministic camera-stress simulation (§10 of the photo rebuild spec).
 *
 * Approximates what happens between the exported PNG and a phone decoder:
 * sensor binning/downscaling, lens & ISP blur, flat lighting (contrast
 * compression), exposure shift, JPEG frame compression and off-axis capture.
 * Every step is pure math — same result in browser and node.
 */

import {
  brightnessShift,
  contrastReduce,
  downscale,
  gaussBlur,
  jpegish,
  perspective,
  type Bitmap,
} from "./imaging";

export type DecodeFn = (bm: Bitmap) => string | null;

export interface CameraVariant {
  id: string;
  weight: number;
  label: string;
  apply: (bm: Bitmap) => Bitmap;
}

/** Scaled square render of the QR as a phone might receive it. */
export function fitSquare(bm: Bitmap, size: number): Bitmap {
  const out = new Uint8ClampedArray(size * size * 4);
  const sx = bm.w / size;
  const sy = bm.h / size;
  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < Math.min(y1, bm.h); yy++) {
        for (let xx = x0; xx < Math.min(x1, bm.w); xx++) {
          const i = (yy * bm.w + xx) * 4;
          r += bm.data[i]!;
          g += bm.data[i + 1]!;
          b += bm.data[i + 2]!;
          n++;
        }
      }
      const o = (y * size + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { data: out, w: size, h: size };
}

/**
 * The stress battery. Weights reflect how common/lethal each condition is:
 * plain downscales are the everyday case; blur+perspective is the hard tail.
 */
export function cameraVariants(): CameraVariant[] {
  return [
    { id: "identity", weight: 2, label: "as exported", apply: (bm) => bm },
    { id: "s75", weight: 1.5, label: "75% scale", apply: (bm) => fitSquare(bm, Math.round(bm.w * 0.75)) },
    { id: "s50", weight: 2.5, label: "50% scale", apply: (bm) => fitSquare(bm, Math.round(bm.w * 0.5)) },
    { id: "s33", weight: 1.5, label: "33% scale", apply: (bm) => fitSquare(bm, Math.round(bm.w / 3)) },
    { id: "blur", weight: 1.5, label: "mild blur", apply: (bm) => gaussBlur(bm, Math.max(1, bm.w / 420)) },
    {
      id: "blur-s50",
      weight: 2.5,
      label: "blur + 50%",
      apply: (bm) => fitSquare(gaussBlur(bm, Math.max(1, bm.w / 380)), Math.round(bm.w * 0.5)),
    },
    { id: "contrast", weight: 1, label: "flat light", apply: (bm) => contrastReduce(bm, 0.55) },
    { id: "bright", weight: 0.75, label: "bright wall", apply: (bm) => brightnessShift(bm, 0.09) },
    { id: "dark", weight: 0.75, label: "dim room", apply: (bm) => brightnessShift(bm, -0.09) },
    { id: "jpeg", weight: 1.5, label: "frame JPEG", apply: (bm) => jpegish(bm, 45) },
    {
      id: "jpeg-s50",
      weight: 2,
      label: "JPEG + 50%",
      apply: (bm) => fitSquare(jpegish(bm, 45), Math.round(bm.w * 0.5)),
    },
    {
      id: "persp-blur",
      weight: 1.5,
      label: "angle + blur",
      apply: (bm) => gaussBlur(perspective(bm, 0.12), Math.max(1, bm.w / 480)),
    },
    {
      id: "s33-blur",
      weight: 1,
      label: "33% + blur",
      apply: (bm) => fitSquare(gaussBlur(bm, Math.max(1, bm.w / 500)), Math.round(bm.w / 3)),
    },
  ];
}

export interface BatteryResult {
  /** Weighted pass ratio 0–1. */
  robustness: number;
  passed: Set<string>;
  failed: Set<string>;
  /** True when identity + 50% + JPEG (the non-negotiables) all pass. */
  cameraRobust: boolean;
  firstFailure: string | null;
}

export const CAMERA_ROBUST_REQUIRED = ["identity", "s50", "jpeg"] as const;

/**
 * Run the full battery. `decode` returns the decoded payload or null.
 * `expected` (when given) must match — a wrong payload is a failure.
 */
export function runCameraBattery(
  bm: Bitmap,
  decode: DecodeFn,
  expected?: string | null,
): BatteryResult {
  const variants = cameraVariants();
  let total = 0;
  let won = 0;
  const passed = new Set<string>();
  const failed = new Set<string>();
  let firstFailure: string | null = null;
  for (const v of variants) {
    let ok: boolean;
    try {
      const out = v.apply(bm);
      const got = decode(out);
      ok = expected ? got === expected : Boolean(got);
    } catch {
      ok = false;
    }
    total += v.weight;
    if (ok) {
      won += v.weight;
      passed.add(v.id);
    } else {
      failed.add(v.id);
      if (!firstFailure) firstFailure = v.id;
    }
  }
  const cameraRobust = CAMERA_ROBUST_REQUIRED.every((id) => passed.has(id));
  return {
    robustness: total ? won / total : 0,
    passed,
    failed,
    cameraRobust,
    firstFailure,
  };
}
