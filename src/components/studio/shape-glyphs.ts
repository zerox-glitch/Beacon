/**
 * Shape-picker glyph painters — a 1:1 port of the mobile app's
 * ShapeVisuals.kt tiles (ModuleShapeVisualTile / EyeShapeVisualTile /
 * EyeBallVisualTile):
 *
 *  • modules  — a 2×2 cluster of the dot shape (dotRadius = cell × 0.40)
 *  • eye frame — a stroke-outline silhouette (stroke = 22% of the icon;
 *    Target is a double ring, Ticks a square with side tick marks)
 *  • pupil    — a solid pupil (radius = 28% of the icon) behind a faint
 *    25%-alpha finder-frame hint
 */
import type { EyeShape, ModuleShape } from "@/lib/qr/types";

function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return color.length === 7 ? `${color}${a}` : color;
}

/** Per-corner rounded rect as a path (matches the app's RoundRect radii). */
function rr(
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
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function star4(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const outer = r;
  const inner = outer * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

/** One module dot of the cluster — the app's per-shape tile recipes. */
function drawDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, shape: ModuleShape) {
  switch (shape) {
    case "square":
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      return;
    case "rounded":
      rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.45, r * 0.45, r * 0.45, r * 0.45);
      ctx.fill();
      return;
    case "squircle":
      rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.7, r * 0.7, r * 0.7, r * 0.7);
      ctx.fill();
      return;
    case "dots":
    case "bubbles":
    case "fluid":
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "classy":
      rr(ctx, cx - r, cy - r, r * 2, r * 2, 0, r * 0.9, 0, r * 0.9);
      ctx.fill();
      return;
    case "leaf":
      rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.9, 0, r * 0.9, 0);
      ctx.fill();
      return;
    case "diamond": {
      diamondPath(ctx, cx, cy, r * 1.05);
      ctx.fill();
      return;
    }
    case "star":
      star4(ctx, cx, cy, r * 1.1);
      ctx.fill();
      return;
    case "heart": {
      const top = cy - r * 0.95;
      const bottom = cy + r * 0.95;
      ctx.beginPath();
      ctx.moveTo(cx, top + r * 0.57);
      ctx.bezierCurveTo(cx - r * 0.95, top, cx - r * 1.14, top + r * 0.855, cx, bottom);
      ctx.bezierCurveTo(cx + r * 1.14, top + r * 0.855, cx + r * 0.95, top, cx, top + r * 0.57);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case "plus":
    case "cross": {
      const t = r * 0.4;
      ctx.fillRect(cx - r, cy - t, r * 2, t * 2);
      ctx.fillRect(cx - t, cy - r, t * 2, r * 2);
      return;
    }
    case "hex":
      hexPath(ctx, cx, cy, r * 1.05);
      ctx.fill();
      return;
    case "dash":
    case "hbar":
      rr(ctx, cx - r * 1.1, cy - r * 0.5, r * 2.2, r, r * 0.3, r * 0.3, r * 0.3, r * 0.3);
      ctx.fill();
      return;
    case "vbar":
      rr(ctx, cx - r * 0.5, cy - r * 1.1, r, r * 2.2, r * 0.3, r * 0.3, r * 0.3, r * 0.3);
      ctx.fill();
      return;
    case "diag": {
      const rad = r * 0.95;
      const w = r * 0.36;
      ctx.beginPath();
      ctx.moveTo(cx - rad + w, cy - rad);
      ctx.lineTo(cx + rad, cy + rad - w);
      ctx.lineTo(cx + rad - w, cy + rad);
      ctx.lineTo(cx - rad, cy - rad + w);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case "radial": {
      const rad = r * 0.95;
      ctx.beginPath();
      ctx.moveTo(cx + rad * 0.65, cy);
      ctx.lineTo(cx - rad * 0.5, cy - rad * 0.32);
      ctx.lineTo(cx - rad * 0.28, cy);
      ctx.lineTo(cx - rad * 0.5, cy + rad * 0.32);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case "confetti": {
      const rad = r * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - rad, cy - rad * 0.5);
      ctx.lineTo(cx + rad * 0.5, cy - rad);
      ctx.lineTo(cx + rad, cy + rad * 0.5);
      ctx.lineTo(cx - rad * 0.5, cy + rad);
      ctx.closePath();
      ctx.fill();
      return;
    }
  }
}

export function drawModuleClusterIcon(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: ModuleShape,
  color: string,
) {
  ctx.fillStyle = color;
  const cell = size / 2;
  const dotRadius = cell * 0.4;
  for (const [gx, gy] of [
    [0.5, 0.5],
    [1.5, 0.5],
    [0.5, 1.5],
    [1.5, 1.5],
  ] as const) {
    drawDot(ctx, cell * gx, cell * gy, dotRadius, shape);
  }
}

export function drawEyeFrameGlyph(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: EyeShape,
  color: string,
) {
    const w = size;
    const strokeW = w * 0.22;
    const half = strokeW / 2;
    ctx.strokeStyle = color;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    switch (shape) {
      case "square":
        ctx.lineWidth = strokeW;
        ctx.strokeRect(half, half, w - strokeW, w - strokeW);
        return;
      case "rounded":
        ctx.lineWidth = strokeW;
        rr(ctx, half, half, w - strokeW, w - strokeW, w * 0.2, w * 0.2, w * 0.2, w * 0.2);
        ctx.stroke();
        return;
      case "extra-rounded":
        ctx.lineWidth = strokeW;
        rr(ctx, half, half, w - strokeW, w - strokeW, w * 0.38, w * 0.38, w * 0.38, w * 0.38);
        ctx.stroke();
        return;
      case "circle":
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, (w - strokeW) / 2, 0, Math.PI * 2);
        ctx.stroke();
        return;
      case "leaf":
        ctx.lineWidth = strokeW;
        rr(ctx, half, half, w - strokeW, w - strokeW, w * 0.42, 0, w * 0.42, 0);
        ctx.stroke();
        return;
      case "classy":
        ctx.lineWidth = strokeW;
        rr(ctx, half, half, w - strokeW, w - strokeW, w * 0.35, w * 0.1, w * 0.35, w * 0.1);
        ctx.stroke();
        return;
      case "diamond":
        ctx.lineWidth = strokeW;
        diamondPath(ctx, w / 2, w / 2, w / 2 - half);
        ctx.stroke();
        return;
      case "hex":
        ctx.lineWidth = strokeW;
        hexPath(ctx, w / 2, w / 2, w / 2 - half);
        ctx.stroke();
        return;
      case "target":
        ctx.lineWidth = strokeW * 0.7;
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, (w - strokeW) / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = strokeW * 0.5;
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, (w - strokeW) / 4, 0, Math.PI * 2);
        ctx.stroke();
        return;
      case "ticks":
        ctx.lineWidth = strokeW * 0.8;
        ctx.strokeRect(half, half, w - strokeW, w - strokeW);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, w / 2);
        ctx.lineTo(strokeW, w / 2);
        ctx.moveTo(w - strokeW, w / 2);
        ctx.lineTo(w, w / 2);
        ctx.stroke();
        return;
    }
}

export function drawEyeBallGlyph(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: EyeShape,
  color: string,
) {
    const w = size;
    const cx = w / 2;
    // Faint outer finder-frame hint.
    ctx.strokeStyle = withAlpha(color, 0.25);
    ctx.lineWidth = 1.5;
    rr(ctx, 1, 1, w - 2, w - 2, 4, 4, 4, 4);
    ctx.stroke();
    // Inner solid pupil.
    const p = w * 0.28;
    ctx.fillStyle = color;
    switch (shape) {
      case "circle":
      case "target":
        ctx.beginPath();
        ctx.arc(cx, cx, p, 0, Math.PI * 2);
        ctx.fill();
        return;
      case "square":
      case "ticks":
        ctx.fillRect(cx - p, cx - p, p * 2, p * 2);
        return;
      case "rounded":
        rr(ctx, cx - p, cx - p, p * 2, p * 2, p * 0.5, p * 0.5, p * 0.5, p * 0.5);
        ctx.fill();
        return;
      case "extra-rounded":
        rr(ctx, cx - p, cx - p, p * 2, p * 2, p * 0.85, p * 0.85, p * 0.85, p * 0.85);
        ctx.fill();
        return;
      case "leaf":
      case "classy":
        rr(ctx, cx - p, cx - p, p * 2, p * 2, p * 0.9, 1, p * 0.9, 1);
        ctx.fill();
        return;
      case "diamond":
        diamondPath(ctx, cx, cx, p * 1.2);
        ctx.fill();
        return;
      case "hex":
        hexPath(ctx, cx, cx, p * 1.15);
        ctx.fill();
        return;
    }
}
