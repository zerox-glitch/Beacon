import type { ImageMode, ModuleShape, QrStyle } from "../types";

export type ImageProfile = "flat" | "dark" | "bright" | "detail" | "portrait" | "vivid" | "balanced";

export interface ImageAnalysis {
  meanLuma: number;
  contrast: number;
  saturation: number;
  edgeDensity: number;
  darkShare: number;
  lightShare: number;
  centerLuma: number;
  dominant: [number, number, number];
  profile: ImageProfile;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function sat(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b) / 255;
  const mn = Math.min(r, g, b) / 255;
  if (mx < 0.001) return 0;
  return (mx - mn) / mx;
}

/**
 * Deterministic image stats on a 64×64 cover sample. Not a neural net.
 */
export function analyzeImage(img: HTMLImageElement): ImageAnalysis {
  const n = 64;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) {
    return {
      meanLuma: 0.5,
      contrast: 0.4,
      saturation: 0.3,
      edgeDensity: 0.2,
      darkShare: 0.4,
      lightShare: 0.4,
      centerLuma: 0.5,
      dominant: [120, 120, 120],
      profile: "balanced",
    };
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(n / iw, n / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  cx.drawImage(img, (n - dw) / 2, (n - dh) / 2, dw, dh);
  const data = cx.getImageData(0, 0, n, n).data;

  const lumas: number[] = [];
  let sumL = 0;
  let sumS = 0;
  let dark = 0;
  let light = 0;
  let cr = 0;
  let cg = 0;
  let cb = 0;
  let centerL = 0;
  let centerN = 0;
  let edges = 0;
  let edgeN = 0;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const L = luma(r, g, b);
      lumas.push(L);
      sumL += L;
      sumS += sat(r, g, b);
      cr += r;
      cg += g;
      cb += b;
      if (L < 0.28) dark++;
      if (L > 0.78) light++;
      if (x > n * 0.3 && x < n * 0.7 && y > n * 0.25 && y < n * 0.7) {
        centerL += L;
        centerN++;
      }
      if (x > 0 && y > 0) {
        const j = (y * n + (x - 1)) * 4;
        const k = ((y - 1) * n + x) * 4;
        const d =
          Math.abs(L - luma(data[j]!, data[j + 1]!, data[j + 2]!)) +
          Math.abs(L - luma(data[k]!, data[k + 1]!, data[k + 2]!));
        if (d > 0.18) edges++;
        edgeN++;
      }
    }
  }

  const count = n * n;
  lumas.sort((a, b) => a - b);
  const p10 = lumas[Math.floor(count * 0.1)] ?? 0.2;
  const p90 = lumas[Math.floor(count * 0.9)] ?? 0.8;
  const meanLuma = sumL / count;
  const contrast = clamp(p90 - p10, 0, 1);
  const saturation = sumS / count;
  const edgeDensity = edgeN ? edges / edgeN : 0;
  const centerLuma = centerN ? centerL / centerN : meanLuma;

  let profile: ImageProfile = "balanced";
  if (contrast < 0.22) profile = "flat";
  else if (meanLuma < 0.28) profile = "dark";
  else if (meanLuma > 0.78) profile = "bright";
  else if (edgeDensity > 0.38) profile = "detail";
  else if (saturation > 0.45) profile = "vivid";
  else if (centerLuma > meanLuma + 0.08 && edgeDensity < 0.32) profile = "portrait";

  return {
    meanLuma,
    contrast,
    saturation,
    edgeDensity,
    darkShare: dark / count,
    lightShare: light / count,
    centerLuma,
    dominant: [cr / count, cg / count, cb / count],
    profile,
  };
}

export interface SmartArtSuggestion {
  patch: Partial<QrStyle>;
  reason: string;
}

/** Map analysis → renderer knobs. Deterministic, no network. */
export function smartArtPatch(analysis: ImageAnalysis): SmartArtSuggestion {
  const base: Partial<QrStyle> = {
    ecc: "H",
    quietZone: 3,
    effect: "none",
    transparentBg: false,
  };

  switch (analysis.profile) {
    case "flat":
      return {
        patch: { ...base, imageMode: "paint", contrast: 0.92, artisticStrength: 0.32, moduleShape: "square" },
        reason: "Low contrast photo — raised contrast, quieter weave",
      };
    case "dark":
      return {
        patch: { ...base, imageMode: "paint", contrast: 0.88, artisticStrength: 0.38, moduleShape: "rounded" },
        reason: "Dark photo — lifted module contrast so bits still separate",
      };
    case "bright":
      return {
        patch: { ...base, imageMode: "paint", contrast: 0.9, artisticStrength: 0.36, moduleShape: "square" },
        reason: "Bright photo — darker kernels so snow/sky still reads as bits",
      };
    case "detail":
      return {
        patch: { ...base, imageMode: "halftone", contrast: 0.84, artisticStrength: 0.48, moduleShape: "square" },
        reason: "Busy detail — halftone keeps texture without smearing bits",
      };
    case "portrait":
      return {
        patch: { ...base, imageMode: "paint", contrast: 0.78, artisticStrength: 0.52, moduleShape: "rounded" },
        reason: "Face-like tones — Photo QR with a softer kernel",
      };
    case "vivid":
      return {
        patch: {
          ...base,
          imageMode: "mosaic",
          contrast: 0.82,
          artisticStrength: 0.5,
          gradientType: "image",
          moduleShape: "rounded",
        },
        reason: "Saturated color — color-blend modules with an image gradient",
      };
    default:
      return {
        patch: { ...base, imageMode: "paint" as ImageMode, contrast: 0.82, artisticStrength: 0.44, moduleShape: "square" as ModuleShape },
        reason: "Balanced photo — Photo QR at a middle strength",
      };
  }
}
