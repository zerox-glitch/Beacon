import { kernelTarget } from "./kernel";
import type { EncodedQr } from "../encode";
import { cellRole, isDark, isProtectedRole } from "../structure";
import type { ModuleShape } from "../types";

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

function inModuleShape(fx: number, fy: number, shape: ModuleShape | undefined): boolean {
  const dx = fx - 0.5;
  const dy = fy - 0.5;
  switch (shape) {
    case "dots":
    case "bubbles":
      return dx * dx + dy * dy <= 0.5 * 0.5;
    case "diamond":
      return Math.abs(dx) + Math.abs(dy) <= 0.58;
    default:
      // Stars, dashes, hearts etc. punch too many bits on a photo weave.
      // Fill the whole module so cameras still see a full 0/1.
      return true;
  }
}

export interface PhotoLumaOpts {
  bias: number;
  strength: number;
  contrast: number;
  fade: number;
  /** 0.25 = tiny camera bit, 0.95 = almost the whole module. */
  dotScale?: number;
  /** Un-remapped photo rim around each module (0–0.35). */
  moduleGap?: number;
  moduleShape?: ModuleShape;
}

/**
 * Keep photo hue/texture; push each module's luminance toward its QR bit.
 * Center of the module is pushed harder (Chu centroid) with a soft falloff.
 * Mutates `pixels` (RGBA, n×n). Skips finder/separator islands.
 */
export function remapPhotoLuma(
  pixels: Uint8ClampedArray,
  n: number,
  qr: EncodedQr,
  opts: PhotoLumaOpts,
): void {
  const size = qr.size;
  const step = n / size;
  const contrast = clamp(opts.contrast, 0.3, 1);
  const fade = clamp(opts.fade, 0.15, 1);
  const scale = clamp(opts.dotScale ?? 0.9, 0.5, 1);
  const gap = clamp(opts.moduleGap ?? 0, 0, 0.18);
  const darkT = lerp(0.14, kernelTarget(true, opts.strength, contrast), contrast);
  const lightT = lerp(0.86, kernelTarget(false, opts.strength, contrast), contrast);
  const mix = clamp(0.68 + contrast * 0.2 - fade * 0.1 + opts.bias * 0.12, 0.64, 0.93);
  const roles: ReturnType<typeof cellRole>[] = new Array(size * size);
  const darks = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      roles[i] = cellRole(qr, x, y);
      darks[i] = isDark(qr, x, y) ? 1 : 0;
    }
  }

  const reach = Math.max(0.78, scale);
  const rim = 1 - gap;

  for (let i = 0; i < pixels.length; i += 4) {
    const p = i >> 2;
    const px = p % n;
    const py = (p / n) | 0;
    const mx = px / step;
    const my = py / step;
    const x = mx < size ? mx | 0 : size - 1;
    const y = my < size ? my | 0 : size - 1;
    const role = roles[y * size + x]!;
    if (role === "finder" || role === "separator") continue;

    const fx = mx - x;
    const fy = my - y;
    if (!inModuleShape(fx, fy, opts.moduleShape)) continue;
    const dist = Math.max(Math.abs(fx - 0.5), Math.abs(fy - 0.5)) * 2;
    if (dist > rim) continue;

    const t = clamp(1 - dist / reach, 0, 1);
    const guarded = isProtectedRole(role);
    const centerAmt = guarded ? Math.min(0.94, mix + 0.12) : mix;
    const amount = lerp(centerAmt * 0.84, centerAmt, t);
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const L = luma(r, g, b);
    const target = darks[y * size + x] ? lerp(L, darkT, amount) : lerp(L, lightT, amount);
    const [nr, ng, nb] = setLuminance(r, g, b, target);
    pixels[i] = nr;
    pixels[i + 1] = ng;
    pixels[i + 2] = nb;
  }
}

export { luma, setLuminance };
