import { kernelTarget } from "./kernel";
import type { EncodedQr } from "../encode";
import { cellRole, isDark, isProtectedRole } from "../structure";

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

/**
 * Keep photo hue/texture; push each module's luminance toward its QR bit.
 * Center of the module is pushed harder (Chu centroid) with a soft falloff.
 * Mutates `pixels` (RGBA, n×n). Skips finder/separator islands.
 */
export function remapPhotoLuma(
  pixels: Uint8ClampedArray,
  n: number,
  qr: EncodedQr,
  bias: number,
  strength: number,
  contrast: number,
  fade: number,
): void {
  const size = qr.size;
  const step = n / size;
  const darkT = kernelTarget(true, strength, contrast);
  const lightT = kernelTarget(false, strength, contrast);
  const fadeMul = clamp(1.08 - fade * 0.22, 0.82, 1);
  const roles: ReturnType<typeof cellRole>[] = new Array(size * size);
  const darks = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      roles[i] = cellRole(qr, x, y);
      darks[i] = isDark(qr, x, y) ? 1 : 0;
    }
  }

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
    const dist = Math.max(Math.abs(fx - 0.5), Math.abs(fy - 0.5)) * 2;
    const center = clamp(1 - dist * dist, 0, 1);
    const guarded = isProtectedRole(role);
    const edgeAmt = clamp(bias * 0.72 * fadeMul, guarded ? 0.42 : 0.2, 0.7);
    const centerAmt = clamp((guarded ? bias + 0.3 : bias + 0.22) * fadeMul, guarded ? 0.74 : 0.6, 0.94);
    const amount = lerp(edgeAmt, centerAmt, center);
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
