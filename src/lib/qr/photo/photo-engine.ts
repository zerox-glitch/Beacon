/**
 * ArtisticPhotoQRRenderer — browser glue for the Photo QR rebuild.
 *
 * QR matrix → PhotoQrV2 rasterizer → canvas. The photograph is embedded at
 * module/group scale (tone-driven kernels + tone-true surrounds), the QR
 * signal lives in guaranteed centre kernels, function patterns stay solid.
 *
 * Candidate selection: first paint uses the analytic default ("balanced");
 * a chunked background pass renders all five candidates, scores them with
 * the camera battery + fidelity metric, and — only if the default fails the
 * camera gate — promotes the best eligible candidate and repaints once.
 * "Fix scan" can escalate explicitly through QrStyle.photoKernel.
 */

import { atlasFor, drawPhotoFinders } from "../art-engine";
import type { EncodedQr } from "../encode";
import type { QrStyle } from "../types";
import { candidateById, type CandidateId } from "./candidates";
import { buildToneField, type ToneField } from "./field";
import { rasterizePhotoQr } from "./raster";
import { roleMaps, scoreOne, candidateParams, type StyleToParamsInput } from "./score";
import type { WeaveMode } from "../art-engine";

export type { CandidateId };

export function colorModeFor(mode: WeaveMode): "photo" | "mono" | "duotone" {
  if (mode === "duotone") return "duotone";
  if (mode === "mono" || mode === "halftone") return "mono";
  return "photo";
}

/** Candidate actually used for a render: explicit style knob beats cache.
 *  The background refinement only promotes its winner when the analytic
 *  default FAILED the camera gate — we never downgrade a passing default. */
export function resolveCandidateId(key: string, styleKernel: CandidateId | undefined): CandidateId {
  if (styleKernel) return styleKernel;
  const entry = selectionCache.get(key);
  if (entry && !entry.defaultEligible) return entry.chosen;
  return "balanced";
}

export interface SelectionCacheEntry {
  chosen: CandidateId;
  defaultEligible: boolean;
  bestLabel: string;
  robustness: number;
  fidelity: number;
}

const selectionCache = new Map<string, SelectionCacheEntry>();
const toneFieldCache = new Map<string, ToneField>();

export function selectionKey(art: HTMLImageElement, qr: EncodedQr, colorMode: string, style: { artisticStrength?: number; contrast: number; ecc: string }): string {
  return `${art.src}|${qr.size}|${colorMode}|${(style.artisticStrength ?? 0.42).toFixed(2)}|${style.contrast.toFixed(2)}|${style.ecc}`;
}

function toneFieldFor(art: HTMLImageElement, qrSize: number, detail: number): ToneField {
  const atlas = atlasFor(art, qrSize * 8);
  const key = `${art.src}|${qrSize}|${detail.toFixed(2)}`;
  const hit = toneFieldCache.get(key);
  if (hit) return hit;
  const field = buildToneField({ data: atlas.data, w: atlas.n, h: atlas.n }, qrSize, {
    detail,
    normalize: 0.8,
  });
  toneFieldCache.set(key, field);
  if (toneFieldCache.size > 24) {
    const first = toneFieldCache.keys().next().value;
    if (first) toneFieldCache.delete(first);
  }
  return field;
}

function styleInput(
  mode: WeaveMode,
  style: QrStyle,
  qr: EncodedQr,
  boost: number,
  fgRgb: [number, number, number],
  bgRgb: [number, number, number],
): StyleToParamsInput {
  const total = qr.size + 2 * Math.max(2, Math.min(8, style.quietZone));
  // Realistic phone-screen viewing: a shared QR lands around 340 CSS px.
  const viewPxPerModule = 340 / total;
  return {
    mode: colorModeFor(mode),
    strength: style.artisticStrength ?? 0.42,
    contrast: style.contrast,
    dotScale: style.dotScale,
    chroma: style.imageOpacity,
    boost,
    viewPxPerModule,
    modules: qr.size,
    fg: fgRgb,
    bg: bgRgb,
  };
}

function hexRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [18, 18, 18];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Render the photo QR body into `ctx`. Same call shape as the legacy Chu
 * renderer it replaces — render.ts / renderArtisticQr keep their signatures.
 */
export function renderPhotoQrV2(
  ctx: CanvasRenderingContext2D,
  qr: EncodedQr,
  style: QrStyle,
  art: HTMLImageElement,
  origin: number,
  body: number,
  cell: number,
  px: number,
  kernelBoost: number,
  mode: WeaveMode,
): void {
  const colorMode = colorModeFor(mode);
  const strength = style.artisticStrength ?? 0.42;
  const key = selectionKey(art, qr, colorMode, style);
  const candId = resolveCandidateId(key, style.photoKernel);
  const cand = candidateById(candId);
  const field = toneFieldFor(art, qr.size, cand.detail * Math.min(1.15, Math.max(0, strength * 1.6)));

  const total = qr.size + 2 * Math.max(2, Math.min(8, style.quietZone));
  const ss = Math.max(4, Math.min(20, Math.round((px / total) * 1.15)));
  const maps = roleMaps(qr);
  const input = styleInput(mode, style, qr, kernelBoost, hexRgb(style.fg), hexRgb(style.bg));
  const { render } = candidateParams(cand, input);

  const { bitmap } = rasterizePhotoQr(field, {
    size: qr.size,
    ss,
    ...render,
    colorMode,
    fg: input.fg,
    bg: input.bg,
    duoDark: [30, 26, 20],
    duoLight: [236, 224, 200],
    bits: maps.bits,
    isProtected: maps.isProtected,
  });

  // Paper / mat, then the body, then the protected finder islands (drawn
  // from the PHOTO atlas so eye colors keep matching the picture).
  const bgParsed = hexRgb(style.bg);
  const bgLum = (0.2126 * bgParsed[0] + 0.7152 * bgParsed[1] + 0.0722 * bgParsed[2]) / 255;
  const matRgb: [number, number, number] = bgLum >= 0.42 ? bgParsed : [243, 238, 230];
  ctx.fillStyle = `rgb(${matRgb[0]},${matRgb[1]},${matRgb[2]})`;
  ctx.fillRect(0, 0, px, px);

  const buf = document.createElement("canvas");
  buf.width = bitmap.w;
  buf.height = bitmap.h;
  const bx = buf.getContext("2d");
  if (!bx) return;
  const imgData = bx.createImageData(bitmap.w, bitmap.h);
  imgData.data.set(bitmap.data);
  bx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(origin, origin, body, body);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(buf, origin, origin, body, body);
  ctx.restore();

  const photoAtlas = atlasFor(art, qr.size * 8);
  const eyes = () => drawPhotoFinders(ctx, qr, style, { n: photoAtlas.n, data: photoAtlas.data }, origin, cell);
  if (style.effect === "shadow" || style.effect === "glow") {
    ctx.save();
    ctx.shadowColor = style.effect === "glow" ? "rgba(255,220,140,0.55)" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = cell * (style.effect === "glow" ? 1.6 : 0.9);
    ctx.shadowOffsetY = style.effect === "shadow" ? cell * 0.2 : 0;
    eyes();
    ctx.restore();
  } else {
    eyes();
  }
}

// ---------------------------------------------------------------------------
// Background candidate refinement
// ---------------------------------------------------------------------------

export interface RefineArgs {
  art: HTMLImageElement;
  qr: EncodedQr;
  style: QrStyle;
  mode: WeaveMode;
  expected: string | null;
  /** Called on the main thread after each candidate is scored. */
  onProgress?: (done: number, total: number) => void;
  /** Called once when the pass completes (winner may equal the default). */
  onDone?: (entry: SelectionCacheEntry) => void;
}

/**
 * Score all five candidates against the camera battery, chunked so the UI
 * never blocks. Results are cached per (photo, matrix, style) key.
 */
export async function refinePhotoQr(args: RefineArgs): Promise<SelectionCacheEntry | null> {
  const colorMode = colorModeFor(args.mode);
  const key = selectionKey(args.art, args.qr, colorMode, args.style);
  if (selectionCache.has(key)) return selectionCache.get(key)!;

  const jsQR = (await import("jsqr")).default;
  const atlas = atlasFor(args.art, args.qr.size * 8);
  const atlasBm = { data: atlas.data, w: atlas.n, h: atlas.n };
  const maps = roleMaps(args.qr);
  const input = styleInput(args.mode, args.style, args.qr, 0, hexRgb(args.style.fg), hexRgb(args.style.bg));
  const expected = args.expected;

  const { PHOTO_CANDIDATES } = await import("./candidates");
  const decode = (bm: { data: Uint8ClampedArray; w: number; h: number }) =>
    jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;

  let best: { id: CandidateId; fidelity: number; robustness: number; eligible: boolean } | null = null;
  let defaultEligible = false;
  const total = PHOTO_CANDIDATES.length;

  for (let i = 0; i < total; i++) {
    const cand = PHOTO_CANDIDATES[i]!;
    // Yield to the event loop between candidates.
    await new Promise((r) => setTimeout(r, 0));
    const score = scoreOne(cand, {
      qr: args.qr,
      atlas: atlasBm,
      style: input,
      ss: 8,
      decode,
      expected,
    }, undefined, maps.bits, maps.isProtected);
    if (cand.id === "balanced") defaultEligible = score.eligible;
    if (score.eligible && (!best || score.fidelity.score > best.fidelity)) {
      best = { id: cand.id, fidelity: score.fidelity.score, robustness: score.battery.robustness, eligible: true };
    }
    args.onProgress?.(i + 1, total);
  }

  const entry: SelectionCacheEntry = best
    ? {
        chosen: best.id,
        defaultEligible,
        bestLabel: candidateById(best.id).label,
        robustness: best.robustness,
        fidelity: best.fidelity,
      }
    : {
        chosen: "balanced",
        defaultEligible,
        bestLabel: candidateById("balanced").label,
        robustness: 0,
        fidelity: 0,
      };
  if (best || !defaultEligible) selectionCache.set(key, entry);
  args.onDone?.(entry);
  return entry;
}

/** Invalidate caches when a photo changes. */
export function forgetPhoto(artSrc: string): void {
  for (const key of [...selectionCache.keys()]) {
    if (key.startsWith(artSrc)) selectionCache.delete(key);
  }
  for (const key of [...toneFieldCache.keys()]) {
    if (key.startsWith(artSrc)) toneFieldCache.delete(key);
  }
}
