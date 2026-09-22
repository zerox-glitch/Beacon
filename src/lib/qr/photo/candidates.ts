/**
 * Candidate generation + selection (§12, §13).
 *
 * For every photo QR the engine can produce five deterministic candidates,
 * from maximum photographic detail to maximum camera robustness. Each is
 * scored on (a) photo fidelity — would a human recognize the subject — and
 * (b) camera robustness — does it survive the stress battery. Selection
 * enforces the camera-safety gate and the fidelity floor, then maximizes
 * fidelity; it never silently picks the most conservative candidate.
 */

import { clamp } from "./imaging";
import type { BatteryResult } from "./camera-sim";
import type { FidelityBreakdown } from "./fidelity";

export type CandidateId = "detail" | "structure" | "balanced" | "camera-safe" | "robust";

export interface CandidateParams {
  id: CandidateId;
  label: string;
  /** Camera-floor kernel diameter (fraction of module). */
  kernelMin: number;
  /** Largest kernel diameter (fraction of module) — >1 lets blobs merge. */
  kernelMax: number;
  /** Kernel-size response to tone. */
  toneGain: number;
  /** Surround painted photo-true (0 safe … 1 photographic). */
  surroundPhoto: number;
  /** Mid-frequency band weight (0 silhouettes … 1 adds edges/detail). */
  detail: number;
}

export const PHOTO_CANDIDATES: CandidateParams[] = [
  {
    id: "detail",
    label: "Maximum photographic detail",
    kernelMin: 0.4,
    kernelMax: 1.16,
    toneGain: 1.45,
    surroundPhoto: 0.9,
    detail: 0.75,
  },
  {
    id: "structure",
    label: "Larger photographic structures",
    kernelMin: 0.47,
    kernelMax: 1.1,
    toneGain: 1.3,
    surroundPhoto: 0.78,
    detail: 0.4,
  },
  {
    id: "balanced",
    label: "Balanced photo + camera",
    kernelMin: 0.53,
    kernelMax: 1.02,
    toneGain: 1.2,
    surroundPhoto: 0.66,
    detail: 0.22,
  },
  {
    id: "camera-safe",
    label: "Camera-safe",
    kernelMin: 0.6,
    kernelMax: 0.95,
    toneGain: 1.1,
    surroundPhoto: 0.55,
    detail: 0.08,
  },
  {
    id: "robust",
    label: "Maximum robustness",
    kernelMin: 0.68,
    kernelMax: 0.9,
    toneGain: 1,
    surroundPhoto: 0.45,
    detail: 0,
  },
];

export function candidateById(id: CandidateId): CandidateParams {
  return PHOTO_CANDIDATES.find((c) => c.id === id) ?? PHOTO_CANDIDATES[2]!;
}

/**
 * Adaptive detail (§14, §15): the effective pixels-per-module a viewer's
 * phone actually sees. `viewPxPerModule` is the module size in CSS px at
 * typical viewing (the studio previews at 512 bitmap shown near 320–420 CSS
 * px; a shared image lands around 6–8 px/module on a phone screen).
 *
 * Small modules → coarser structures, higher kernel floor, less detail.
 */
export function adaptToModuleScale(base: CandidateParams, viewPxPerModule: number): CandidateParams {
  const ppm = clamp(viewPxPerModule, 2.5, 24);
  // Below ~9 px/module start hardening the kernel floor; below 5 go coarse.
  const lift = ppm >= 12 ? 0 : ppm >= 9 ? 0.04 : ppm >= 6 ? 0.09 : 0.16;
  const detailCut = ppm >= 12 ? 1 : ppm >= 9 ? 0.7 : ppm >= 6 ? 0.4 : 0;
  return {
    ...base,
    kernelMin: clamp(base.kernelMin + lift, 0.3, 0.85),
    detail: base.detail * detailCut,
  };
}

export interface CandidateScore {
  id: CandidateId;
  fidelity: FidelityBreakdown;
  battery: BatteryResult;
  /** fidelity × battery.robustness — the §12 combined quality. */
  combined: number;
  /** Passes the hard gates for selection. */
  eligible: boolean;
}

/** Minimum camera robustness (weighted battery) for any shipped candidate. */
export const ROBUSTNESS_GATE = 0.62;
/** Minimum photo fidelity — never optimize past the point of recognition. */
export const FIDELITY_FLOOR = 0.42;

/**
 * Pick the winner. Candidates that fail the gates are out; among the rest
 * choose the HIGHEST FIDELITY (camera safety is the gate, not the goal),
 * tie-broken by robustness — so we never default to the most conservative
 * candidate just because it scans.
 */
export function selectBest(scores: CandidateScore[]): CandidateScore | null {
  const eligible = scores.filter((s) => s.eligible);
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    const fd = b.fidelity.score - a.fidelity.score;
    if (Math.abs(fd) > 0.02) return fd;
    return b.battery.robustness - a.battery.robustness;
  });
  return eligible[0]!;
}

/** Rank order from camera-safe → detailed, for escalation in Fix scan. */
export function escalationOrder(): CandidateParams[] {
  return [...PHOTO_CANDIDATES].reverse();
}

export function nextSaferCandidate(current: CandidateId): CandidateParams {
  const idx = PHOTO_CANDIDATES.findIndex((c) => c.id === current);
  return PHOTO_CANDIDATES[clamp(idx + 1, 0, PHOTO_CANDIDATES.length - 1)] ?? PHOTO_CANDIDATES[4]!;
}
