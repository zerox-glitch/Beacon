/**
 * ART QR STYLE SYSTEM — the relax ladder.
 *
 * The rule: a style that looks beautiful but fails the camera battery must
 * reduce its artistic intensity *until it passes* — but it must NOT be reduced
 * all the way to a boring conventional QR unless that is genuinely the only
 * option left. So the ladder changes shape, grouping, spacing, colour
 * separation and decoration first, and only hands over to the generic
 * style-only ladder at the very end.
 *
 * Every rung is a deterministic patch on `QrStyle` plus (for the last rung)
 * the direction's own `cameraSafe` fallback. Rung 0 is the direction exactly
 * as authored.
 */

import { MIN_DARK_MASS, getArtDirection } from "../art-directions";
import type { ArtDirection } from "../types";
import type { QrStyle } from "../types";

export interface RelaxRung {
  /** Ladder index; 0 = as authored. */
  level: number;
  patch: Partial<QrStyle>;
  /** Also render with the direction's camera-safe fallback. */
  cameraSafe?: boolean;
  /** Human-readable fragment, shown by Fix scan. */
  note: string;
  /** Which visual dimension this rung gives up (QA + copy). */
  dimension: "decoration" | "distortion" | "spacing" | "grouping" | "shape" | "colour" | "fallback";
}

export function relaxLadder(style: QrStyle): RelaxRung[] {
  const dir = getArtDirection(style.artDirection);
  if (!dir) return [];

  const mass = Math.max(dir.mass, MIN_DARK_MASS);
  const base: Partial<QrStyle> = { artRelax: 0 };

  return [
    { level: 0, patch: base, note: "as designed", dimension: "decoration" },
    {
      level: 1,
      patch: { ...base, artRelax: 1 },
      note: "dropped the fine decoration",
      dimension: "decoration",
    },
    {
      level: 2,
      patch: { ...base, artRelax: 2, moduleGap: 0, contrast: Math.max(style.contrast, 0.94) },
      note: "closed the module gaps",
      dimension: "spacing",
    },
    {
      level: 3,
      patch: { ...base, artRelax: 3, moduleGap: 0, quietZone: Math.max(style.quietZone, 4) },
      note: "widened the quiet zone",
      dimension: "spacing",
    },
    {
      level: 4,
      patch: { ...base, artRelax: 4, moduleGap: 0, quietZone: Math.max(style.quietZone, 4) },
      note: "simplified the module grouping",
      dimension: "grouping",
    },
    {
      level: 5,
      patch: { ...base, artRelax: 5, moduleGap: 0, quietZone: Math.max(style.quietZone, 4), ecc: "H" },
      note: "heavier ink, stronger error correction",
      dimension: "colour",
    },
    {
      level: 6,
      patch: {
        ...base,
        artRelax: 6,
        moduleGap: 0,
        quietZone: Math.max(style.quietZone, 4),
        ecc: "H",
      },
      cameraSafe: true,
      note: "camera-safe cut of the same design",
      dimension: "fallback",
    },
  ];
}

/**
 * Apply a rung to a direction. This is the single place where "reduce artistic
 * intensity" is defined, so the browser Fix-scan ladder and the offline
 * validation harness always walk the same steps.
 */
export function applyRung(dir: ArtDirection, rung: RelaxRung): { dir: ArtDirection; cameraSafe: boolean } {
  const out: ArtDirection = { ...dir };
  switch (rung.level) {
    case 1:
      out.distortion = "none";
      out.accentMark = "none";
      out.accentFreq = 0;
      break;
    case 2:
      out.distortion = "none";
      out.accentMark = "none";
      out.accentFreq = 0;
      out.gap = 0;
      out.mass = Math.max(out.mass, mass09(dir));
      break;
    case 3:
      out.distortion = "none";
      out.accentMark = "none";
      out.accentFreq = 0;
      out.gap = 0;
      out.mass = Math.max(out.mass, mass09(dir));
      out.minSeparation = 0.52;
      break;
    case 4:
      out.distortion = "none";
      out.accentMark = "none";
      out.accentFreq = 0;
      out.gap = 0;
      out.mass = Math.max(out.mass, 0.92);
      out.minSeparation = 0.52;
      if (out.geometry === "components" || out.geometry === "traces") out.geometry = "runs-both";
      break;
    case 5:
      out.distortion = "none";
      out.accentMark = "none";
      out.accentFreq = 0;
      out.gap = 0;
      out.mass = 0.96;
      out.minSeparation = 0.56;
      out.geometry = "runs-h";
      out.finder = "solid";
      break;
    case 6:
      break;
    default:
      break;
  }
  return { dir: out, cameraSafe: Boolean(rung.cameraSafe) };
}

function mass09(dir: ArtDirection): number {
  return Math.max(dir.mass, 0.9);
}
