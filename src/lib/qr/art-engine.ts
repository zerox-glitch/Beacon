import { kernelFrac as sizedKernel, kernelTarget } from "./art/kernel";
import { renderPhotoQrV2 } from "./photo/photo-engine";
import type { EncodedQr } from "./encode";
import { cellRole, isDark, isProtectedRole } from "./structure";
import type { ImageMode, QrStyle } from "./types";
// The classic eye renderer — every eye/pupil silhouette the Design tab offers.
// render.ts ↔ art-engine.ts form an ESM cycle, but both sides only use each
// other at call time (function declarations are hoisted), so it is safe.
import { drawEye } from "./render.ts";

export type WeaveMode = "photo" | "blend" | "halftone" | "duotone" | "mono";

export function weaveMode(mode: ImageMode): WeaveMode | null {
  switch (mode) {
    case "paint":
    case "backdrop":
      return "photo";
    case "mosaic":
      return "blend";
    case "halftone":
      return "halftone";
    case "duotone":
      return "duotone";
    case "mono":
      return "mono";
    default:
      return null;
  }
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rgbStr(r: number, g: number, b: number): string {
  return `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;
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
 * Fit the photo inside the square atlas at the requested zoom (1 = whole
 * photo, no crop; >1 zooms into the centre; <1 shrinks it). When the photo
 * is smaller than the atlas, the edge pixels are extended outward into the
 * letterbox bands (smoothed 1-px strips), so a landscape/portrait photo
 * shows in full and the bands blend with the photo's own edge colors.
 */
function fitDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  n: number,
  iw: number,
  ih: number,
  zoom = 1,
) {
  const z = Math.max(0.25, Math.min(3, zoom));
  // The whole photo at the requested zoom, centred and clipped. Letterbox
  // bands are filled with stretched photo EDGE colour — never a second copy
  // of the picture (a cover-fit background reads as a double exposure).
  const scale = Math.min(n / iw, n / ih) * z;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (n - dw) / 2;
  const oy = (n - dh) / 2;
  if (ox > 0.5) {
    ctx.drawImage(img, 0, 0, 1, ih, 0, 0, ox, n);
    ctx.drawImage(img, iw - 1, 0, 1, ih, n - ox, 0, ox, n);
  }
  if (oy > 0.5) {
    ctx.drawImage(img, 0, 0, iw, 1, 0, 0, n, oy);
    ctx.drawImage(img, 0, ih - 1, iw, 1, 0, n - oy, n, oy);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, n, n);
  ctx.clip();
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.restore();
}

const atlasCache = new Map<string, { n: number; canvas: HTMLCanvasElement; data: Uint8ClampedArray }>();

export function atlasFor(img: HTMLImageElement, n: number, zoom = 1) {
  const key = `${img.src}|${n}|${zoom}|${img.naturalWidth}x${img.naturalHeight}`;
  const hit = atlasCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) throw new Error("canvas");
  fitDraw(cx, img, n, img.naturalWidth, img.naturalHeight, zoom);
  const made = { n, canvas: c, data: cx.getImageData(0, 0, n, n).data };
  atlasCache.set(key, made);
  if (atlasCache.size > 12) {
    const first = atlasCache.keys().next().value;
    if (first) atlasCache.delete(first);
  }
  return made;
}

function rgbAt(data: Uint8ClampedArray, size: number, x: number, y: number): [number, number, number] {
  const i = (y * size + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

function sample(atlas: { n: number; data: Uint8ClampedArray }, fx: number, fy: number): [number, number, number] {
  const x = clamp(Math.floor(fx * atlas.n), 0, atlas.n - 1);
  const y = clamp(Math.floor(fy * atlas.n), 0, atlas.n - 1);
  return rgbAt(atlas.data, atlas.n, x, y);
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Strength 0 = SAFE (coarser lattice, stronger bits). 1 = ARTISTIC (finer submodules, more photo). */
export function artisticStrength(style: QrStyle): number {
  return clamp(style.artisticStrength ?? 0.42, 0, 1);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Deterministic per-cell variation (same hash the classic renderer uses). */
function cellHash(gx: number, gy: number): number {
  let h = (gx * 374761393 + gy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Star silhouette (classic drawModuleShape geometry). */
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const inner = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Hexagon silhouette (classic drawModuleShape geometry). */
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Plus silhouette (classic drawModuleShape geometry). */
function plusPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const t = s * 0.34;
  const o = (s - t) / 2;
  ctx.moveTo(x + o, y);
  ctx.lineTo(x + o + t, y);
  ctx.lineTo(x + o + t, y + o);
  ctx.lineTo(x + s, y + o);
  ctx.lineTo(x + s, y + o + t);
  ctx.lineTo(x + o + t, y + o + t);
  ctx.lineTo(x + o + t, y + s);
  ctx.lineTo(x + o, y + s);
  ctx.lineTo(x + o, y + o + t);
  ctx.lineTo(x, y + o + t);
  ctx.lineTo(x, y + o);
  ctx.lineTo(x + o, y + o);
  ctx.closePath();
}

/**
 * Rounded bar as a path subpath (no beginPath — the caller owns the path, so
 * Cross can union two of these). The classic strokeBar geometry, clipped.
 */
function barPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  thick: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const r = Math.max(0, Math.min(thick / 2, len / 2));
  const x = -len / 2;
  const y = -thick / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + len, y, x + len, y + thick, r);
  ctx.arcTo(x + len, y + thick, x, y + thick, r);
  ctx.arcTo(x, y + thick, x, y, r);
  ctx.arcTo(x, y, x + len, y, r);
  ctx.closePath();
  ctx.restore();
}

export function clipModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  shape: QrStyle["moduleShape"],
  grid?: { gx: number; gy: number; size: number },
) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  // Every classic module silhouette, so the Design-tab dot-shape picks work
  // in photo weaves too — before, nine shapes fell through to plain squares.
  switch (shape) {
    case "dots":
    case "bubbles":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
      ctx.clip();
      return;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + s, cy);
      ctx.lineTo(cx, y + s);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.clip();
      return;
    case "rounded":
    case "squircle":
    case "leaf":
    case "classy":
    case "heart":
    case "fluid":
      roundedRect(ctx, x, y, s, s, s * (shape === "squircle" ? 0.42 : 0.28));
      ctx.clip();
      return;
    case "hbar":
      roundedRect(ctx, x, y + s * 0.22, s, s * 0.56, s * 0.2);
      ctx.clip();
      return;
    case "vbar":
      roundedRect(ctx, x + s * 0.22, y, s * 0.56, s, s * 0.2);
      ctx.clip();
      return;
    case "star":
      ctx.beginPath();
      starPath(ctx, cx, cy, s * 0.5);
      ctx.clip();
      return;
    case "plus":
      ctx.beginPath();
      plusPath(ctx, x, y, s);
      ctx.clip();
      return;
    case "hex":
      ctx.beginPath();
      hexPath(ctx, cx, cy, s * 0.52);
      ctx.clip();
      return;
    case "cross":
      ctx.beginPath();
      barPath(ctx, cx, cy, s * 0.95, s * 0.5, Math.PI / 4);
      barPath(ctx, cx, cy, s * 0.95, s * 0.5, -Math.PI / 4);
      ctx.clip();
      return;
    case "diag":
      ctx.beginPath();
      barPath(ctx, cx, cy, s * 1.02, s * 0.5, Math.PI / 4);
      ctx.clip();
      return;
    case "dash": {
      const horizontal = cellHash(Math.round(x), Math.round(y)) % 2 === 0;
      ctx.beginPath();
      barPath(ctx, cx, cy, s * 0.95, s * 0.52, horizontal ? 0 : Math.PI / 2);
      ctx.clip();
      return;
    }
    case "confetti": {
      const h = cellHash(Math.round(x), Math.round(y));
      const len = s * (0.66 + ((h >>> 9) % 28) / 100);
      ctx.beginPath();
      barPath(ctx, cx, cy, len, s * 0.5, ((h % 360) * Math.PI) / 180);
      ctx.clip();
      return;
    }
    case "radial": {
      // Classic "Burst": an arrow pointing away from the code centre.
      const h = cellHash(Math.round(x), Math.round(y));
      const ang = grid
        ? Math.atan2(grid.gy - (grid.size - 1) / 2, grid.gx - (grid.size - 1) / 2)
        : ((h % 360) * Math.PI) / 180;
      const wob = 0.8 + ((h >>> 5) % 20) / 100;
      ctx.beginPath();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.moveTo(s * 0.55 * wob, 0);
      ctx.lineTo(-s * 0.45 * wob, -s * 0.28);
      ctx.lineTo(-s * 0.3 * wob, 0);
      ctx.lineTo(-s * 0.45 * wob, s * 0.28);
      ctx.closePath();
      ctx.restore();
      ctx.clip();
      return;
    }
    default:
      ctx.beginPath();
      ctx.rect(x, y, s, s);
      ctx.clip();
  }
}

function inkFrom(
  photo: [number, number, number],
  dark: boolean,
  strength: number,
  contrast: number,
): string {
  const [r, g, b] = setLuminance(photo[0], photo[1], photo[2], kernelTarget(dark, strength, contrast));
  return rgbStr(r, g, b);
}

function paperColor(style: QrStyle): string {
  const bg = parseHex(style.bg);
  const L = bg ? luma(bg[0], bg[1], bg[2]) : 1;
  return L >= 0.42 ? style.bg : "#f3eee6";
}

function duotonePair(
  atlas: { n: number; data: Uint8ClampedArray },
): { dark: [number, number, number]; light: [number, number, number] } {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(atlas.n / 12));
  for (let y = 0; y < atlas.n; y += step) {
    for (let x = 0; x < atlas.n; x += step) {
      const [pr, pg, pb] = rgbAt(atlas.data, atlas.n, x, y);
      r += pr;
      g += pg;
      b += pb;
      n++;
    }
  }
  const mr = r / n;
  const mg = g / n;
  const mb = b / n;
  return {
    dark: setLuminance(mr, mg, mb, 0.12),
    light: setLuminance(mr * 0.35 + 180, mg * 0.35 + 180, mb * 0.35 + 180, 0.92),
  };
}

function imageGradient(
  ctx: CanvasRenderingContext2D,
  atlas: { n: number; data: Uint8ClampedArray },
  origin: number,
  body: number,
): CanvasGradient {
  const a = sample(atlas, 0.12, 0.12);
  const b = sample(atlas, 0.88, 0.88);
  const c = sample(atlas, 0.5, 0.5);
  const g = ctx.createLinearGradient(origin, origin, origin + body, origin + body);
  g.addColorStop(0, rgbStr(a[0], a[1], a[2]));
  g.addColorStop(0.5, rgbStr(c[0], c[1], c[2]));
  g.addColorStop(1, rgbStr(b[0], b[1], b[2]));
  return g;
}

function drawKernel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  effect: QrStyle["effect"],
  strength: number,
) {
  const fx = effect ?? "none";
  if (fx !== "none" && strength > 0.28) {
    if (fx === "extrude") {
      const d = Math.max(1, r * 0.28);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.arc(cx + d, cy + d, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx === "shadow") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = r * 0.4;
      ctx.shadowOffsetY = r * 0.15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (fx === "shadow") return;
    } else if (fx === "glow" && strength > 0.38) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 0.8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    } else if (fx === "emboss") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.12, cy - r * 0.12, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.arc(cx + r * 0.12, cy + r * 0.12, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  if (fx === "outline") {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(0.6, r * 0.08);
    ctx.stroke();
  }
}

function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fill();
}

export function drawPhotoFinders(
  ctx: CanvasRenderingContext2D,
  qr: EncodedQr,
  style: QrStyle,
  atlas: { n: number; data: Uint8ClampedArray },
  origin: number,
  cell: number,
) {
  const hi = sample(atlas, 0.5, 0.1);
  const lo = sample(atlas, 0.5, 0.55);
  const eye = parseHex(style.eyeColor) ?? lo;
  const ball = parseHex(style.ballColor) ?? lo;
  const paper = parseHex(style.bg) ?? hi;
  let light = setLuminance(
    paper[0] * 0.45 + hi[0] * 0.55,
    paper[1] * 0.45 + hi[1] * 0.55,
    paper[2] * 0.45 + hi[2] * 0.55,
    0.9,
  );
  let dark = setLuminance(eye[0] * 0.7 + lo[0] * 0.3, eye[1] * 0.7 + lo[1] * 0.3, eye[2] * 0.7 + lo[2] * 0.3, 0.08);
  let pupil = setLuminance(
    ball[0] * 0.7 + lo[0] * 0.3,
    ball[1] * 0.7 + lo[1] * 0.3,
    ball[2] * 0.7 + lo[2] * 0.3,
    0.07,
  );
  if (luma(light[0], light[1], light[2]) - luma(dark[0], dark[1], dark[2]) < 0.5) {
    light = setLuminance(hi[0], hi[1], hi[2], 0.94);
    dark = setLuminance(eye[0], eye[1], eye[2], 0.05);
    pupil = setLuminance(ball[0], ball[1], ball[2], 0.05);
  }
  const lightCss = rgbStr(light[0], light[1], light[2]);
  const darkCss = rgbStr(dark[0], dark[1], dark[2]);
  const ballCss = rgbStr(pupil[0], pupil[1], pupil[2]);
  const corners: [number, number][] = [
    [0, 0],
    [qr.size - 7, 0],
    [0, qr.size - 7],
  ];
  for (const [ex, ey] of corners) {
    const ox = origin + ex * cell;
    const oy = origin + ey * cell;
    const sepX = ex === 0 ? ox : ox - cell;
    const sepY = ey === 0 ? oy : oy - cell;
    // Photo-protected separator plate (the photo must not bleed into the
    // one-module light gap), then the classic eye on top. Using the same
    // drawEye the plain QR uses means every eye/pupil silhouette the Design
    // tab offers renders identically in photo weaves — before, only four
    // corner radii were honoured and the rest fell back to a default round.
    fillRound(ctx, sepX, sepY, cell * 8, cell * 8, cell * 0.8, lightCss);
    drawEye(ctx, ox, oy, cell, style.eyeShape, style.ballShape, darkCss, ballCss, lightCss);
  }
}

/**
 * Photo QR — dedicated ArtisticPhotoQRRenderer (photo-engine.ts).
 * The old sub-cell halftone lattice (halftone-qr.ts) was replaced: its
 * photographic features were 1/5 of a module — smaller than any phone
 * camera preserves. The new renderer embeds the photo at module/group
 * scale while the QR bit lives in guaranteed centre kernels.
 */
export function renderHalftonePhotoQr(
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
) {
  renderPhotoQrV2(ctx, qr, style, art, origin, body, cell, px, kernelBoost, mode);
}

/**
 * Color-blend mosaic: one contrast-normalized sample per module.
 * Finder, timing, alignment, format and version cells stay protected.
 */
function renderMosaicBlend(
  ctx: CanvasRenderingContext2D,
  qr: EncodedQr,
  style: QrStyle,
  art: HTMLImageElement,
  origin: number,
  body: number,
  cell: number,
  px: number,
  fill: string | CanvasGradient,
  kernelBoost: number,
) {
  const strength = artisticStrength(style);
  const contrast = clamp(style.contrast, 0.35, 1);
  const paper = paperColor(style);
  const gap = Math.max(0, Math.min(0.2, style.moduleGap));
  const atlas = atlasFor(art, Math.max(qr.size * 8, 64), style.photoZoom ?? 1);
  const version = Math.max(1, Math.round((qr.size - 17) / 4));
  const kFrac = sizedKernel({
    strength,
    contrast,
    version,
    cellPx: cell,
    quietZone: style.quietZone,
    boost: kernelBoost,
  });
  const useImageGrad = style.gradientType === "image";
  const photoGrad = useImageGrad ? imageGradient(ctx, atlas, origin, body) : null;

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, px, px);

  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      const role = cellRole(qr, x, y);
      if (role === "finder" || role === "separator") continue;

      const dark = isDark(qr, x, y);
      const px0 = origin + x * cell;
      const py0 = origin + y * cell;
      const photo = sample(atlas, (x + 0.5) / qr.size, (y + 0.5) / qr.size);

      if (isProtectedRole(role)) {
        ctx.fillStyle = dark ? (photoGrad ?? (typeof fill === "string" ? fill : style.fg)) : paper;
        if (dark && typeof fill !== "string" && !photoGrad) ctx.fillStyle = fill;
        ctx.fillRect(px0, py0, cell, cell);
        continue;
      }

      const scale = clamp(style.dotScale, 0.5, 1);
      const inset = cell * (gap * 0.5 + (1 - scale) * 0.1);
      const ox = px0 + inset;
      const oy = py0 + inset;
      const s = cell - inset * 2;
      const target = dark
        ? clamp(0.05 + (1 - contrast) * 0.06 + strength * 0.1, 0.04, 0.28)
        : clamp(0.94 - (1 - contrast) * 0.05 - strength * 0.06, 0.72, 0.98);
      const [nr, ng, nb] = setLuminance(photo[0], photo[1], photo[2], target);
      ctx.save();
      clipModule(ctx, ox, oy, s, style.moduleShape, { gx: x, gy: y, size: qr.size });
      ctx.fillStyle = rgbStr(nr, ng, nb);
      ctx.fillRect(ox, oy, s, s);
      ctx.restore();
      if (strength < 0.72) {
        drawKernel(
          ctx,
          ox + s / 2,
          oy + s / 2,
          (s / 2) * (kFrac * 0.85),
          inkFrom(photo, dark, strength, contrast),
          "none",
          0,
        );
      }
    }
  }

  drawPhotoFinders(ctx, qr, style, atlas, origin, cell);
}

/**
 * Deterministic image-weaving renderer.
 * Photo / Halftone / Duotone / Mono use the Chu lattice.
 * Color blend keeps per-module mosaic. Function patterns stay protected.
 */
export function renderArtisticQr(
  ctx: CanvasRenderingContext2D,
  qr: EncodedQr,
  style: QrStyle,
  art: HTMLImageElement,
  origin: number,
  body: number,
  cell: number,
  px: number,
  fill: string | CanvasGradient,
  kernelBoost = 0,
) {
  const mode = weaveMode(style.imageMode);
  if (!mode) return;

  if (mode === "blend") {
    renderMosaicBlend(ctx, qr, style, art, origin, body, cell, px, fill, kernelBoost);
    return;
  }

  renderHalftonePhotoQr(ctx, qr, style, art, origin, body, cell, px, kernelBoost, mode);
}

export { paperColor };
