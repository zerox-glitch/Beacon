import { tryEncodePayload } from "../encode";
import { buildPayload } from "../payload";
import { loadImage, renderQr } from "../render";
import { decodeScaled, inspectRenderedQr, type ScanReport } from "../scan-engine";
import type { Payload, QrStyle } from "../types";

export interface OptimizeResult {
  ok: boolean;
  changed: boolean;
  patch: Partial<QrStyle>;
  /** Change fragments ("more contrast", …) when fixed; a full sentence when clean or failed. */
  notes: string[];
  report: ScanReport | null;
}

/** Same bitmap the preview paints, so Fix scan and the badge can never disagree. */
const PX = 512;

function diffStyle(base: QrStyle, next: QrStyle): Partial<QrStyle> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof QrStyle)[]) {
    if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) patch[key as string] = next[key];
  }
  return patch as Partial<QrStyle>;
}

/** Human-readable fragments for every knob the patch actually touched. */
function describe(base: QrStyle, patch: Partial<QrStyle>): string[] {
  const s = base as unknown as Record<string, unknown>;
  const p = patch as Record<string, unknown>;
  const bits: string[] = [];
  if (p.fg || p.eyeColor || p.ballColor) bits.push("darker ink");
  if (p.bg) bits.push("lighter paper");
  if (typeof p.contrast === "number" && p.contrast > (s.contrast as number)) bits.push("more contrast");
  if (typeof p.dotScale === "number") {
    bits.push(p.dotScale > (s.dotScale as number) ? "heavier dots" : "lighter dots");
  }
  if (p.moduleShape && p.moduleShape !== s.moduleShape) bits.push("square modules");
  if (typeof p.moduleGap === "number" && p.moduleGap < (s.moduleGap as number)) bits.push("removed gaps");
  if (typeof p.quietZone === "number" && p.quietZone > (s.quietZone as number)) bits.push("wider quiet zone");
  if (typeof p.artisticStrength === "number" && p.artisticStrength < (s.artisticStrength as number)) {
    bits.push("coarser weave");
  }
  if (typeof p.imageOpacity === "number" && p.imageOpacity < (s.imageOpacity as number)) {
    bits.push("crushed photo tones");
  }
  if (p.imageMode) {
    if (p.imageMode === "halftone") bits.push("newspaper ink");
    else if (p.imageMode === "logo") bits.push("photo into logo center");
    else if (p.imageMode === "none") bits.push("art off");
    else if (p.imageMode === "paint") bits.push("photo QR");
  }
  if (p.ecc && p.ecc !== s.ecc) bits.push(`ECC ${String(p.ecc)}`);
  if (p.maskPattern !== undefined && p.maskPattern !== s.maskPattern) bits.push("auto mask");
  if (p.eyeShape && p.eyeShape !== s.eyeShape) bits.push("square finders");
  if (p.effect && p.effect !== s.effect) bits.push("effects off");
  if (!bits.length) bits.push("re-tuned");
  return bits;
}

/**
 * Real Fix scan. Walks a ladder of concrete style changes — colors, dot
 * weight, gaps, quiet zone, weave density, ink mode, logo, plain QR —
 * rendering each candidate at the preview's exact bitmap and decoding it with
 * jsQR. A candidate wins only when it survives BOTH the 512px read and a 320px
 * downscale read (phone-camera margin). Success is reported only when the
 * decoder actually came back with the payload.
 */
export async function optimizeScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
): Promise<OptimizeResult> {
  const expected = buildPayload(payload).trim() || null;
  const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
  const canvas = document.createElement("canvas");
  const pictured = Boolean(art) && style.imageMode !== "none" && style.imageMode !== "logo";

  const paint = (s: QrStyle, boost: number): boolean => {
    const enc = tryEncodePayload(payload, s);
    if (!enc.ok) return false;
    renderQr(canvas, enc.qr, s, { pixelSize: PX, art, logo, exportScale: true, kernelBoost: boost });
    return true;
  };

  const check = async (s: QrStyle): Promise<{ report: ScanReport; strong: boolean } | null> => {
    let report: ScanReport | null = null;
    for (const boost of [0, 0.7]) {
      if (!paint(s, boost)) return null;
      report = await inspectRenderedQr(canvas, expected);
      if (report.ok) break;
    }
    if (!report || !report.ok) return report ? { report, strong: false } : null;
    const small = await decodeScaled(canvas, 320);
    const strong = expected ? small === expected : Boolean(small);
    return { report, strong };
  };

  const current = await check(style);
  if (current?.report.ok) {
    return {
      ok: true,
      changed: false,
      patch: {},
      notes: [current.strong ? "Reads clean — nothing to fix." : "Reads at preview size — nothing to fix."],
      report: current.report,
    };
  }

  const s0 = { ...style };
  let steps: QrStyle[];
  if (!pictured) {
    // Style-only ladder: dot weight → colors → structure.
    const a = {
      ...s0,
      dotScale: Math.min(1, Math.max(s0.dotScale, 0.92)),
      moduleShape: "square" as const,
      moduleGap: 0,
      quietZone: Math.max(s0.quietZone, 3),
    };
    const b = { ...a, fg: "#101014", eyeColor: "#101014", ballColor: "#101014", bg: "#f6f1e7" };
    const c = { ...b, ecc: "H" as const, maskPattern: -1, eyeShape: "square" as const };
    steps = [a, b, c];
  } else {
    // Photo ladder (PhotoQrV2): safer kernel candidates first — they keep the
    // photo recognizable while growing the guaranteed QR signal — then
    // tone/contrast, then mono ink, then logo, then plain.
    const a: QrStyle = { ...s0, photoKernel: "camera-safe" };
    const b: QrStyle = { ...a, photoKernel: "robust" };
    const c: QrStyle = {
      ...b,
      contrast: Math.max(s0.contrast, 0.92),
      dotScale: Math.max(s0.dotScale, 0.8),
      moduleShape: "square",
      quietZone: Math.max(s0.quietZone, 3),
    };
    const d: QrStyle = { ...c, contrast: 1, imageOpacity: Math.min(s0.imageOpacity, 0.4) };
    const e: QrStyle = { ...d, artisticStrength: Math.min(s0.artisticStrength, 0.22) };
    const f: QrStyle = { ...e, imageMode: "halftone", imageOpacity: 0.6, fg: "#121014", bg: "#f5f0e6" };
    const g: QrStyle = { ...s0, imageMode: "logo", logoScale: 0.18, quietZone: Math.max(s0.quietZone, 3) };
    const h: QrStyle = {
      ...s0,
      imageMode: "none",
      moduleShape: "square",
      moduleGap: 0,
      dotScale: 1,
      quietZone: Math.max(s0.quietZone, 3),
    };
    steps = [a, b, c, d, e, f, g, h];
  }

  let lastReport = current?.report ?? null;
  let weak: { next: QrStyle; report: ScanReport } | null = null;
  for (const next of steps) {
    const r = await check(next);
    if (!r) continue;
    lastReport = r.report;
    if (r.strong) {
      const patch = diffStyle(style, next);
      const changed = Object.keys(patch).length > 0;
      return {
        ok: true,
        changed,
        patch,
        notes: changed ? describe(style, patch) : ["Reads clean — nothing to fix."],
        report: r.report,
      };
    }
    weak ??= { next, report: r.report };
  }

  if (weak) {
    const patch = diffStyle(style, weak.next);
    const changed = Object.keys(patch).length > 0;
    return {
      ok: true,
      changed,
      patch,
      notes: changed
        ? [...describe(style, patch), "reads at preview size — print at full scale"]
        : ["Reads at preview size — nothing to fix."],
      report: weak.report,
    };
  }

  return {
    ok: false,
    changed: false,
    patch: {},
    notes: ["No look survived the decoder — shorten the destination or pick a simpler photo."],
    report: lastReport,
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
