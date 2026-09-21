import { kernelFrac as sizedKernel, kernelTarget, lumaBias, surroundTarget } from "./art/kernel";
import { remapPhotoLuma } from "./art/photo-luma";
import type { EncodedQr } from "./encode";
import { cellRole, isDark, isProtectedRole } from "./structure";
import type { ImageMode, QrStyle } from "./types";

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

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  iw: number,
  ih: number,
) {
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const atlasCache = new Map<string, { n: number; canvas: HTMLCanvasElement; data: Uint8ClampedArray }>();

function atlasFor(img: HTMLImageElement, n: number) {
  const key = `${img.src}|${n}|${img.naturalWidth}x${img.naturalHeight}`;
  const hit = atlasCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) throw new Error("canvas");
  coverDraw(cx, img, 0, 0, n, n, img.naturalWidth, img.naturalHeight);
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

/** Strength 0 = SAFE (big kernel, strong bits). 1 = ARTISTIC (smaller kernel, more photo). */
export function artisticStrength(style: QrStyle): number {
  return clamp(style.artisticStrength ?? 0.42, 0, 1);
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function bayer(x: number, y: number): number {
  return ((BAYER4[y & 3]![x & 3]! + 0.5) / 16);
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

function clipModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  shape: QrStyle["moduleShape"],
) {
  const cx = x + s / 2;
  const cy = y + s / 2;
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

function finderCorner(shape: QrStyle["eyeShape"], s: number): number {
  switch (shape) {
    case "circle":
      return s * 0.5;
    case "extra-rounded":
      return s * 0.32;
    case "rounded":
    case "classy":
    case "leaf":
      return s * 0.18;
    case "square":
      return 0;
    default:
      return s * 0.16;
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

function drawPhotoFinders(
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
    const s7 = cell * 7;
    const r7 = finderCorner(style.eyeShape, s7);
    const rBall = finderCorner(style.ballShape, cell * 3);
    fillRound(ctx, sepX, sepY, cell * 8, cell * 8, r7 * 1.05, lightCss);
    fillRound(ctx, ox, oy, s7, s7, r7, darkCss);
    fillRound(ctx, ox + cell, oy + cell, cell * 5, cell * 5, r7 * 0.72, lightCss);
    fillRound(ctx, ox + cell * 2, oy + cell * 2, cell * 3, cell * 3, rBall, ballCss);
  }
}

/**
 * Remap atlas pixels in place: keep photo hue/texture, push each module's
 * luminance toward its QR bit. Center of the module is pushed harder (Chu
 * centroid) with a soft falloff — not a drawn kernel disc.
 */
function weavePhotoAtlas(
  atlas: { n: number; data: Uint8ClampedArray },
  qr: EncodedQr,
  style: QrStyle,
  bias: number,
  strength: number,
  contrast: number,
  fade: number,
): HTMLCanvasElement {
  const n = atlas.n;
  const pixels = new Uint8ClampedArray(atlas.data);
  remapPhotoLuma(pixels, n, qr, {
    bias,
    strength,
    contrast,
    fade,
    dotScale: style.dotScale,
    moduleGap: style.moduleGap,
    moduleShape: style.moduleShape,
  });
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const cx = c.getContext("2d");
  if (!cx) throw new Error("canvas");
  cx.putImageData(new ImageData(pixels, n, n), 0, 0);
  return c;
}

/**
 * Full-bleed photo: the picture fills the body. Each module only nudges
 * brightness toward its bit. No kernel discs, no overlay QR.
 */
function renderFullBleedPhoto(
  ctx: CanvasRenderingContext2D,
  qr: EncodedQr,
  style: QrStyle,
  art: HTMLImageElement,
  origin: number,
  body: number,
  cell: number,
  px: number,
  kernelBoost: number,
) {
  const strength = artisticStrength(style);
  const contrast = clamp(style.contrast, 0.35, 1);
  const atlasN = Math.max(qr.size * 8, 64);
  const atlas = atlasFor(art, atlasN);
  const version = Math.max(1, Math.round((qr.size - 17) / 4));
  const bias = lumaBias({
    strength,
    contrast,
    version,
    cellPx: cell,
    quietZone: style.quietZone,
    boost: kernelBoost,
  });
  const fade = clamp(style.imageOpacity, 0.08, 1);
  const hi = sample(atlas, 0.5, 0.1);
  const paper = parseHex(style.bg);
  const matSrc = paper ?? hi;
  const mat = setLuminance(matSrc[0], matSrc[1], matSrc[2], 0.92);
  ctx.fillStyle = rgbStr(mat[0], mat[1], mat[2]);
  ctx.fillRect(0, 0, px, px);

  const woven = weavePhotoAtlas(atlas, qr, style, bias, strength, contrast, fade);
  ctx.save();
  ctx.beginPath();
  ctx.rect(origin, origin, body, body);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(woven, origin, origin, body, body);
  ctx.restore();

  if (style.effect === "shadow" || style.effect === "glow") {
    ctx.save();
    ctx.shadowColor = style.effect === "glow" ? "rgba(255,220,140,0.55)" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = cell * (style.effect === "glow" ? 1.6 : 0.9);
    ctx.shadowOffsetY = style.effect === "shadow" ? cell * 0.2 : 0;
    drawPhotoFinders(ctx, qr, style, atlas, origin, cell);
    ctx.restore();
  } else {
    drawPhotoFinders(ctx, qr, style, atlas, origin, cell);
  }
}

/**
 * Deterministic image-weaving renderer (Chu / Visualead hybrid).
 * Photo QR is full-bleed luminance. Other modes keep module weaves.
 * Finder, timing, alignment, format and version cells stay protected.
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

  if (mode === "photo") {
    renderFullBleedPhoto(ctx, qr, style, art, origin, body, cell, px, kernelBoost);
    return;
  }

  const strength = artisticStrength(style);
  const contrast = clamp(style.contrast, 0.35, 1);
  const paper = paperColor(style);
  const gap = Math.max(0, Math.min(0.2, style.moduleGap));
  const atlasN = Math.max(qr.size * 8, 64);
  const atlas = atlasFor(art, atlasN);
  const version = Math.max(1, Math.round((qr.size - 17) / 4));
  const kFrac = sizedKernel({
    strength,
    contrast,
    version,
    cellPx: cell,
    quietZone: style.quietZone,
    boost: kernelBoost,
  });
  const duo = mode === "duotone" || mode === "mono" ? duotonePair(atlas) : null;
  const inkHex = parseHex(style.fg) ?? [20, 20, 22];
  const useImageGrad = style.gradientType === "image";
  const photoGrad = useImageGrad ? imageGradient(ctx, atlas, origin, body) : null;
  const N = mode === "halftone" ? (strength > 0.55 ? 5 : 3) : 1;

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
      const L = luma(photo[0], photo[1], photo[2]);

      if (isProtectedRole(role)) {
        ctx.fillStyle = dark
          ? photoGrad ?? (typeof fill === "string" ? fill : style.fg)
          : paper;
        if (dark && typeof fill !== "string" && !photoGrad) ctx.fillStyle = fill;
        ctx.fillRect(px0, py0, cell, cell);
        continue;
      }

      const scale = clamp(style.dotScale, 0.5, 1);
      const inset = cell * (gap * 0.5 + (1 - scale) * 0.1);
      const ox = px0 + inset;
      const oy = py0 + inset;
      const s = cell - inset * 2;
      const cx = ox + s / 2;
      const cy = oy + s / 2;

      if (mode === "mono") {
        const density = dark ? 0.55 + (1 - L) * 0.4 : 0.08 * (1 - L) * strength;
        const r = (s / 2) * clamp(density, dark ? 0.34 : 0, 0.48);
        if (r < 0.4) continue;
        const [ir, ig, ib] = setLuminance(inkHex[0], inkHex[1], inkHex[2], kernelTarget(true, 0.2, contrast));
        drawKernel(ctx, cx, cy, r, rgbStr(ir, ig, ib), style.effect, strength);
        continue;
      }

      if (mode === "duotone" && duo) {
        const [dr, dg, db] = dark ? duo.dark : duo.light;
        const [pr, pg, pb] = setLuminance(
          photo[0] * 0.45 + dr * 0.55,
          photo[1] * 0.45 + dg * 0.55,
          photo[2] * 0.45 + db * 0.55,
          dark ? kernelTarget(true, strength * 0.4, contrast) : kernelTarget(false, strength * 0.4, contrast),
        );
        ctx.save();
        clipModule(ctx, ox, oy, s, style.moduleShape);
        ctx.fillStyle = rgbStr(pr, pg, pb);
        ctx.fillRect(ox, oy, s, s);
        ctx.restore();
        drawKernel(ctx, cx, cy, (s / 2) * kFrac, inkFrom(photo, dark, strength, contrast), style.effect, strength);
        continue;
      }

      if (mode === "blend") {
        const target = dark
          ? clamp(0.05 + (1 - contrast) * 0.06 + strength * 0.1, 0.04, 0.28)
          : clamp(0.94 - (1 - contrast) * 0.05 - strength * 0.06, 0.72, 0.98);
        const [nr, ng, nb] = setLuminance(photo[0], photo[1], photo[2], target);
        ctx.save();
        clipModule(ctx, ox, oy, s, style.moduleShape);
        ctx.fillStyle = rgbStr(nr, ng, nb);
        ctx.fillRect(ox, oy, s, s);
        ctx.restore();
        if (strength < 0.72) {
          drawKernel(ctx, cx, cy, (s / 2) * (kFrac * 0.85), inkFrom(photo, dark, strength, contrast), "none", 0);
        }
        continue;
      }

      if (mode === "halftone") {
        const sub = s / N;
        for (let sy = 0; sy < N; sy++) {
          for (let sx = 0; sx < N; sx++) {
            const isCenter = sx === Math.floor(N / 2) && sy === Math.floor(N / 2);
            const fx = (x + (sx + 0.5) / N) / qr.size;
            const fy = (y + (sy + 0.5) / N) / qr.size;
            const p = sample(atlas, fx, fy);
            const pL = luma(p[0], p[1], p[2]);
            const rx = ox + sx * sub;
            const ry = oy + sy * sub;
            if (isCenter) {
              ctx.fillStyle = inkFrom(p, dark, 0.15, contrast);
              ctx.fillRect(rx, ry, sub + 0.4, sub + 0.4);
              continue;
            }
            const thr = 0.42 + (bayer(x * N + sx, y * N + sy) - 0.5) * (0.22 + strength * 0.2);
            const on = pL < thr;
            if (on) {
              const [nr, ng, nb] = setLuminance(p[0], p[1], p[2], surroundTarget(pL, true, strength));
              ctx.fillStyle = rgbStr(nr, ng, nb);
            } else {
              const [nr, ng, nb] = setLuminance(p[0], p[1], p[2], surroundTarget(pL, false, strength));
              ctx.fillStyle = rgbStr(nr, ng, nb);
            }
            ctx.fillRect(rx, ry, sub + 0.35, sub + 0.35);
          }
        }
      }
    }
  }

  drawPhotoFinders(ctx, qr, style, atlas, origin, cell);
}

export { paperColor };
