import { tryEncodePayload } from "../encode";
import { buildPayload } from "../payload";
import { loadImage, renderQr } from "../render";
import { inspectRenderedQr, type ScanReport } from "../scan-engine";
import type { Payload, QrStyle } from "../types";

export interface OptimizeResult {
  ok: boolean;
  patch: Partial<QrStyle>;
  notes: string[];
  report: ScanReport | null;
}

function pictured(style: QrStyle, imageUrl: string | null): boolean {
  return Boolean(imageUrl) && style.imageMode !== "none" && style.imageMode !== "logo";
}

/**
 * Multi-pass Fix Scan. Least-destructive steps first.
 * ok is true only when jsQR recovered the payload.
 */
export async function optimizeScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
  pixelSize = 480,
): Promise<OptimizeResult> {
  const expected = buildPayload(payload).trim() || null;
  const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
  const canvas = document.createElement("canvas");

  const paint = (s: QrStyle, boost = 0): boolean => {
    const enc = tryEncodePayload(payload, s);
    if (!enc.ok) return false;
    renderQr(canvas, enc.qr, s, { pixelSize, art, logo, exportScale: true, kernelBoost: boost });
    return true;
  };

  if (!paint(style)) {
    return { ok: false, patch: {}, notes: ["Nothing to encode."], report: null };
  }
  const first = await inspectRenderedQr(canvas, expected);
  if (first.ok) {
    return { ok: true, patch: {}, notes: ["Already scannable."], report: first };
  }

  const hasPic = pictured(style, imageUrl);

  const steps: { patch: Partial<QrStyle>; note: string }[] = hasPic
    ? [
        {
          patch: {
            contrast: Math.min(1, style.contrast + 0.08),
            artisticStrength: Math.max(0.18, style.artisticStrength - 0.1),
          },
          note: "raised contrast, eased strength",
        },
        {
          patch: {
            contrast: Math.min(1, Math.max(style.contrast, 0.86)),
            artisticStrength: Math.max(0.14, style.artisticStrength - 0.18),
            effect: "none",
          },
          note: "dropped effects, more contrast",
        },
        {
          patch: {
            moduleShape: "square",
            artisticStrength: Math.max(0.12, style.artisticStrength - 0.24),
            contrast: Math.min(1, Math.max(style.contrast, 0.9)),
            gradientType: "none",
            effect: "none",
            dotScale: Math.min(0.92, Math.max(style.dotScale, 0.78)),
          },
          note: "square modules, quieter weave",
        },
        {
          patch: {
            quietZone: Math.max(style.quietZone, 3),
            artisticStrength: Math.max(0.1, style.artisticStrength - 0.3),
            contrast: 0.94,
            moduleShape: "square",
            effect: "none",
            gradientType: "none",
          },
          note: "wider quiet zone",
        },
        {
          patch: {
            imageMode: "paint",
            artisticStrength: 0.2,
            contrast: 0.96,
            quietZone: Math.max(style.quietZone, 4),
            moduleShape: "square",
            effect: "none",
            gradientType: "none",
            dotScale: 0.86,
          },
          note: "safer Photo QR",
        },
        {
          patch: {
            imageMode: "halftone",
            artisticStrength: 0.16,
            contrast: 0.98,
            quietZone: 4,
            moduleShape: "square",
            effect: "none",
            gradientType: "none",
          },
          note: "halftone last resort",
        },
      ]
    : [
        { patch: { contrast: Math.min(1, style.contrast + 0.12), dotScale: Math.min(0.92, style.dotScale + 0.12) }, note: "raised contrast and dot size" },
        { patch: { quietZone: Math.max(style.quietZone, 3), moduleGap: Math.min(style.moduleGap, 0.04) }, note: "wider quiet zone" },
        { patch: { moduleShape: "square", ecc: "H", contrast: 0.9 }, note: "square modules, ECC H" },
      ];

  let last: ScanReport = first;
  for (const step of steps) {
    const next = { ...style, ...step.patch };
    if (!paint(next)) continue;
    last = await inspectRenderedQr(canvas, expected);
    if (last.ok) {
      return { ok: true, patch: step.patch, notes: [`Optimized ✓ — ${step.note}`], report: last };
    }
  }

  return {
    ok: false,
    patch: {},
    notes: [
      "Unable to maintain scan reliability at this artistic strength. Try a simpler photo, a shorter payload, or a lower strength.",
    ],
    report: last,
  };
}

/** Retry the same style with extra kernel. Returns the boost that decoded, or 0. */
export async function autoSafetyBoost(
  canvas: HTMLCanvasElement,
  payload: Payload,
  style: QrStyle,
  opts: {
    pixelSize: number;
    art?: HTMLImageElement | null;
    logo?: HTMLImageElement | null;
    expected?: string | null;
  },
): Promise<{ boost: number; report: ScanReport }> {
  const enc = tryEncodePayload(payload, style);
  if (!enc.ok) {
    return {
      boost: 0,
      report: {
        decoded: null,
        ok: false,
        contrast: 0,
        quietZoneOk: false,
        finderOk: false,
        notes: ["Nothing to encode."],
      },
    };
  }

  let last: ScanReport | null = null;
  for (const boost of [0, 0.35, 0.7, 1]) {
    renderQr(canvas, enc.qr, style, {
      pixelSize: opts.pixelSize,
      art: opts.art,
      logo: opts.logo,
      exportScale: true,
      kernelBoost: boost,
    });
    last = await inspectRenderedQr(canvas, opts.expected);
    if (last.ok) return { boost, report: last };
  }
  return { boost: 0, report: last! };
}
