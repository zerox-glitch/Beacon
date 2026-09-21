import { optimizeScan } from "./art/optimizer";
import type { Payload, QrStyle } from "./types";

export interface AutoFixOutcome {
  ok: boolean;
  patch: Partial<QrStyle>;
  notes: string[];
  error?: string;
}

export interface ScanAdvice {
  raise: string[];
  lower: string[];
}

/** Heuristic knobs to turn when the in-browser checker fails. */
export function scanAdvice(style: QrStyle, hasImage: boolean): ScanAdvice {
  const raise: string[] = [];
  const lower: string[] = [];
  if (!hasImage) {
    if (style.quietZone < 3) raise.push("quiet zone");
    if (style.dotScale < 0.7) raise.push("dot size");
    return { raise, lower };
  }
  if ((style.artisticStrength ?? 0.42) > 0.35) lower.push("artistic strength");
  if (style.dotScale < 0.78) raise.push("dot size");
  if (style.contrast < 0.82) raise.push("contrast");
  if (style.minVersion < 7) raise.push("grid detail");
  if (style.quietZone < 3) raise.push("quiet zone");
  if (style.moduleGap > 0.1) lower.push("module gap");
  if (style.effect && style.effect !== "none") lower.push("effects");
  return { raise, lower };
}

export async function autoFixScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
): Promise<AutoFixOutcome> {
  const result = await optimizeScan(payload, style, imageUrl, logoUrl, 480);
  return {
    ok: result.ok,
    patch: result.patch,
    notes: result.notes,
    error: result.ok ? undefined : result.notes[0],
  };
}
