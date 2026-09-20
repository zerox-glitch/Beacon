import { QrCodeDataType } from "uqr";
import type { EncodedQr } from "./encode";
import type { EyeShape, ModuleShape, QrStyle } from "./types";

export const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit?.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
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

/** Photo aligned to the QR body so filling a module reveals that tile of the image. */
function makePhotoPattern(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  origin: number,
  body: number,
): CanvasPattern | null {
  const size = Math.max(32, Math.round(body));
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ox = off.getContext("2d");
  if (!ox) return null;
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = "high";
  coverDraw(ox, img, 0, 0, size, size, img.naturalWidth, img.naturalHeight);
  const pat = ctx.createPattern(off, "no-repeat");
  if (!pat) return null;
  const m = new DOMMatrix();
  m.translateSelf(origin, origin);
  if (size !== body) m.scaleSelf(body / size, body / size);
  pat.setTransform(m);
  return pat;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
) {
  const ctl = Math.max(0, tl);
  const ctr = Math.max(0, tr);
  const cbr = Math.max(0, br);
  const cbl = Math.max(0, bl);
  ctx.beginPath();
  ctx.moveTo(x + ctl, y);
  ctx.lineTo(x + w - ctr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + ctr);
  ctx.lineTo(x + w, y + h - cbr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - cbr, y + h);
  ctx.lineTo(x + cbl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - cbl);
  ctx.lineTo(x, y + ctl);
  ctx.quadraticCurveTo(x, y, x + ctl, y);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points = 5) {
  const inner = r * 0.42;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const r = s * 0.25;
  ctx.beginPath();
  ctx.arc(cx - s * 0.225, cy - s * 0.14, r, 0, Math.PI * 2);
  ctx.moveTo(cx + s * 0.225 + r, cy - s * 0.14);
  ctx.arc(cx + s * 0.225, cy - s * 0.14, r, 0, Math.PI * 2);
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.47, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.47, cy - s * 0.1);
  ctx.closePath();
}

function plusPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const t = s * 0.34;
  const o = (s - t) / 2;
  ctx.beginPath();
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

/** Deterministic per-cell hash so decorative orientations stay stable across preview/export sizes. */
function cellHash(gx: number, gy: number): number {
  let h = (gx * 374761393 + gy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export interface ModuleGrid {
  gx: number;
  gy: number;
  size: number;
}

function strokeBar(
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
  roundedRect(ctx, -len / 2, -thick / 2, len, thick, thick / 2, thick / 2, thick / 2, thick / 2);
  ctx.fill();
  ctx.restore();
}

function drawModuleShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  shape: ModuleShape,
  neighbors?: { n: boolean; e: boolean; s: boolean; w: boolean },
  grid?: ModuleGrid,
) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const h = grid ? cellHash(grid.gx, grid.gy) : cellHash(Math.round(x), Math.round(y));
  switch (shape) {
    case "square":
      ctx.fillRect(x, y, s, s);
      return;
    case "rounded":
      roundedRect(ctx, x, y, s, s, s * 0.28, s * 0.28, s * 0.28, s * 0.28);
      ctx.fill();
      return;
    case "squircle":
      roundedRect(ctx, x, y, s, s, s * 0.42, s * 0.42, s * 0.42, s * 0.42);
      ctx.fill();
      return;
    case "dots":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + s, cy);
      ctx.lineTo(cx, y + s);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
      return;
    case "star":
      starPath(ctx, cx, cy, s * 0.5);
      ctx.fill();
      return;
    case "plus":
      plusPath(ctx, x, y, s);
      ctx.fill();
      return;
    case "classy":
      roundedRect(ctx, x, y, s, s, 0, s * 0.55, 0, s * 0.55);
      ctx.fill();
      return;
    case "leaf":
      roundedRect(ctx, x, y, s, s, s * 0.62, 0, s * 0.62, 0);
      ctx.fill();
      return;
    case "hex":
      hexPath(ctx, cx, cy, s * 0.52);
      ctx.fill();
      return;
    case "heart":
      heartPath(ctx, cx, cy - s * 0.04, s * 0.88);
      ctx.fill();
      return;
    case "fluid": {
      const n = neighbors;
      const r = s * 0.52;
      roundedRect(
        ctx,
        x,
        y,
        s,
        s,
        n && (n.n || n.w) ? 0 : r,
        n && (n.n || n.e) ? 0 : r,
        n && (n.s || n.e) ? 0 : r,
        n && (n.s || n.w) ? 0 : r,
      );
      ctx.fill();
      return;
    }
    case "confetti": {
      const angle = ((h % 360) * Math.PI) / 180;
      const len = s * (0.66 + ((h >>> 9) % 28) / 100);
      strokeBar(ctx, cx, cy, len, s * 0.38, angle);
      return;
    }
    case "dash": {
      const horizontal = h % 2 === 0;
      strokeBar(ctx, cx, cy, s * 0.95, s * 0.44, horizontal ? 0 : Math.PI / 2);
      return;
    }
    case "cross": {
      strokeBar(ctx, cx, cy, s * 0.95, s * 0.38, Math.PI / 4);
      strokeBar(ctx, cx, cy, s * 0.95, s * 0.38, -Math.PI / 4);
      return;
    }
    case "diag": {
      strokeBar(ctx, cx, cy, s * 1.02, s * 0.36, Math.PI / 4);
      return;
    }
    case "radial": {
      const size = grid?.size ?? 41;
      const c = (size - 1) / 2;
      const ang = grid ? Math.atan2(grid.gy - c, grid.gx - c) : ((h % 360) * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      const wob = 0.8 + ((h >>> 5) % 20) / 100;
      ctx.beginPath();
      ctx.moveTo(s * 0.55 * wob, 0);
      ctx.lineTo(-s * 0.45 * wob, -s * 0.28);
      ctx.lineTo(-s * 0.3 * wob, 0);
      ctx.lineTo(-s * 0.45 * wob, s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    case "bubbles": {
      const r = s * (0.26 + ((h % 64) / 64) * 0.22);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    default:
      ctx.fillRect(x, y, s, s);
  }
}

function eyeRadii(shape: EyeShape, s: number): [number, number, number, number] {
  switch (shape) {
    case "square":
      return [0, 0, 0, 0];
    case "rounded":
      return [s * 0.18, s * 0.18, s * 0.18, s * 0.18];
    case "extra-rounded":
      return [s * 0.32, s * 0.32, s * 0.32, s * 0.32];
    case "circle":
      return [s * 0.5, s * 0.5, s * 0.5, s * 0.5];
    case "classy":
      return [0, s * 0.38, 0, s * 0.38];
    case "leaf":
      return [s * 0.42, 0, s * 0.42, 0];
    case "diamond":
      return [0, 0, 0, 0];
    case "hex":
      return [0, 0, 0, 0];
    default:
      return [s * 0.18, s * 0.18, s * 0.18, s * 0.18];
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  shape: EyeShape,
  color: string,
) {
  ctx.fillStyle = color;
  if (shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y);
    ctx.lineTo(x + s, y + s / 2);
    ctx.lineTo(x + s / 2, y + s);
    ctx.lineTo(x, y + s / 2);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (shape === "hex") {
    hexPath(ctx, x + s / 2, y + s / 2, s * 0.52);
    ctx.fill();
    return;
  }
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const [tl, tr, br, bl] = eyeRadii(shape, s);
  roundedRect(ctx, x, y, s, s, tl, tr, br, bl);
  ctx.fill();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  eyeShape: EyeShape,
  ballShape: EyeShape,
  eyeColor: string,
  ballColor: string,
  bg: string,
) {
  const s = cell * 7;
  if (eyeShape === "target") {
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(ox + s / 2, oy + s / 2, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(ox + s / 2, oy + s / 2, s * (0.5 - 1 / 7), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(ox + s / 2, oy + s / 2, s * (1.5 / 7), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  drawLayer(ctx, ox, oy, s, eyeShape, eyeColor);
  const inset = cell;
  drawLayer(ctx, ox + inset, oy + inset, cell * 5, eyeShape, bg);
  const ball = cell * 3;
  const bx = ox + cell * 2;
  const by = oy + cell * 2;
  drawLayer(ctx, bx, by, ball, ballShape, ballColor);
  if (eyeShape === "ticks") {
    const t = cell * 1.35;
    const r = t * 0.3;
    ctx.fillStyle = eyeColor;
    roundedRect(ctx, ox + s / 2 - t / 2, oy, t, t, r, r, r, r);
    ctx.fill();
    roundedRect(ctx, ox + s / 2 - t / 2, oy + s - t, t, t, r, r, r, r);
    ctx.fill();
    roundedRect(ctx, ox, oy + s / 2 - t / 2, t, t, r, r, r, r);
    ctx.fill();
    roundedRect(ctx, ox + s - t, oy + s / 2 - t / 2, t, t, r, r, r, r);
    ctx.fill();
  }
}

function sampleGrid(
  img: HTMLImageElement,
  size: number,
): { data: Uint8ClampedArray; canvas: HTMLCanvasElement } {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) throw new Error("canvas");
  coverDraw(cx, img, 0, 0, size, size, img.naturalWidth, img.naturalHeight);
  return { data: cx.getImageData(0, 0, size, size).data, canvas: c };
}

function lumAt(data: Uint8ClampedArray, size: number, x: number, y: number): number {
  const i = (y * size + x) * 4;
  return (data[i]! * 0.2126 + data[i + 1]! * 0.7152 + data[i + 2]! * 0.0722) / 255;
}

function rgbAt(data: Uint8ClampedArray, size: number, x: number, y: number): [number, number, number] {
  const i = (y * size + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function rgbStr(r: number, g: number, b: number): string {
  return `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Shift a photo color to a target luminance while keeping its hue. */
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
 * Image-QR color: the photo stays visible, dark/light bits are forced into
 * scannable luminance bands. `contrast` widens the gap; `fidelity` (opacity)
 * keeps more of the original photo.
 */
function mapModuleColor(
  r: number,
  g: number,
  b: number,
  dark: boolean,
  contrast: number,
  fidelity: number,
): string {
  const C = clamp(contrast, 0.25, 1);
  const F = clamp(fidelity, 0.12, 1);
  // Wide luminance split is what phone cameras need. Hue stays from the photo.
  if (dark) {
    const target = 0.1 + F * (0.16 - C * 0.08);
    const [nr, ng, nb] = setLuminance(r, g, b, target);
    return rgbStr(nr, ng, nb);
  }
  const target = 0.9 - F * (0.12 - C * 0.05);
  const [nr, ng, nb] = setLuminance(r, g, b, target);
  return rgbStr(nr, ng, nb);
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Tint a photo-derived rgb() toward the preset foreground so style + picture mix. */
function tintWithPreset(photoCss: string, fg: string, amount: number): string {
  const pm = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(photoCss);
  const fgRgb = parseHex(fg);
  if (!pm || !fgRgb) return photoCss;
  const t = clamp(amount, 0, 1);
  return rgbStr(
    Number(pm[1]) * (1 - t) + fgRgb[0] * t,
    Number(pm[2]) * (1 - t) + fgRgb[1] * t,
    Number(pm[3]) * (1 - t) + fgRgb[2] * t,
  );
}

function isFinderCell(x: number, y: number, size: number): boolean {
  return (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
}

function makeFill(
  ctx: CanvasRenderingContext2D,
  style: QrStyle,
  x0: number,
  y0: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (style.gradientType === "none") return style.fg;
  if (style.gradientType === "radial") {
    const g = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 0, x0 + w / 2, y0 + h / 2, w * 0.72);
    g.addColorStop(0, style.fg);
    g.addColorStop(1, style.gradientTo);
    return g;
  }
  const g =
    style.gradientType === "diagonal"
      ? ctx.createLinearGradient(x0, y0, x0 + w, y0 + h)
      : ctx.createLinearGradient(x0, y0, x0 + w, y0);
  g.addColorStop(0, style.fg);
  g.addColorStop(1, style.gradientTo);
  return g;
}

function isDark(qr: EncodedQr, x: number, y: number): boolean {
  return Boolean(qr.data[y]?.[x]);
}

export function prepareCanvas(canvas: HTMLCanvasElement, px: number): CanvasRenderingContext2D {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  canvas.width = Math.round(px * dpr);
  canvas.height = Math.round(px * dpr);
  canvas.style.width = `${px}px`;
  canvas.style.height = `${px}px`;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function renderQr(
  canvas: HTMLCanvasElement,
  qr: EncodedQr,
  style: QrStyle,
  opts: {
    pixelSize: number;
    art?: HTMLImageElement | null;
    logo?: HTMLImageElement | null;
    exportScale?: boolean;
  },
) {
  const px = opts.pixelSize;
  const ctx = opts.exportScale
    ? (() => {
        canvas.width = px;
        canvas.height = px;
        canvas.style.width = `${px}px`;
        canvas.style.height = `${px}px`;
        const c = canvas.getContext("2d", { willReadFrequently: true });
        if (!c) throw new Error("Canvas is not available");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "high";
        return c;
      })()
    : prepareCanvas(canvas, px);

  const qz = Math.max(0, Math.min(8, style.quietZone));
  const total = qr.size + qz * 2;
  const cell = px / total;
  const origin = qz * cell;
  const body = qr.size * cell;
  const pictured = Boolean(opts.art) && style.imageMode !== "none" && style.imageMode !== "logo";
  const mode = pictured ? style.imageMode : "none";
  const fidelity = clamp(style.imageOpacity, 0.12, 1);
  const contrast = clamp(style.contrast, 0.25, 1);

  ctx.clearRect(0, 0, px, px);
  if (!style.transparentBg) {
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, px, px);
  }

  const sampled = pictured && opts.art ? sampleGrid(opts.art, qr.size) : null;
  const fill = makeFill(ctx, style, origin, origin, body, body);
  const gap = Math.max(0, Math.min(0.35, style.moduleGap));

  // Backdrop / Halftone: photo sits behind the mark.
  if ((mode === "backdrop" || mode === "halftone") && opts.art) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(origin, origin, body, body);
    ctx.clip();
    ctx.globalAlpha = mode === "halftone" ? Math.max(0.18, fidelity * 0.4) : fidelity;
    coverDraw(
      ctx,
      opts.art,
      origin,
      origin,
      body,
      body,
      opts.art.naturalWidth,
      opts.art.naturalHeight,
    );
    ctx.restore();
  }

  // Picture: photo lives only inside the dots. Light cells stay paper.
  if (mode === "paint" && opts.art) {
    const pat = makePhotoPattern(ctx, opts.art, origin, body);
    const bgRgb = parseHex(style.bg);
    const bgLum = bgRgb ? luma(bgRgb[0], bgRgb[1], bgRgb[2]) : 1;
    const lightPaper = bgLum >= 0.45 ? style.bg : "#f2eee6";
    const scale = clamp(style.dotScale, 0.5, 0.98);
    const ds = cell * scale * (1 - gap);
    const inset = (cell - ds) / 2;
    const darken = clamp(0.2 + contrast * 0.55 * (1.15 - fidelity * 0.4), 0.16, 0.8);
    const decorative = style.moduleShape !== "square";

    if (bgLum < 0.45) {
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (isFinderCell(x, y, qr.size) || isDark(qr, x, y)) continue;
          ctx.fillStyle = lightPaper;
          ctx.fillRect(origin + x * cell, origin + y * cell, cell, cell);
        }
      }
    }

    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (isFinderCell(x, y, qr.size) || !isDark(qr, x, y)) continue;
        const type = qr.types[y]![x]!;
        const protectedPattern =
          type === QrCodeDataType.Function ||
          type === QrCodeDataType.Timing ||
          type === QrCodeDataType.Alignment;
        const grid: ModuleGrid = { gx: x, gy: y, size: qr.size };
        const px0 = origin + x * cell;
        const py0 = origin + y * cell;
        const [r, g, b] = sampled ? rgbAt(sampled.data, qr.size, x, y) : [20, 20, 20];
        const fallback = mapModuleColor(r, g, b, true, contrast, fidelity);
        const accent =
          Boolean(style.accentShape && style.accentColor && !style.accentOnLight) &&
          cellHash(x, y) % 6 === 0;
        const shape: ModuleShape = accent
          ? style.accentShape!
          : protectedPattern
            ? "square"
            : style.moduleShape;
        const ox = protectedPattern ? px0 : px0 + inset;
        const oy = protectedPattern ? py0 : py0 + inset;
        const s = protectedPattern ? cell : ds;
        const photoFill: string | CanvasPattern = accent ? style.accentColor! : (pat ?? fallback);

        ctx.fillStyle = photoFill;
        if (protectedPattern) ctx.fillRect(px0, py0, cell, cell);
        else drawModuleShape(ctx, ox, oy, s, shape, undefined, grid);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(0,0,0,${darken})`;
        if (protectedPattern) ctx.fillRect(px0, py0, cell, cell);
        else drawModuleShape(ctx, ox, oy, s, shape, undefined, grid);
        ctx.globalCompositeOperation = "source-over";
        if (decorative && !accent && !protectedPattern) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = tintWithPreset(fallback, style.fg, 0.55);
          drawModuleShape(ctx, ox, oy, s, shape, undefined, grid);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  if (mode !== "paint") {
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (isFinderCell(x, y, qr.size)) continue;

        const type = qr.types[y]![x]!;
        const dark = isDark(qr, x, y);
        const px0 = origin + x * cell;
        const py0 = origin + y * cell;
        const pad = cell * gap * 0.5;
        const protectedPattern =
          type === QrCodeDataType.Function ||
          type === QrCodeDataType.Timing ||
          type === QrCodeDataType.Alignment;
        const grid: ModuleGrid = { gx: x, gy: y, size: qr.size };
        const L = sampled ? lumAt(sampled.data, qr.size, x, y) : dark ? 0 : 1;

        if (mode === "mosaic" && sampled) {
          const [r, g, b] = rgbAt(sampled.data, qr.size, x, y);
          ctx.fillStyle = mapModuleColor(r, g, b, dark, contrast, fidelity);
          const tileGap = Math.max(pad, cell * 0.04);
          const ms = cell - tileGap * 2;
          drawModuleShape(
            ctx,
            px0 + tileGap,
            py0 + tileGap,
            ms,
            style.moduleShape === "fluid" ? "square" : style.moduleShape,
            {
              n: isDark(qr, x, y - 1),
              e: isDark(qr, x + 1, y),
              s: isDark(qr, x, y + 1),
              w: isDark(qr, x - 1, y),
            },
            grid,
          );
          continue;
        }

        if (mode === "halftone" && sampled) {
          const [r, g, b] = rgbAt(sampled.data, qr.size, x, y);
          const minR = dark ? cell * 0.28 : cell * 0.04;
          const maxR = dark ? cell * 0.48 * clamp(style.dotScale, 0.5, 1) * 1.15 : cell * 0.16;
          const radius = minR + (maxR - minR) * (dark ? 1 - L * 0.35 : 1 - L);
          ctx.fillStyle = mapModuleColor(r, g, b, dark, contrast, fidelity);
          ctx.beginPath();
          ctx.arc(px0 + cell / 2, py0 + cell / 2, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        if (mode === "backdrop") {
          if (protectedPattern) {
            ctx.fillStyle = dark ? fill : style.bg;
            ctx.globalAlpha = dark ? 0.92 : 0.55;
            ctx.fillRect(px0, py0, cell, cell);
            ctx.globalAlpha = 1;
            continue;
          }
          if (!dark) continue;
          const scale = clamp(style.dotScale, 0.45, 0.92);
          const ds = cell * scale * (1 - gap);
          ctx.fillStyle = fill;
          ctx.globalAlpha = 0.82 + contrast * 0.15;
          drawModuleShape(
            ctx,
            px0 + (cell - ds) / 2,
            py0 + (cell - ds) / 2,
            ds,
            style.moduleShape,
            undefined,
            grid,
          );
          ctx.globalAlpha = 1;
          continue;
        }

        if (protectedPattern) {
          ctx.fillStyle = dark ? fill : style.bg;
          ctx.fillRect(px0, py0, cell, cell);
          continue;
        }

        if (!dark) {
          if (style.accentShape && style.accentColor && style.accentOnLight) {
            ctx.fillStyle = style.accentColor;
            const ds = cell * 0.3;
            drawModuleShape(ctx, px0 + (cell - ds) / 2, py0 + (cell - ds) / 2, ds, style.accentShape, undefined, grid);
          }
          continue;
        }

        const accent =
          style.accentShape && style.accentColor && !style.accentOnLight && cellHash(x, y) % 6 === 0;
        ctx.fillStyle = accent ? style.accentColor! : fill;
        const neighbors =
          style.moduleShape === "fluid" && !accent
            ? {
                n: isDark(qr, x, y - 1),
                e: isDark(qr, x + 1, y),
                s: isDark(qr, x, y + 1),
                w: isDark(qr, x - 1, y),
              }
            : undefined;
        const dotWeight = style.dotScale ? Math.max(0.35, Math.min(1.0, style.dotScale * 1.35)) : 1.0;
        const mSize = (cell - pad * 2) * dotWeight;
        const mOffset = (cell - mSize) / 2;
        drawModuleShape(
          ctx,
          px0 + mOffset,
          py0 + mOffset,
          mSize,
          accent ? style.accentShape! : style.moduleShape,
          neighbors,
          grid,
        );
      }
    }
  }

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
    ctx.fillStyle = style.bg;
    ctx.fillRect(sepX, sepY, cell * 8, cell * 8);
    drawEye(
      ctx,
      ox,
      oy,
      cell,
      style.eyeShape,
      style.ballShape,
      style.eyeColor,
      style.ballColor,
      style.bg,
    );
  }

  const logoImg = opts.logo ?? (style.imageMode === "logo" ? opts.art : null);
  if (logoImg) {
    const logoSize = body * Math.max(0.12, Math.min(0.32, style.logoScale));
    const lx = origin + (body - logoSize) / 2;
    const ly = origin + (body - logoSize) / 2;
    const pad = logoSize * 0.12;
    ctx.fillStyle = style.bg;
    roundedRect(
      ctx,
      lx - pad * 0.4,
      ly - pad * 0.4,
      logoSize + pad * 0.8,
      logoSize + pad * 0.8,
      pad,
      pad,
      pad,
      pad,
    );
    ctx.fill();
    ctx.save();
    roundedRect(ctx, lx, ly, logoSize, logoSize, pad * 0.6, pad * 0.6, pad * 0.6, pad * 0.6);
    ctx.clip();
    coverDraw(
      ctx,
      logoImg,
      lx,
      ly,
      logoSize,
      logoSize,
      logoImg.naturalWidth,
      logoImg.naturalHeight,
    );
    ctx.restore();
  }
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }, "image/png");
}

export async function canvasPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export PNG"));
    }, "image/png");
  });
}
