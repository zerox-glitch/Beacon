/**
 * ART QR STYLE SYSTEM — shared geometry.
 *
 * Every paint primitive in an `ArtPlan` is reduced here to one of exactly
 * three geometric forms:
 *
 *   • `rrect`  — a box with four independent corner radii
 *   • `circle` — an ellipse in a box
 *   • `poly`   — a closed polygon, optionally corner-rounded
 *
 * Two painters consume them: the Canvas2D painter (studio preview, PNG/SVG
 * export) and the pure typed-array rasterizer (node validation harness). Same
 * geometry in, same picture out — that is what makes an offline camera-battery
 * test a trustworthy prediction of what a phone camera will see.
 */

import { hash2 } from "./noise";
import type { Paint } from "./art-plan";

export interface RRectPrim {
  kind: "rrect";
  x: number;
  y: number;
  w: number;
  h: number;
  /** [tl, tr, br, bl] in pixels. */
  r: [number, number, number, number];
}

export interface CirclePrim {
  kind: "circle";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PolyPrim {
  kind: "poly";
  /** Flat [x0,y0,x1,y1,…] in pixels. */
  pts: number[];
  /** Uniform corner rounding in pixels (0 = sharp). */
  round: number;
}

export type Prim = RRectPrim | CirclePrim | PolyPrim;

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function rr(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | [number, number, number, number],
): RRectPrim {
  const radii: [number, number, number, number] =
    typeof r === "number" ? [r, r, r, r] : [r[0], r[1], r[2], r[3]];
  const max = Math.min(w, h) / 2;
  return {
    kind: "rrect",
    x,
    y,
    w,
    h,
    r: [
      clamp(radii[0], 0, max),
      clamp(radii[1], 0, max),
      clamp(radii[2], 0, max),
      clamp(radii[3], 0, max),
    ],
  };
}

function ellipse(x: number, y: number, w: number, h: number): CirclePrim {
  return { kind: "circle", cx: x + w / 2, cy: y + h / 2, rx: Math.max(0.01, w / 2), ry: Math.max(0.01, h / 2) };
}

function poly(pts: number[], round = 0): PolyPrim {
  return { kind: "poly", pts, round };
}

function regularPolygon(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  rot = 0,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return pts;
}

/** Superellipse — the honest squircle / pebble silhouette. */
function superellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  k: number,
  n = 26,
  rot = 0,
): number[] {
  const pts: number[] = [];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x = rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / k);
    const y = ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / k);
    pts.push(cx + x * cos - y * sin, cy + x * sin + y * cos);
  }
  return pts;
}

function starPolygon(cx: number, cy: number, rx: number, ry: number, points: number, inner: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const k = i % 2 === 0 ? 1 : inner;
    pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  }
  return pts;
}

function heartPolygon(cx: number, cy: number, w: number, h: number): number[] {
  const pts: number[] = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = (i * Math.PI * 2) / n;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const x = 16 * s * s * s;
    const y = -(13 * c - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push(cx + (x / 17) * (w / 2), cy + (y / 17.5) * (h / 2));
  }
  return pts;
}

/** Two arcs of different radius meeting at the tips — a leaf / petal. */
function petalPolygon(cx: number, cy: number, w: number, h: number, rot: number): number[] {
  const pts: number[] = [];
  const n = 22;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const t = (i * Math.PI * 2) / n;
    const k = Math.abs(Math.sin(t));
    const x = (w / 2) * Math.cos(t);
    const y = (h / 2) * Math.sin(t) * (0.55 + 0.45 * k);
    pts.push(cx + x * cos - y * sin, cy + x * sin + y * cos);
  }
  return pts;
}

function facetPolygon(cx: number, cy: number, w: number, h: number, rot: number): number[] {
  const base: [number, number][] = [
    [0, -h / 2],
    [w / 2, -h * 0.1],
    [0, h / 2],
    [-w / 2, -h * 0.1],
  ];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: number[] = [];
  for (const [x, y] of base) pts.push(cx + x * cos - y * sin, cy + x * sin + y * cos);
  return pts;
}

function plusPolygon(x: number, y: number, w: number, h: number): number[] {
  const t = 0.36;
  const ox = x + w * ((1 - t) / 2);
  const oy = y + h * ((1 - t) / 2);
  const tw = w * t;
  const th = h * t;
  return [
    ox, oy,
    ox + tw, oy,
    ox + tw, y,
    x + w, y,
    x + w, oy,
    ox + tw, oy,
    ox + tw, oy + th,
    x + w, oy + th,
    x + w, y + h,
    ox + tw, y + h,
    ox + tw, oy + th,
    ox, oy + th,
    ox, y + h,
    x, y + h,
    x, oy + th,
    ox, oy + th,
    ox, oy,
    x, oy,
    x, y,
    ox, y,
  ];
}

/**
 * A plus rotated 45° — the "cross" module, as one simple 12-gon: four axis
 * dips (the concave points between bars) plus the eight bar-end corners,
 * ordered by angle so the outline stays star-shaped from the centre. Bar
 * length/thickness mirror the standard renderer's cross (0.92 cell long,
 * 0.48 thick) and the whole figure stays inside its own cell.
 */
function crossPolygon(x: number, y: number, w: number, h: number): number[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const m = Math.min(w, h);
  const a = m * 0.24; // half bar thickness
  const L = m * 0.46; // half bar length
  const q = a * Math.SQRT2; // concave dip depth (distance from each bar axis)
  const pts: [number, number][] = [
    [cx, cy - q],
    [cx + q, cy],
    [cx, cy + q],
    [cx - q, cy],
  ];
  // Two crossing bars: axis direction + perpendicular, each contributing its
  // four end corners (both ends, both sides).
  const bars: [readonly [number, number], readonly [number, number]][] = [
    [[1, 1], [1, -1]],
    [[1, -1], [1, 1]],
  ];
  for (const [u, n] of bars) {
    const ux = u[0]! * Math.SQRT1_2;
    const uy = u[1]! * Math.SQRT1_2;
    const nx = n[0]! * Math.SQRT1_2;
    const ny = n[1]! * Math.SQRT1_2;
    for (const e of [1, -1] as const) {
      for (const s of [1, -1] as const) {
        pts.push([cx + e * L * ux + s * a * nx, cy + e * L * uy + s * a * ny]);
      }
    }
  }
  pts.sort((p1, p2) => Math.atan2(p1[1]! - cy, p1[0]! - cx) - Math.atan2(p2[1]! - cy, p2[0]! - cx));
  return pts.flat();
}

/**
 * Reduce one paint to geometry. `gx`/`gy` (module coordinates) drive only
 * deterministic per-cell variation — never colour, never structure.
 */
export function shapePrim(paint: Paint): Prim {
  const { x, y, w, h, gx, gy } = paint;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = paint.r ?? 0;

  switch (paint.shape) {
    case "circle":
      return ellipse(x, y, w, h);
    case "poly":
      return poly(paint.pts ?? [x, y, x + w, y, x + w, y + h, x, y + h], 0);
    case "capsule":
      return rr(x, y, w, h, Math.min(w, h) / 2);
    case "diamond":
      return poly([cx, y, x + w, cy, cx, y + h, x, cy], r * 0.6);
    case "hex":
      return poly(regularPolygon(cx, cy, w / 2, h / 2, 6, 0), r * 0.5);
    case "star":
      return poly(starPolygon(cx, cy, w / 2, h / 2, 5, 0.46), 0);
    case "plus":
      return poly(plusPolygon(x, y, w, h), r * 0.4);
    case "leaf":
      // Two rounded + two sharp corners: a leaf silhouette that is always a
      // simple, convex-ish region (self-touching petal curves produced hairline
      // cracks under camera downsampling).
      return rr(x, y, w, h, [r, 0, r, 0]);
    case "petal": {
      // Mirrored leaves give the floral variety without risky geometry.
      const mirrored = hash2(gx, gy) % 2 === 0;
      return rr(x, y, w, h, mirrored ? [r, 0, r, 0] : [0, r, 0, r]);
    }
    case "heart":
      return poly(heartPolygon(cx, cy, w, h), 0);
    case "pebble": {
      const k = 2.6 + ((hash2(gx, gy) % 60) / 100) * 0.8;
      const rot = (((hash2(gy, gx) % 100) / 100) * Math.PI) / 6 - Math.PI / 12;
      return poly(superellipse(cx, cy, w / 2, h / 2, k, 26, rot), 0);
    }
    case "gem":
      return poly(regularPolygon(cx, cy, w / 2, h / 2, 8, paint.rot ?? 0), r * 0.4);
    case "facet":
      return poly(facetPolygon(cx, cy, w, h, paint.rot ?? 0), 0);
    case "bar": {
      const thickness = Math.min(w, h) * (paint.barThick ?? 0.52);
      if (paint.rot === undefined) {
        return paint.vertical
          ? rr(cx - thickness / 2, y, thickness, h, thickness / 2)
          : rr(x, cy - thickness / 2, w, thickness, thickness / 2);
      }
      // Rotated bar (Streak / Confetti): the slab's four corners swung about
      // the cell centre; a little corner rounding keeps the soft end caps.
      const len = paint.vertical ? h : w;
      const ux = paint.vertical ? 0 : 1;
      const uy = paint.vertical ? 1 : 0;
      const nx = -uy;
      const ny = ux;
      const cos = Math.cos(paint.rot);
      const sin = Math.sin(paint.rot);
      const a = thickness / 2;
      const half = len / 2;
      const corners: [number, number][] = [
        [ux * half + nx * a, uy * half + ny * a],
        [ux * half - nx * a, uy * half - ny * a],
        [-ux * half - nx * a, -uy * half - ny * a],
        [-ux * half + nx * a, -uy * half + ny * a],
      ];
      const pts: number[] = [];
      for (const [sx, sy] of corners) pts.push(cx + sx * cos - sy * sin, cy + sx * sin + sy * cos);
      return poly(pts, thickness * 0.3);
    }
    case "cross":
      return poly(crossPolygon(x, y, w, h), Math.min(w, h) * 0.06);
    case "rrect":
    default:
      return rr(x, y, w, h, paint.corners ?? r);
  }
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Bounding box of a primitive — lets the rasterizer skip whole rows. */
export function primBounds(p: Prim): Bounds {
  if (p.kind === "circle") {
    return { x0: p.cx - p.rx, y0: p.cy - p.ry, x1: p.cx + p.rx, y1: p.cy + p.ry };
  }
  if (p.kind === "rrect") return { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < p.pts.length; i += 2) {
    const px = p.pts[i]!;
    const py = p.pts[i + 1]!;
    if (px < x0) x0 = px;
    if (py < y0) y0 = py;
    if (px > x1) x1 = px;
    if (py > y1) y1 = py;
  }
  return { x0: x0 - p.round, y0: y0 - p.round, x1: x1 + p.round, y1: y1 + p.round };
}

/* ------------------------------------------------------------------ *
 * Exact signed-distance math (the rasterizer's coverage source)
 * ------------------------------------------------------------------ */

function cornerRegions(px: number, py: number, b: RRectPrim): { cx: number; cy: number; r: number } | null {
  const { x, y, w, h, r } = b;
  if (px < x + r[0] && py < y + r[0] && r[0] > 0) return { cx: x + r[0], cy: y + r[0], r: r[0] };
  if (px > x + w - r[1] && py < y + r[1] && r[1] > 0) return { cx: x + w - r[1], cy: y + r[1], r: r[1] };
  if (px > x + w - r[2] && py > y + h - r[2] && r[2] > 0) return { cx: x + w - r[2], cy: y + h - r[2], r: r[2] };
  if (px < x + r[3] && py > y + h - r[3] && r[3] > 0) return { cx: x + r[3], cy: y + h - r[3], r: r[3] };
  return null;
}

/** Signed distance to a rounded box; negative inside. */
export function sdRRect(px: number, py: number, b: RRectPrim): number {
  const corner = cornerRegions(px, py, b);
  if (corner) return Math.hypot(px - corner.cx, py - corner.cy) - corner.r;
  // Straight-edge region: standard rounded-box SDF with the mean radius.
  const r = (b.r[0] + b.r[1] + b.r[2] + b.r[3]) / 4;
  const dx = Math.abs(px - (b.x + b.w / 2)) - b.w / 2 + r;
  const dy = Math.abs(py - (b.y + b.h / 2)) - b.h / 2 + r;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  const outside = Math.hypot(ax, ay);
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - r;
}

export function sdCircle(px: number, py: number, c: CirclePrim): number {
  const dx = (px - c.cx) / c.rx;
  const dy = (py - c.cy) / c.ry;
  return (Math.hypot(dx, dy) - 1) * Math.min(c.rx, c.ry);
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function pointInPoly(px: number, py: number, pts: number[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i]!;
    const yi = pts[i + 1]!;
    const xj = pts[j]!;
    const yj = pts[j + 1]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function sdPoly(px: number, py: number, p: PolyPrim): number {
  let d = Infinity;
  for (let i = 0, j = p.pts.length - 2; i < p.pts.length; j = i, i += 2) {
    d = Math.min(d, distToSegment(px, py, p.pts[i]!, p.pts[i + 1]!, p.pts[j]!, p.pts[j + 1]!));
  }
  const inside = pointInPoly(px, py, p.pts);
  const signed = inside ? -d : d;
  if (p.round > 0) return signed > 0 ? signed - p.round : signed;
  return signed;
}

export function sdPrim(px: number, py: number, prim: Prim): number {
  if (prim.kind === "rrect") return sdRRect(px, py, prim);
  if (prim.kind === "circle") return sdCircle(px, py, prim);
  return sdPoly(px, py, prim);
}

/* ------------------------------------------------------------------ *
 * Canvas2D path tracing (the studio painter)
 * ------------------------------------------------------------------ */

export function tracePath(ctx: CanvasRenderingContext2D, prim: Prim): void {
  ctx.beginPath();
  if (prim.kind === "circle") {
    ctx.save();
    ctx.translate(prim.cx, prim.cy);
    ctx.scale(prim.rx, prim.ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
    return;
  }
  if (prim.kind === "rrect") {
    const { x, y, w, h, r } = prim;
    const uniform = r[0] === r[1] && r[1] === r[2] && r[2] === r[3];
    const roundRect = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, rad: number) => void })
      .roundRect;
    if (uniform && typeof roundRect === "function") {
      roundRect.call(ctx, x, y, w, h, r[0]);
      return;
    }
    ctx.moveTo(x + r[0], y);
    ctx.lineTo(x + w - r[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    ctx.lineTo(x + w, y + h - r[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    ctx.lineTo(x + r[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    ctx.lineTo(x, y + r[0]);
    ctx.quadraticCurveTo(x, y, x + r[0], y);
    ctx.closePath();
    return;
  }
  const pts = prim.pts;
  const n = pts.length / 2;
  if (prim.round <= 0 || n < 3) {
    ctx.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
    ctx.closePath();
    return;
  }
  for (let i = 0; i < n; i++) {
    const cur = i * 2;
    const next = ((i + 1) % n) * 2;
    const prev = ((i - 1 + n) % n) * 2;
    if (i === 0) {
      ctx.moveTo((pts[cur]! + pts[next]!) / 2, (pts[cur + 1]! + pts[next + 1]!) / 2);
    }
    ctx.arcTo(
      pts[next]!,
      pts[next + 1]!,
      (pts[next]! + pts[prev]!) / 2,
      (pts[next + 1]! + pts[prev + 1]!) / 2,
      prim.round,
    );
  }
  ctx.closePath();
}
