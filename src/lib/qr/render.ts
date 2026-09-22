import { QrCodeDataType } from "uqr";
import { renderArtisticQr } from "./art-engine";
import { getArtDirection } from "./art-directions";
import { buildArtPlan } from "./art/art-plan";
import { paintArtPlan } from "./art/paint";
import type { EncodedQr } from "./encode";
import type { EyeShape, ModuleShape, QrStyle } from "./types";

export const imageCache = new Map<string, HTMLImageElement>();

const MAX_IMAGE_EDGE = 1600;

function downsampleImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const edge = Math.max(w, h);
  if (edge <= MAX_IMAGE_EDGE) return Promise.resolve(img);
  const scale = MAX_IMAGE_EDGE / edge;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const cx = c.getContext("2d");
  if (!cx) return Promise.resolve(img);
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => {
    const out = new Image();
    out.onload = () => resolve(out);
    out.onerror = () => resolve(img);
    try {
      out.src = c.toDataURL("image/jpeg", 0.9);
    } catch {
      resolve(img);
    }
  });
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit?.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      downsampleImage(img)
        .then((ready) => {
          imageCache.set(url, ready);
          resolve(ready);
        })
        .catch(() => {
          imageCache.set(url, img);
          resolve(img);
        });
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
    case "hbar":
      strokeBar(ctx, cx, cy, s * 0.96, s * 0.48, 0);
      return;
    case "vbar":
      strokeBar(ctx, cx, cy, s * 0.96, s * 0.48, Math.PI / 2);
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

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Tint a photo-derived rgb() toward the preset foreground so style + picture mix. */
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
  if (style.gradientType === "none" || style.gradientType === "image") return style.fg;
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
  canvas.style.width = "100%";
  canvas.style.height = "100%";
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
    kernelBoost?: number;
  },
) {
  const px = opts.pixelSize;
  const ctx = opts.exportScale
    ? (() => {
        canvas.width = px;
        canvas.height = px;
        // Bitmap stays scan-sized; CSS 100% lets the on-screen frame show the
        // whole code. Inline 512px here used to clip the preview to one corner.
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const c = canvas.getContext("2d", { willReadFrequently: true });
        if (!c) throw new Error("Canvas is not available");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "high";
        return c;
      })()
    : prepareCanvas(canvas, px);

  /* ---- ART QR STYLE SYSTEM: a direction paints the whole frame itself ---- */
  const direction = getArtDirection(style.artDirection);
  if (direction) {
    const artCtx = opts.exportScale
      ? (() => {
          canvas.width = px;
          canvas.height = px;
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          const c = canvas.getContext("2d", { willReadFrequently: true });
          if (!c) throw new Error("Canvas is not available");
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.imageSmoothingEnabled = true;
          c.imageSmoothingQuality = "high";
          return c;
        })()
      : prepareCanvas(canvas, px);
    const plan = buildArtPlan({
      qr,
      style,
      direction,
      px,
      relax: style.artRelax ?? 0,
      cameraSafe: Boolean(style.artCameraSafe),
    });
    paintArtPlan(artCtx, plan);
    return;
  }

  const pictured = Boolean(opts.art) && style.imageMode !== "none" && style.imageMode !== "logo";
  const qz = pictured
    ? Math.max(2, Math.min(8, style.quietZone))
    : Math.max(0, Math.min(8, style.quietZone));
  const total = qr.size + qz * 2;
  const cell = px / total;
  const origin = qz * cell;
  const body = qr.size * cell;
  const mode = pictured ? style.imageMode : "none";

  const bgRgb = parseHex(style.bg);
  const bgLum = bgRgb ? luma(bgRgb[0], bgRgb[1], bgRgb[2]) : 1;
  const paper = pictured && bgLum < 0.42 ? "#f3eee6" : style.bg;

  ctx.clearRect(0, 0, px, px);
  if (!style.transparentBg) {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, px, px);
  }

  const fill = makeFill(ctx, style, origin, origin, body, body);
  const gap = Math.max(0, Math.min(0.35, style.moduleGap));

  if (
    opts.art &&
    (mode === "paint" ||
      mode === "mosaic" ||
      mode === "halftone" ||
      mode === "backdrop" ||
      mode === "duotone" ||
      mode === "mono")
  ) {
    renderArtisticQr(ctx, qr, style, opts.art, origin, body, cell, px, fill, opts.kernelBoost ?? 0);
  } else {
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

        if (protectedPattern) {
          ctx.fillStyle = dark ? fill : paper;
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

  if (!pictured) {
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
      ctx.fillStyle = paper;
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
        paper,
      );
    }
  }

  const logoImg = opts.logo ?? (style.imageMode === "logo" ? opts.art : null);
  if (logoImg) {
    const logoSize = body * Math.max(0.12, Math.min(0.32, style.logoScale));
    const lx = origin + (body - logoSize) / 2;
    const ly = origin + (body - logoSize) / 2;
    const pad = logoSize * 0.12;
    ctx.fillStyle = paper;
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
