import { tryEncodePayload } from "./encode";
import { loadImage, renderQr } from "./render";
import { verifyQr } from "./verify";
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
  if (style.dotScale < 0.78) raise.push("dot size");
  if (style.contrast < 0.82) raise.push("contrast");
  if (style.minVersion < 7) raise.push("grid detail");
  if (style.quietZone < 3) raise.push("quiet zone");
  if (style.imageOpacity > 0.78) lower.push("photo opacity");
  if (style.moduleGap > 0.1) lower.push("module gap");
  return { raise, lower };
}

function adviceLine(advice: ScanAdvice): string {
  const bits: string[] = [];
  if (advice.raise.length) bits.push(`increase ${advice.raise.join(", ")}`);
  if (advice.lower.length) bits.push(`decrease ${advice.lower.join(", ")}`);
  return bits.join("; ");
}

/**
 * Probe one knob at a time (up or down) and apply the smallest change that
 * makes the code scan. Palette, treatment, and module shape stay put.
 */
export async function autoFixScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
): Promise<AutoFixOutcome> {
  const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;

  const scans = async (s: QrStyle): Promise<boolean> => {
    const enc = tryEncodePayload(payload, s);
    if (!enc.ok) return false;
    const canvas = document.createElement("canvas");
    renderQr(canvas, enc.qr, s, { pixelSize: 720, art, logo, exportScale: true });
    return Boolean(await verifyQr(canvas).catch(() => null));
  };

  if (await scans(style)) return { ok: true, patch: {}, notes: ["already scannable"] };

  const pictured = Boolean(imageUrl) && style.imageMode !== "none" && style.imageMode !== "logo";

  const trials: { patch: Partial<QrStyle>; note: string }[] = [];

  if (style.dotScale < 0.9) {
    trials.push({
      patch: { dotScale: Math.min(0.92, Math.max(style.dotScale + 0.18, 0.72)) },
      note: "increased dot size",
    });
  }
  if (style.contrast < 0.95) {
    trials.push({
      patch: { contrast: Math.min(1, Math.max(style.contrast + 0.16, 0.82)) },
      note: "increased contrast",
    });
  }
  if (pictured && style.imageOpacity > 0.5) {
    trials.push({
      patch: { imageOpacity: Math.max(0.42, style.imageOpacity - 0.22) },
      note: "decreased photo opacity",
    });
  }
  if (style.minVersion < 10) {
    trials.push({
      patch: { minVersion: Math.min(12, style.minVersion + 2), ecc: "H" },
      note: "increased grid detail",
    });
  }
  if (style.quietZone < 3) {
    trials.push({
      patch: { quietZone: 3 },
      note: "increased quiet zone",
    });
  }
  if (style.moduleGap > 0.08) {
    trials.push({
      patch: { moduleGap: 0.04 },
      note: "decreased module gap",
    });
  }

  for (const t of trials) {
    if (await scans({ ...style, ...t.patch })) {
      return { ok: true, patch: t.patch, notes: [t.note] };
    }
  }

  const combos: { patch: Partial<QrStyle>; note: string }[] = [
    {
      patch: {
        contrast: Math.min(1, Math.max(style.contrast, 0.84)),
        dotScale: Math.min(0.9, Math.max(style.dotScale, 0.78)),
        ecc: "H",
      },
      note: "increased contrast and dot size",
    },
    {
      patch: {
        contrast: Math.min(1, 0.9),
        imageOpacity: pictured ? Math.min(style.imageOpacity, 0.62) : style.imageOpacity,
        dotScale: Math.min(0.9, Math.max(style.dotScale, 0.8)),
        quietZone: Math.max(style.quietZone, 3),
        ecc: "H",
      },
      note: "increased contrast, decreased opacity, larger dots",
    },
    {
      patch: {
        contrast: 0.96,
        imageOpacity: pictured ? Math.min(style.imageOpacity, 0.5) : style.imageOpacity,
        dotScale: 0.88,
        moduleGap: Math.min(style.moduleGap, 0.05),
        quietZone: Math.max(style.quietZone, 3),
        minVersion: Math.max(style.minVersion, 7),
        transparentBg: false,
        ecc: "H",
      },
      note: "maximized bit separation — larger dots, more contrast, less opacity",
    },
  ];

  for (const t of combos) {
    if (await scans({ ...style, ...t.patch })) {
      return { ok: true, patch: t.patch, notes: [t.note] };
    }
  }

  const last = combos[combos.length - 1]!;
  const hint = adviceLine(scanAdvice(style, pictured));
  return {
    ok: true,
    patch: last.patch,
    notes: [last.note, hint ? `if it still fails, ${hint}` : "kept this picture treatment"],
  };
}
