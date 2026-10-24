/**
 * Template frames + border decorations.
 *
 * Line-for-line port of the reference app renderer (QRWho-App,
 * `QrGenerator.kt`): calculateFrameInsets / drawFrameBackground /
 * drawFrameForeground / drawArtisticBorderDecorations + primitives. The web
 * Templates gallery renders exactly what the Android app renders.
 *
 * All geometry is fractions of the canvas size `s` (px).
 */
import type { TemplateFrameId } from "./types";

interface Insets {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Parses app-style frame keys ("FrameStyle.Note", "BadgeScanMe", "badge-scan-me"). */
export function parseTemplateFrameId(key: string | undefined): TemplateFrameId {
  if (!key) return "none";
  const norm = key
    .replace(/^framestyle\./i, "")
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
  const ids: TemplateFrameId[] = [
    "simple-border", "badge-scan-me", "modern-pill", "phone-frame", "stamp",
    "ticket", "neon-glow", "bracket", "badge", "arch", "cup", "card",
    "label", "speech", "note", "globe", "plaque", "pentagon", "hexagon",
    "diamond", "seal", "bucket",
  ];
  return ids.includes(norm as TemplateFrameId) ? (norm as TemplateFrameId) : "none";
}

/** The surface the code sits on inside each frame (light cells show this).
 *  Container frames paint their own card/circle — the code's light cells must
 *  match it (the app leaves those cells unpainted so the container shows). */
export function templateFramePaper(id: TemplateFrameId, styleBg: string): string {
  switch (id) {
    case "bracket":
    case "badge":
    case "arch":
    case "cup":
    case "card":
    case "label":
      return WHITE;
    case "speech": return "#67E8F9";
    case "note": return "#FEF08A";
    case "globe": return "#BFDBFE";
    case "plaque": return "#BEF264";
    case "pentagon": return "#FB7185";
    case "hexagon": return "#FBBF24";
    case "diamond": return "#DDD6FE";
    case "seal": return "#F87171";
    case "bucket": return "#93C5FD";
    default:
      return styleBg;
  }
}

/** Per-side code-area insets (fractions of s) — ports calculateFrameInsets. */
export function templateFrameInsets(id: TemplateFrameId, px: number): Insets {
  const s = px;
  switch (id) {
    case "simple-border": return { l: s * 0.08, t: s * 0.08, r: s * 0.08, b: s * 0.08 };
    case "badge-scan-me": return { l: s * 0.09, t: s * 0.09, r: s * 0.09, b: s * 0.20 };
    case "modern-pill": return { l: s * 0.09, t: s * 0.09, r: s * 0.09, b: s * 0.18 };
    case "phone-frame": return { l: s * 0.08, t: s * 0.10, r: s * 0.08, b: s * 0.08 };
    case "stamp": return { l: s * 0.10, t: s * 0.10, r: s * 0.10, b: s * 0.10 };
    case "ticket": return { l: s * 0.12, t: s * 0.10, r: s * 0.12, b: s * 0.10 };
    case "neon-glow": return { l: s * 0.09, t: s * 0.09, r: s * 0.09, b: s * 0.18 };
    case "bracket": return { l: s * 0.16, t: s * 0.16, r: s * 0.16, b: s * 0.14 };
    case "badge": return { l: s * 0.18, t: s * 0.14, r: s * 0.18, b: s * 0.22 };
    case "arch": return { l: s * 0.20, t: s * 0.22, r: s * 0.20, b: s * 0.28 };
    case "cup": return { l: s * 0.23, t: s * 0.26, r: s * 0.23, b: s * 0.24 };
    case "card": return { l: s * 0.17, t: s * 0.12, r: s * 0.17, b: s * 0.26 };
    case "label": return { l: s * 0.17, t: s * 0.24, r: s * 0.17, b: s * 0.14 };
    case "speech": return { l: s * 0.18, t: s * 0.14, r: s * 0.18, b: s * 0.24 };
    case "note": return { l: s * 0.14, t: s * 0.14, r: s * 0.14, b: s * 0.18 };
    case "globe": return { l: s * 0.18, t: s * 0.18, r: s * 0.18, b: s * 0.18 };
    case "plaque": return { l: s * 0.16, t: s * 0.16, r: s * 0.16, b: s * 0.16 };
    case "pentagon": return { l: s * 0.20, t: s * 0.22, r: s * 0.20, b: s * 0.16 };
    case "hexagon": return { l: s * 0.18, t: s * 0.16, r: s * 0.18, b: s * 0.16 };
    case "diamond": return { l: s * 0.22, t: s * 0.22, r: s * 0.22, b: s * 0.22 };
    case "seal": return { l: s * 0.18, t: s * 0.18, r: s * 0.18, b: s * 0.18 };
    case "bucket": return { l: s * 0.20, t: s * 0.20, r: s * 0.20, b: s * 0.18 };
    case "none":
    default:
      return { l: 0, t: 0, r: 0, b: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function fillRr(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  rrPath(ctx, x1, y1, x2, y2, rx, ry);
  ctx.fill();
}

function strokeRr(
  ctx: Ctx,
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number,
  color: string, width: number, dash?: number[],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  rrPath(ctx, x1, y1, x2, y2, rx, ry);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Rounded-rect path with Android drawRoundRect semantics (x1,y1)-(x2,y2). */
function rrPath(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, rx: number, ry: number): void {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const r = Math.max(0, Math.min(Math.min(rx, ry), w / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function fillCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function strokeCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string, width: number, dash?: number[]): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function fillPoly(ctx: Ctx, pts: number[][], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function dashPoly(ctx: Ctx, pts: number[][], color: string, width: number, dash: number[]): void {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function captionText(ctx: Ctx, text: string, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

/** Star polygon (Badge/Seal rosettes): alternating outer/inner radii. */
function starPoly(ctx: Ctx, cx: number, cy: number, petals: number, outerR: number, innerR: number, color: string): void {
  const pts: number[][] = [];
  for (let i = 0; i < petals * 2; i++) {
    const a = (Math.PI / petals) * i;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  fillPoly(ctx, pts, color);
}

/* ------------------------------------------------------------------ */
/* Frame background containers — ports drawFrameBackground             */
/* ------------------------------------------------------------------ */

const WHITE = "#FFFFFF";

export function drawTemplateFrameBg(ctx: Ctx, id: TemplateFrameId, s: number): void {
  switch (id) {
    case "bracket":
      fillRr(ctx, s * 0.08, s * 0.12, s * 0.92, s * 0.92, s * 0.05, s * 0.05, WHITE);
      break;
    case "badge":
      starPoly(ctx, s * 0.5, s * 0.46, 16, s * 0.44, s * 0.40, "#5B21B6");
      fillCircle(ctx, s * 0.5, s * 0.46, s * 0.35, WHITE);
      break;
    case "arch": {
      ctx.fillStyle = "#4C1D95";
      ctx.beginPath();
      ctx.moveTo(s * 0.12, s * 0.94);
      ctx.lineTo(s * 0.88, s * 0.94);
      ctx.lineTo(s * 0.88, s * 0.35);
      ctx.lineTo(s * 0.88, s * 0.27);
      // arcTo(oval .12,.04-.88,.50, 0°, −180°): over the top, y-down.
      ctx.ellipse(s * 0.5, s * 0.27, s * 0.38, s * 0.23, 0, 0, Math.PI, true);
      ctx.lineTo(s * 0.12, s * 0.94);
      ctx.closePath();
      ctx.fill();
      fillRr(ctx, s * 0.17, s * 0.18, s * 0.83, s * 0.74, s * 0.04, s * 0.04, WHITE);
      break;
    }
    case "cup": {
      ctx.fillStyle = "#0D9488";
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.20);
      ctx.lineTo(s * 0.85, s * 0.20);
      ctx.lineTo(s * 0.78, s * 0.92);
      ctx.quadraticCurveTo(s * 0.78, s * 0.96, s * 0.72, s * 0.96);
      ctx.lineTo(s * 0.28, s * 0.96);
      ctx.quadraticCurveTo(s * 0.22, s * 0.96, s * 0.22, s * 0.92);
      ctx.closePath();
      ctx.fill();
      fillRr(ctx, s * 0.21, s * 0.24, s * 0.79, s * 0.78, s * 0.04, s * 0.04, WHITE);
      break;
    }
    case "card":
      fillRr(ctx, s * 0.08, s * 0.04, s * 0.92, s * 0.96, s * 0.08, s * 0.08, "#0D9488");
      fillRr(ctx, s * 0.15, s * 0.10, s * 0.85, s * 0.76, s * 0.04, s * 0.04, WHITE);
      break;
    case "label":
      fillRr(ctx, s * 0.08, s * 0.04, s * 0.92, s * 0.96, s * 0.08, s * 0.08, "#0D9488");
      fillRr(ctx, s * 0.15, s * 0.22, s * 0.85, s * 0.90, s * 0.04, s * 0.04, WHITE);
      break;
    case "speech": {
      ctx.fillStyle = "#67E8F9";
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.46, s * 0.42, 0, Math.PI * 2);
      ctx.moveTo(s * 0.22, s * 0.70);
      ctx.lineTo(s * 0.12, s * 0.94);
      ctx.lineTo(s * 0.38, s * 0.84);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "note": {
      // Note with the folded corner cut at bottom-right.
      const fold = s * 0.14;
      const inset = s * 0.06;
      ctx.fillStyle = "#FEF08A";
      ctx.beginPath();
      ctx.moveTo(inset, inset);
      ctx.lineTo(s - inset, inset);
      ctx.lineTo(s - inset, s - inset - fold);
      ctx.lineTo(s - inset - fold, s - inset);
      ctx.lineTo(inset, s - inset);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "globe":
      fillCircle(ctx, s * 0.5, s * 0.5, s * 0.46, "#BFDBFE");
      break;
    case "plaque": {
      const cornerCut = s * 0.12;
      const pi = s * 0.05;
      ctx.fillStyle = "#BEF264";
      ctx.beginPath();
      ctx.moveTo(pi + cornerCut, pi);
      ctx.lineTo(s - pi - cornerCut, pi);
      ctx.quadraticCurveTo(s - pi, pi, s - pi, pi + cornerCut);
      ctx.lineTo(s - pi, s - pi - cornerCut);
      ctx.quadraticCurveTo(s - pi, s - pi, s - pi - cornerCut, s - pi);
      ctx.lineTo(pi + cornerCut, s - pi);
      ctx.quadraticCurveTo(pi, s - pi, pi, s - pi - cornerCut);
      ctx.lineTo(pi, pi + cornerCut);
      ctx.quadraticCurveTo(pi, pi, pi + cornerCut, pi);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "pentagon":
      fillPoly(ctx, [
        [s * 0.50, s * 0.04], [s * 0.95, s * 0.36], [s * 0.82, s * 0.94],
        [s * 0.18, s * 0.94], [s * 0.05, s * 0.36],
      ], "#FB7185");
      break;
    case "hexagon":
      fillPoly(ctx, [
        [s * 0.50, s * 0.04], [s * 0.95, s * 0.28], [s * 0.95, s * 0.72],
        [s * 0.50, s * 0.96], [s * 0.05, s * 0.72], [s * 0.05, s * 0.28],
      ], "#FBBF24");
      break;
    case "diamond":
      fillPoly(ctx, [
        [s * 0.50, s * 0.04], [s * 0.96, s * 0.50], [s * 0.50, s * 0.96], [s * 0.04, s * 0.50],
      ], "#DDD6FE");
      break;
    case "seal":
      starPoly(ctx, s * 0.5, s * 0.5, 18, s * 0.48, s * 0.44, "#F87171");
      break;
    case "bucket": {
      ctx.fillStyle = "#93C5FD";
      ctx.beginPath();
      ctx.moveTo(s * 0.10, s * 0.12);
      ctx.lineTo(s * 0.90, s * 0.12);
      ctx.lineTo(s * 0.82, s * 0.92);
      ctx.quadraticCurveTo(s * 0.80, s * 0.95, s * 0.74, s * 0.95);
      ctx.lineTo(s * 0.26, s * 0.95);
      ctx.quadraticCurveTo(s * 0.20, s * 0.95, s * 0.18, s * 0.92);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      // Stroke-only frames (simple-border … neon-glow) paint nothing behind.
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Frame foreground — ports drawFrameForeground                        */
/* ------------------------------------------------------------------ */

export function drawTemplateFrameFg(
  ctx: Ctx,
  id: TemplateFrameId,
  caption: string,
  s: number,
  fgColor: string,
  gradientTo: string,
): void {
  const cap = caption && caption.trim() ? caption : "";

  switch (id) {
    case "simple-border":
      strokeRr(ctx, s * 0.04, s * 0.04, s * 0.96, s * 0.96, s * 0.04, s * 0.04, fgColor, s * 0.02);
      break;
    case "badge-scan-me":
      strokeRr(ctx, s * 0.04, s * 0.04, s * 0.96, s * 0.82, s * 0.04, s * 0.04, fgColor, s * 0.02);
      fillRr(ctx, s * 0.15, s * 0.85, s * 0.85, s * 0.96, s * 0.05, s * 0.05, fgColor);
      captionText(ctx, cap || "SCAN ME", s * 0.5, s * 0.925, s * 0.042, WHITE);
      break;
    case "modern-pill":
      fillRr(ctx, s * 0.20, s * 0.87, s * 0.80, s * 0.96, s * 0.045, s * 0.045, fgColor);
      captionText(ctx, cap || "SCAN ME", s * 0.5, s * 0.93, s * 0.042, WHITE);
      break;
    case "phone-frame":
      strokeRr(ctx, s * 0.04, s * 0.02, s * 0.96, s * 0.98, s * 0.08, s * 0.08, fgColor, s * 0.02);
      fillRr(ctx, s * 0.38, s * 0.035, s * 0.62, s * 0.065, s * 0.015, s * 0.015, fgColor);
      break;
    case "neon-glow":
      strokeRr(ctx, s * 0.05, s * 0.05, s * 0.95, s * 0.84, s * 0.05, s * 0.05, gradientTo, s * 0.025);
      fillRr(ctx, s * 0.22, s * 0.87, s * 0.78, s * 0.96, s * 0.045, s * 0.045, gradientTo);
      captionText(ctx, cap || "SCAN NOW", s * 0.5, s * 0.93, s * 0.042, "#000000");
      break;
    case "bracket": {
      strokeRr(ctx, s * 0.08, s * 0.12, s * 0.92, s * 0.92, s * 0.05, s * 0.05, "#0F172A", s * 0.022);
      const cLen = s * 0.08;
      const bi = s * 0.14;
      const w = s * 0.022;
      line(ctx, bi, bi + cLen, bi, bi, "#0F172A", w);
      line(ctx, bi, bi, bi + cLen, bi, "#0F172A", w);
      line(ctx, s - bi - cLen, bi, s - bi, bi, "#0F172A", w);
      line(ctx, s - bi, bi, s - bi, bi + cLen, "#0F172A", w);
      line(ctx, bi, s - bi - cLen, bi, s - bi, "#0F172A", w);
      line(ctx, bi, s - bi, bi + cLen, s - bi, "#0F172A", w);
      line(ctx, s - bi - cLen, s - bi, s - bi, s - bi, "#0F172A", w);
      line(ctx, s - bi, s - bi - cLen, s - bi, s - bi, "#0F172A", w);
      // Speech bubble on top with tail.
      const bw = s * 0.44;
      const bh = s * 0.10;
      const bx = (s - bw) / 2;
      const by = s * 0.035;
      ctx.fillStyle = "#6366F1";
      rrPath(ctx, bx, by, bx + bw, by + bh, s * 0.035, s * 0.035);
      ctx.fill();
      fillPoly(ctx, [
        [s * 0.5 - s * 0.03, by + bh],
        [s * 0.5, by + bh + s * 0.025],
        [s * 0.5 + s * 0.03, by + bh],
      ], "#6366F1");
      captionText(ctx, cap || "SCAN CODE", s * 0.5, s * 0.10, s * 0.042, WHITE);
      break;
    }
    case "badge": {
      const rw = s * 0.60;
      const rh = s * 0.11;
      const rx = (s - rw) / 2;
      const ry = s * 0.83;
      fillPoly(ctx, [
        [rx, ry],
        [rx + rw, ry],
        [rx + rw - s * 0.025, ry + rh / 2],
        [rx + rw, ry + rh],
        [rx, ry + rh],
        [rx + s * 0.025, ry + rh / 2],
      ], "#4C1D95");
      captionText(ctx, cap || "SCAN CODE", s * 0.5, ry + rh * 0.66, s * 0.042, WHITE);
      break;
    }
    case "arch":
      fillRr(ctx, s * 0.14, s * 0.74, s * 0.86, s * 0.94, s * 0.04, s * 0.04, "#3B0764");
      break;
    case "cup":
      fillRr(ctx, s * 0.12, s * 0.13, s * 0.88, s * 0.21, s * 0.02, s * 0.02, WHITE);
      strokeRr(ctx, s * 0.12, s * 0.13, s * 0.88, s * 0.21, s * 0.02, s * 0.02, "#0F172A", s * 0.015);
      fillRr(ctx, s * 0.28, s * 0.07, s * 0.72, s * 0.14, s * 0.02, s * 0.02, WHITE);
      strokeRr(ctx, s * 0.28, s * 0.07, s * 0.72, s * 0.14, s * 0.02, s * 0.02, "#0F172A", s * 0.015);
      strokeRr(ctx, s * 0.21, s * 0.24, s * 0.79, s * 0.78, s * 0.04, s * 0.04, "#0F172A", s * 0.012);
      break;
    case "card":
      strokeRr(ctx, s * 0.08, s * 0.04, s * 0.92, s * 0.96, s * 0.08, s * 0.08, "#0F172A", s * 0.018);
      strokeRr(ctx, s * 0.15, s * 0.10, s * 0.85, s * 0.76, s * 0.04, s * 0.04, "#0F172A", s * 0.018);
      fillRr(ctx, s * 0.24, s * 0.82, s * 0.76, s * 0.92, s * 0.05, s * 0.05, "#06B6D4");
      captionText(ctx, cap || "SCAN ME", s * 0.5, s * 0.885, s * 0.042, WHITE);
      break;
    case "label":
      strokeRr(ctx, s * 0.08, s * 0.04, s * 0.92, s * 0.96, s * 0.08, s * 0.08, "#0F172A", s * 0.018);
      strokeRr(ctx, s * 0.15, s * 0.22, s * 0.85, s * 0.90, s * 0.04, s * 0.04, "#0F172A", s * 0.018);
      fillRr(ctx, s * 0.26, s * 0.07, s * 0.74, s * 0.16, s * 0.045, s * 0.045, "#1E1B4B");
      captionText(ctx, cap || "SCAN ME", s * 0.5, s * 0.13, s * 0.035, WHITE);
      break;
    case "speech":
      strokeCircle(ctx, s * 0.5, s * 0.46, s * 0.39, "#0891B2", s * 0.008, [s * 0.018, s * 0.012]);
      break;
    case "note": {
      const fold = s * 0.14;
      const inset = s * 0.06;
      // Fold flap (filled) at the bottom-right cut corner.
      fillPoly(ctx, [
        [s - inset - fold, s - inset],
        [s - inset - fold, s - inset - fold],
        [s - inset, s - inset - fold],
      ], "#FDE047");
      // Stitch path: rect with the bottom-right corner cut.
      const si = inset + s * 0.03;
      dashPoly(ctx, [
        [si, si],
        [s - si, si],
        [s - si, s - si - fold],
        [s - si - fold, s - si],
        [si, s - si],
      ], "#CA8A04", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    }
    case "globe":
      strokeCircle(ctx, s * 0.5, s * 0.5, s * 0.42, "#2563EB", s * 0.008, [s * 0.016, s * 0.012]);
      break;
    case "plaque": {
      const cornerCut = s * 0.12 - s * 0.01;
      const pi = s * 0.05 + s * 0.03;
      ctx.save();
      ctx.setLineDash([s * 0.016, s * 0.012]);
      ctx.strokeStyle = "#4D7C0F";
      ctx.lineWidth = s * 0.007;
      ctx.beginPath();
      ctx.moveTo(pi + cornerCut, pi);
      ctx.lineTo(s - pi - cornerCut, pi);
      ctx.quadraticCurveTo(s - pi, pi, s - pi, pi + cornerCut);
      ctx.lineTo(s - pi, s - pi - cornerCut);
      ctx.quadraticCurveTo(s - pi, s - pi, s - pi - cornerCut, s - pi);
      ctx.lineTo(pi + cornerCut, s - pi);
      ctx.quadraticCurveTo(pi, s - pi, pi, s - pi - cornerCut);
      ctx.lineTo(pi, pi + cornerCut);
      ctx.quadraticCurveTo(pi, pi, pi + cornerCut, pi);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "pentagon":
      dashPoly(ctx, [
        [s * 0.50, s * 0.08], [s * 0.91, s * 0.38], [s * 0.79, s * 0.90],
        [s * 0.21, s * 0.90], [s * 0.09, s * 0.38],
      ], "#BE123C", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    case "hexagon":
      dashPoly(ctx, [
        [s * 0.50, s * 0.08], [s * 0.91, s * 0.30], [s * 0.91, s * 0.70],
        [s * 0.50, s * 0.92], [s * 0.09, s * 0.70], [s * 0.09, s * 0.30],
      ], "#B45309", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    case "diamond":
      dashPoly(ctx, [
        [s * 0.50, s * 0.08], [s * 0.92, s * 0.50], [s * 0.50, s * 0.92], [s * 0.08, s * 0.50],
      ], "#6D28D9", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    case "seal":
      strokeCircle(ctx, s * 0.5, s * 0.5, s * 0.41, "#B91C1C", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    case "bucket":
      dashPoly(ctx, [
        [s * 0.14, s * 0.16], [s * 0.86, s * 0.16], [s * 0.79, s * 0.90], [s * 0.21, s * 0.90],
      ], "#1D4ED8", s * 0.007, [s * 0.016, s * 0.012]);
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Primitive decorations — ports of the app's private painters          */
/* ------------------------------------------------------------------ */

function drawSnowflake(ctx: Ctx, cx: number, cy: number, radius: number, color: string, width: number): void {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    line(ctx, cx, cy, ex, ey, color, width);
    const mx = cx + Math.cos(angle) * radius * 0.6;
    const my = cy + Math.sin(angle) * radius * 0.6;
    const bAngle = angle + Math.PI / 4;
    line(ctx, mx, my, mx + Math.cos(bAngle) * radius * 0.3, my + Math.sin(bAngle) * radius * 0.3, color, width);
  }
}

function drawMusicNote(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  const headR = size * 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, headR, headR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  const stemW = size * 0.12;
  const stemH = size * 0.9;
  ctx.fillRect(cx + headR * 0.5, cy - stemH, stemW, stemH);
  ctx.beginPath();
  ctx.moveTo(cx + headR * 0.5 + stemW, cy - stemH);
  ctx.bezierCurveTo(
    cx + headR * 0.5 + stemW + size * 0.4, cy - stemH + size * 0.2,
    cx + headR * 0.5 + stemW + size * 0.2, cy - stemH + size * 0.5,
    cx + headR * 0.5 + stemW, cy - stemH + size * 0.4,
  );
  ctx.closePath();
  ctx.fill();
}

function drawDoubleMusicNote(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  const r = size * 0.22;
  fillCircle(ctx, cx - size * 0.3, cy, r, color);
  fillCircle(ctx, cx + size * 0.3, cy - size * 0.15, r, color);
  const stemW = size * 0.1;
  const stemH = size * 0.75;
  ctx.fillStyle = color;
  ctx.fillRect(cx - size * 0.3 + r * 0.4, cy - stemH, stemW, stemH);
  ctx.fillRect(cx + size * 0.3 + r * 0.4, cy - stemH - size * 0.15, stemW, stemH);
  ctx.fillRect(cx - size * 0.3 + r * 0.4, cy - stemH, (cx + size * 0.3 + r * 0.4 + stemW) - (cx - size * 0.3 + r * 0.4), stemW * 1.5);
}

function drawStarSparkle(ctx: Ctx, cx: number, cy: number, radius: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + radius);
  ctx.quadraticCurveTo(cx, cy, cx - radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - radius);
  ctx.closePath();
  ctx.fill();
  fillCircle(ctx, cx, cy, radius * 0.25, color);
}

function drawCherryBlossom(ctx: Ctx, cx: number, cy: number, radius: number, color: string): void {
  for (let i = 0; i < 5; i++) {
    const angle = ((2 * Math.PI) / 5) * i;
    fillCircle(ctx, cx + Math.cos(angle) * radius * 0.6, cy + Math.sin(angle) * radius * 0.6, radius * 0.42, color);
  }
  fillCircle(ctx, cx, cy, radius * 0.22, WHITE);
}

function drawHeart(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.45);
  ctx.bezierCurveTo(
    cx - size * 0.65, cy + size * 0.1,
    cx - size * 0.65, cy - size * 0.45,
    cx, cy - size * 0.15,
  );
  ctx.bezierCurveTo(
    cx + size * 0.65, cy - size * 0.45,
    cx + size * 0.65, cy + size * 0.1,
    cx, cy + size * 0.45,
  );
  ctx.closePath();
  ctx.fill();
}

function drawSpiderWeb(ctx: Ctx, ox: number, oy: number, size: number, color: string, width: number): void {
  line(ctx, ox, oy, ox + size, oy, color, width);
  line(ctx, ox, oy, ox, oy + size, color, width);
  line(ctx, ox, oy, ox + size * 0.7, oy + size * 0.7, color, width);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(ox, oy, size * 0.5, 0, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox, oy, size, 0, Math.PI / 2);
  ctx.stroke();
}

function drawBat(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - size * 0.4, cy - size * 0.3, cx - size * 0.6, cy - size * 0.1, cx - size * 0.5, cy + size * 0.15);
  ctx.bezierCurveTo(cx - size * 0.2, cy + size * 0.05, cx, cy + size * 0.25, cx, cy);
  ctx.bezierCurveTo(cx, cy + size * 0.25, cx + size * 0.2, cy + size * 0.05, cx + size * 0.5, cy + size * 0.15);
  ctx.bezierCurveTo(cx + size * 0.6, cy - size * 0.1, cx + size * 0.4, cy - size * 0.3, cx, cy);
  ctx.closePath();
  ctx.fill();
}

function drawCrescentMoon(ctx: Ctx, cx: number, cy: number, radius: number, color: string, bgColor: string): void {
  // App composes with Path.op(DIFFERENCE); over the flat bg the identical
  // result is the offset cutout circle in the bg color.
  fillCircle(ctx, cx, cy, radius, color);
  fillCircle(ctx, cx - radius * 0.4, cy - radius * 0.25, radius * 0.85, bgColor);
}

function drawLantern(ctx: Ctx, cx: number, cy: number, size: number, color: string, width: number): void {
  line(ctx, cx, cy - size * 0.6, cx, cy - size * 0.3, color, width);
  fillRr(ctx, cx - size * 0.3, cy - size * 0.3, cx + size * 0.3, cy + size * 0.3, size * 0.1, size * 0.1, color);
  line(ctx, cx, cy + size * 0.3, cx, cy + size * 0.55, color, width);
}

function drawMapleLeaf(ctx: Ctx, cx: number, cy: number, radius: number, color: string): void {
  fillPoly(ctx, [
    [cx, cy - radius],
    [cx + radius * 0.3, cy - radius * 0.4],
    [cx + radius * 0.85, cy - radius * 0.3],
    [cx + radius * 0.45, cy + radius * 0.1],
    [cx + radius * 0.65, cy + radius * 0.6],
    [cx, cy + radius * 0.3],
    [cx - radius * 0.65, cy + radius * 0.6],
    [cx - radius * 0.45, cy + radius * 0.1],
    [cx - radius * 0.85, cy - radius * 0.3],
    [cx - radius * 0.3, cy - radius * 0.4],
  ], color);
}

function drawWaveRibbon(ctx: Ctx, width: number, y: number, color: string, lineWidth: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(0, y);
  const segments = 8;
  const segW = width / segments;
  for (let i = 0; i < segments; i++) {
    const startX = i * segW;
    const midX = startX + segW / 2;
    const endX = startX + segW;
    const amp = i % 2 === 0 ? width * 0.015 : -width * 0.015;
    ctx.quadraticCurveTo(midX, y + amp, endX, y);
  }
  ctx.stroke();
}

function drawSunFlower(ctx: Ctx, cx: number, cy: number, radius: number, petalColor: string, coreColor: string): void {
  for (let i = 0; i < 8; i++) {
    const angle = ((2 * Math.PI) / 8) * i;
    fillCircle(ctx, cx + Math.cos(angle) * radius * 0.6, cy + Math.sin(angle) * radius * 0.6, radius * 0.35, petalColor);
  }
  fillCircle(ctx, cx, cy, radius * 0.28, coreColor);
}

function drawLeafSprig(ctx: Ctx, cx: number, cy: number, size: number, rotAngle: number, color: string, width: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotAngle * Math.PI) / 180);
  line(ctx, 0, size * 0.5, 0, -size * 0.5, color, width);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(size * 0.2, -size * 0.25, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-size * 0.2, size * 0.05, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCornerArrow(ctx: Ctx, cx: number, cy: number, size: number, rotAngle: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotAngle * Math.PI) / 180);
  fillPoly(ctx, [
    [-size * 0.5, -size * 0.5],
    [0, 0],
    [-size * 0.5, size * 0.5],
    [-size * 0.25, size * 0.5],
    [size * 0.25, 0],
    [-size * 0.25, -size * 0.5],
  ], color);
  ctx.restore();
}

function drawVintageFiligree(ctx: Ctx, cx: number, cy: number, size: number, rotAngle: number, color: string, width: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotAngle * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.3, 0, size * 0.5, size * 0.2, size * 0.5, size * 0.5);
  ctx.bezierCurveTo(size * 0.5, size * 0.3, size * 0.3, size * 0.5, 0, size * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawHollyLeaves(ctx: Ctx, cx: number, cy: number, radius: number, leafColor: string, width: number): void {
  drawLeafSprig(ctx, cx, cy, radius, 30, leafColor, width);
  fillCircle(ctx, cx - radius * 0.15, cy, radius * 0.18, "#DC2626");
  fillCircle(ctx, cx + radius * 0.15, cy - radius * 0.1, radius * 0.18, "#DC2626");
  fillCircle(ctx, cx, cy + radius * 0.18, radius * 0.18, "#DC2626");
}

function drawWeddingRings(ctx: Ctx, cx: number, cy: number, radius: number, color: string, width: number): void {
  strokeCircle(ctx, cx - radius * 0.25, cy, radius * 0.45, color, width);
  strokeCircle(ctx, cx + radius * 0.25, cy, radius * 0.45, color, width);
}

/* ------------------------------------------------------------------ */
/* Border decorations — ports drawArtisticBorderDecorations            */
/* ------------------------------------------------------------------ */

const FRAME_DECOR = new Set([
  "note", "plaque", "pentagon", "hexagon", "bucket", "arch", "cup", "seal", "globe",
]);

export function drawTemplateDecor(ctx: Ctx, decor: string | undefined, s: number, fgColor: string, bgColor: string): void {
  if (!decor) return;
  const key = decor.toLowerCase();
  const cornerSize = s * 0.12;

  if (FRAME_DECOR.has(key)) {
    // Shared "stitched border around card" for the framed templates.
    strokeRr(ctx, s * 0.045, s * 0.045, s * 0.955, s * 0.955, s * 0.06, s * 0.06, fgColor, s * 0.007, [s * 0.015, s * 0.012]);
    return;
  }

  switch (key) {
    case "snowflakes": {
      const w = s * 0.008;
      drawSnowflake(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, "#60A5FA", w);
      drawSnowflake(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, "#60A5FA", w);
      drawSnowflake(ctx, s * 0.08, s * 0.92, cornerSize * 0.45, "#60A5FA", w);
      drawSnowflake(ctx, s * 0.92, s * 0.92, cornerSize * 0.45, "#60A5FA", w);
      drawSnowflake(ctx, s * 0.5, s * 0.05, cornerSize * 0.28, "#60A5FA", w);
      drawSnowflake(ctx, s * 0.5, s * 0.95, cornerSize * 0.28, "#60A5FA", w);
      break;
    }
    case "music": {
      const C = "#8B5CF6";
      drawMusicNote(ctx, s * 0.07, s * 0.07, cornerSize * 0.4, C);
      drawMusicNote(ctx, s * 0.93, s * 0.07, cornerSize * 0.35, C);
      drawDoubleMusicNote(ctx, s * 0.07, s * 0.93, cornerSize * 0.45, C);
      drawMusicNote(ctx, s * 0.93, s * 0.93, cornerSize * 0.4, C);
      drawMusicNote(ctx, s * 0.5, s * 0.05, cornerSize * 0.3, C);
      break;
    }
    case "stars":
    case "star": {
      const C = "#F59E0B";
      drawStarSparkle(ctx, s * 0.07, s * 0.07, cornerSize * 0.45, C);
      drawStarSparkle(ctx, s * 0.93, s * 0.07, cornerSize * 0.45, C);
      drawStarSparkle(ctx, s * 0.07, s * 0.93, cornerSize * 0.45, C);
      drawStarSparkle(ctx, s * 0.93, s * 0.93, cornerSize * 0.45, C);
      drawStarSparkle(ctx, s * 0.5, s * 0.05, cornerSize * 0.3, C);
      drawStarSparkle(ctx, s * 0.5, s * 0.95, cornerSize * 0.3, C);
      break;
    }
    case "floral":
    case "spring":
    case "sakura": {
      const C = "#F472B6";
      drawCherryBlossom(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, C);
      drawCherryBlossom(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, C);
      drawCherryBlossom(ctx, s * 0.08, s * 0.92, cornerSize * 0.45, C);
      drawCherryBlossom(ctx, s * 0.92, s * 0.92, cornerSize * 0.45, C);
      break;
    }
    case "love": {
      const C = "#FB7185";
      drawHeart(ctx, s * 0.07, s * 0.07, cornerSize * 0.4, C);
      drawHeart(ctx, s * 0.93, s * 0.07, cornerSize * 0.4, C);
      drawHeart(ctx, s * 0.07, s * 0.93, cornerSize * 0.4, C);
      drawHeart(ctx, s * 0.93, s * 0.93, cornerSize * 0.4, C);
      drawHeart(ctx, s * 0.5, s * 0.05, cornerSize * 0.28, C);
      drawHeart(ctx, s * 0.5, s * 0.95, cornerSize * 0.28, C);
      break;
    }
    case "halloween": {
      const w = s * 0.007;
      drawSpiderWeb(ctx, 0, 0, cornerSize * 0.8, "#F97316", w);
      drawSpiderWeb(ctx, s, 0, cornerSize * 0.8, "#F97316", w);
      drawBat(ctx, s * 0.12, s * 0.92, cornerSize * 0.5, "#F97316");
      drawBat(ctx, s * 0.88, s * 0.92, cornerSize * 0.5, "#F97316");
      break;
    }
    case "ramadan":
    case "night-sky": {
      const C = "#FBBF24";
      drawCrescentMoon(ctx, s * 0.90, s * 0.09, cornerSize * 0.45, C, bgColor);
      drawLantern(ctx, s * 0.10, s * 0.08, cornerSize * 0.45, C, s * 0.012);
      drawStarSparkle(ctx, s * 0.08, s * 0.92, cornerSize * 0.35, C);
      drawStarSparkle(ctx, s * 0.92, s * 0.92, cornerSize * 0.35, C);
      break;
    }
    case "autumn": {
      const C = "#D97706";
      drawMapleLeaf(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, C);
      drawMapleLeaf(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, C);
      drawMapleLeaf(ctx, s * 0.08, s * 0.92, cornerSize * 0.45, C);
      drawMapleLeaf(ctx, s * 0.92, s * 0.92, cornerSize * 0.45, C);
      break;
    }
    case "ocean":
      drawWaveRibbon(ctx, s, s * 0.04, "#38BDF8", s * 0.012);
      drawWaveRibbon(ctx, s, s * 0.96, "#38BDF8", s * 0.012);
      break;
    case "summer":
      drawSunFlower(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, "#F59E0B", "#78350F");
      drawSunFlower(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, "#F59E0B", "#78350F");
      drawWaveRibbon(ctx, s, s * 0.96, "#0284C7", s * 0.01);
      break;
    case "nature": {
      const w = s * 0.01;
      drawLeafSprig(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, 45, "#22C55E", w);
      drawLeafSprig(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, -45, "#22C55E", w);
      drawLeafSprig(ctx, s * 0.08, s * 0.92, cornerSize * 0.45, 135, "#22C55E", w);
      drawLeafSprig(ctx, s * 0.92, s * 0.92, cornerSize * 0.45, -135, "#22C55E", w);
      break;
    }
    case "arrows": {
      const C = "#FB7185";
      drawCornerArrow(ctx, s * 0.06, s * 0.06, cornerSize * 0.4, 45, C);
      drawCornerArrow(ctx, s * 0.94, s * 0.06, cornerSize * 0.4, 135, C);
      drawCornerArrow(ctx, s * 0.06, s * 0.94, cornerSize * 0.4, -45, C);
      drawCornerArrow(ctx, s * 0.94, s * 0.94, cornerSize * 0.4, -135, C);
      break;
    }
    case "dot-ring": {
      const dotColors = ["#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#F59E0B"];
      const cx = s / 2;
      const cy = s / 2;
      const radius = s * 0.46;
      for (let i = 0; i < 28; i++) {
        const angle = ((2 * Math.PI) / 28) * i;
        fillCircle(ctx, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, s * 0.012, dotColors[i % dotColors.length]);
      }
      break;
    }
    case "vintage": {
      const w = s * 0.008;
      drawVintageFiligree(ctx, s * 0.06, s * 0.06, cornerSize * 0.5, 0, "#78350F", w);
      drawVintageFiligree(ctx, s * 0.94, s * 0.06, cornerSize * 0.5, 90, "#78350F", w);
      drawVintageFiligree(ctx, s * 0.94, s * 0.94, cornerSize * 0.5, 180, "#78350F", w);
      drawVintageFiligree(ctx, s * 0.06, s * 0.94, cornerSize * 0.5, 270, "#78350F", w);
      break;
    }
    case "christmas": {
      const w = s * 0.01;
      drawHollyLeaves(ctx, s * 0.08, s * 0.08, cornerSize * 0.45, "#16A34A", w);
      drawHollyLeaves(ctx, s * 0.92, s * 0.08, cornerSize * 0.45, "#16A34A", w);
      drawHollyLeaves(ctx, s * 0.08, s * 0.92, cornerSize * 0.45, "#16A34A", w);
      drawHollyLeaves(ctx, s * 0.92, s * 0.92, cornerSize * 0.45, "#16A34A", w);
      break;
    }
    case "wedding": {
      const w = s * 0.008;
      drawWeddingRings(ctx, s * 0.08, s * 0.08, cornerSize * 0.4, "#BE185D", w);
      drawWeddingRings(ctx, s * 0.92, s * 0.08, cornerSize * 0.4, "#BE185D", w);
      drawHeart(ctx, s * 0.08, s * 0.92, cornerSize * 0.35, "#BE185D");
      drawHeart(ctx, s * 0.92, s * 0.92, cornerSize * 0.35, "#BE185D");
      break;
    }
    default:
      // "birthday", "speech", "diamond", … carry no border art in the app.
      break;
  }
}
