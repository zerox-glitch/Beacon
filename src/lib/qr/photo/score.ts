/**
 * Candidate scoring — pure orchestration shared by the browser refinement
 * pass and the node test harness. Renders every candidate through the real
 * rasterizer, runs the camera battery + fidelity metric, applies the gates.
 */

import type { EncodedQr } from "../encode";
import { cellRole, isDark } from "../structure";
import { runCameraBattery, type DecodeFn } from "./camera-sim";
import { buildToneField, type ToneField } from "./field";
import { photoFidelity } from "./fidelity";
import { rasterizePhotoQr, type PhotoRenderParams } from "./raster";
import {
  FIDELITY_FLOOR,
  PHOTO_CANDIDATES,
  ROBUSTNESS_GATE,
  adaptToModuleScale,
  type CandidateId,
  type CandidateParams,
  type CandidateScore,
} from "./candidates";
import { clamp } from "./imaging";

export interface StyleToParamsInput {
  mode: "photo" | "mono" | "duotone";
  /** QrStyle.artisticStrength (0–1). */
  strength: number;
  /** QrStyle.contrast (0.3–1). */
  contrast: number;
  /** QrStyle.dotScale (0.5–1) — heavier dots = bigger kernels. */
  dotScale: number;
  /** QrStyle.imageOpacity — chroma kept in inks. */
  chroma: number;
  /** Fix-scan boost 0–1 raises the kernel floor. */
  boost: number;
  /** Effective pixels per module at realistic phone viewing. */
  viewPxPerModule: number;
  /** Module count N — drives the §14 adaptive hardening at small matrices. */
  modules?: number;
  fg: [number, number, number];
  bg: [number, number, number];
  duoDark?: [number, number, number];
  duoLight?: [number, number, number];
}

export function candidateParams(
  cand: CandidateParams,
  input: StyleToParamsInput,
): { render: Omit<PhotoRenderParams, "size" | "ss" | "bits" | "isProtected" | "colorMode" | "fg" | "bg" | "duoDark" | "duoLight">; detail: number } {
  const strength = clamp(input.strength, 0, 1);
  const contrast = clamp(input.contrast, 0.3, 1);
  // Empirical kernel targets from kernel.ts — the module centre ink.
  const darkT = clamp(0.05 + (1 - contrast) * 0.07 + strength * 0.06, 0.03, 0.22);
  const lightT = clamp(0.95 - (1 - contrast) * 0.06 - strength * 0.05, 0.78, 0.97);
  const adapted = adaptToModuleScale(cand, input.viewPxPerModule);
  const boost = clamp(input.boost, 0, 1);
  // §14 adaptive hardening at small matrices: ≤33 modules carry little ECC
  // slack, so the surround keeps more safe polarity and kernels grow.
  const smallMatrix = (input.modules ?? qrSizeOf(input)) <= 33;
  // "Photo QR" (paint) is sold on the picture reading from a distance:
  // push the surround toward photo-true so dots never swamp the image.
  // The camera battery still vetoes it per photo when it can't scan.
  const photoModeBoost = input.mode === "photo" ? 1.25 : 1;
  return {
    render: {
      // dotScale is the user's "Dot size" slider — give it real travel so
      // smaller dots let more of the picture's surround show through.
      kernelMin: clamp(
        adapted.kernelMin + (smallMatrix ? 0.05 : 0) + (input.dotScale - 0.68) * 0.5 + boost * 0.15,
        0.3,
        0.88,
      ),
      kernelMax: Math.max(0.4, adapted.kernelMax - (smallMatrix ? 0.06 : 0) - boost * 0.12),
      toneGain: adapted.toneGain,
      surroundPhoto: clamp(
        adapted.surroundPhoto * photoModeBoost * (smallMatrix ? 0.7 : 1) * (1 - boost * 0.35),
        0,
        1,
      ),
      darkT,
      lightT,
      chroma: clamp(input.chroma, 0.1, 1),
    },
    detail: adapted.detail * clamp(strength * 1.6, 0, 1.15),
  };
}


function qrSizeOf(input: StyleToParamsInput): number {
  return 37; // product-standard photo matrix (version 5, ECC H)
}

export function roleMaps(qr: EncodedQr): { bits: Uint8Array; isProtected: Uint8Array } {
  const n = qr.size;
  const bits = new Uint8Array(n * n);
  const isProtected = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      bits[i] = isDark(qr, x, y) ? 1 : 0;
      isProtected[i] = cellRole(qr, x, y) === "data" ? 0 : 1;
    }
  }
  return { bits, isProtected };
}

export interface ScoreInput {
  qr: EncodedQr;
  /** Square photo atlas (contain-fitted). */
  atlas: { data: Uint8ClampedArray; w: number; h: number };
  style: StyleToParamsInput;
  ss?: number;
  decode: DecodeFn;
  expected?: string | null;
  /** Restrict to one candidate (re-scoring after a param change). */
  only?: CandidateId;
}

export function scoreAllCandidates(input: ScoreInput): CandidateScore[] {
  const field = buildToneField(input.atlas, input.qr.size, { detail: 1, normalize: 0.8 });
  const { bits, isProtected } = roleMaps(input.qr);
  const scores: CandidateScore[] = [];
  for (const cand of PHOTO_CANDIDATES) {
    if (input.only && cand.id !== input.only) continue;
    scores.push(scoreOne(cand, input, field, bits, isProtected));
  }
  return scores;
}

export function scoreOne(
  cand: CandidateParams,
  input: ScoreInput,
  field?: ToneField,
  bits?: Uint8Array,
  isProtected?: Uint8Array,
): CandidateScore {
  const f = field ?? buildToneField(input.atlas, input.qr.size, { detail: 1, normalize: 0.8 });
  const maps = bits && isProtected ? { bits, isProtected } : roleMaps(input.qr);
  const { render, detail } = candidateParams(cand, input.style);
  const effField: ToneField = detail >= 0.985
    ? f
    : rebuildFieldWithDetail(f, input.atlas, input.qr.size, detail);
  const ss = input.ss ?? 8;
  const { bitmap } = rasterizePhotoQr(effField, {
    size: input.qr.size,
    ss,
    ...render,
    colorMode: input.style.mode,
    fg: input.style.fg,
    bg: input.style.bg,
    duoDark: input.style.duoDark ?? [30, 26, 20],
    duoLight: input.style.duoLight ?? [236, 224, 200],
    bits: maps.bits,
    isProtected: maps.isProtected,
  });

  const fidelity = photoFidelity(input.atlas, bitmap, 40, 1.6);
  const battery = runCameraBattery(bitmap, input.decode, input.expected);
  const eligible =
    battery.robustness >= ROBUSTNESS_GATE && battery.cameraRobust && fidelity.score >= FIDELITY_FLOOR;
  return {
    id: cand.id,
    fidelity,
    battery,
    combined: fidelity.score * battery.robustness,
    eligible,
  };
}

/** Rebuild the tone field with a specific detail weight (cached upstream). */
function rebuildFieldWithDetail(base: ToneField, atlas: ScoreInput["atlas"], size: number, detail: number): ToneField {
  if (detail >= 0.985) return base;
  return buildToneField(atlas, size, { detail, normalize: 0.8 });
}

export { ROBUSTNESS_GATE, FIDELITY_FLOOR };
