/**
 * Fill evaluation for the art system — shared by the Canvas2D painter and the
 * pure rasterizer so a gradient is the same colour in both.
 *
 * Gradients are defined over the QR BODY (not per primitive): a spectrum is a
 * property of place, which is what stops 50 directions from collapsing into
 * 50 flat colour swaps.
 */

import { hexToRgb } from "../art-directions";
import { clamp } from "./noise";
import type { FillSpec } from "./art-plan";

export interface GradientField {
  /** Body origin and size in device pixels. */
  x0: number;
  y0: number;
  size: number;
}

export function sampleFill(fill: FillSpec, px: number, py: number, field: GradientField): string {
  if (fill.kind === "solid") return fill.stops[0]!;
  const stops = fill.stops.length > 1 ? fill.stops : [fill.stops[0]!, fill.stops[0]!];
  let t: number;
  if (fill.kind === "radial") {
    const cx = field.x0 + field.size / 2;
    const cy = field.y0 + field.size / 2;
    t = Math.hypot(px - cx, py - cy) / (field.size * 0.72);
  } else {
    const u = (px - field.x0) / Math.max(1, field.size);
    const v = (py - field.y0) / Math.max(1, field.size);
    t = fill.axis === "x" ? u : fill.axis === "y" ? v : (u + v) / 2;
  }
  return rampAt(stops, clamp(t, 0, 1));
}

export function rampAt(stops: string[], t: number): string {
  if (stops.length === 1) return stops[0]!;
  const pos = clamp(t, 0, 0.99999) * (stops.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const a = hexToRgb(stops[i]!);
  const b = hexToRgb(stops[Math.min(stops.length - 1, i + 1)]!);
  const hex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${hex(a[0] + (b[0] - a[0]) * f)}${hex(a[1] + (b[1] - a[1]) * f)}${hex(a[2] + (b[2] - a[2]) * f)}`;
}

/** Canvas gradient object matching `sampleFill` exactly. */
export function canvasFill(
  ctx: CanvasRenderingContext2D,
  fill: FillSpec,
  field: GradientField,
): string | CanvasGradient {
  if (fill.kind === "solid") return fill.stops[0]!;
  const stops = fill.stops;
  const gx0 = field.x0;
  const gy0 = field.y0;
  let gx1 = field.x0 + field.size;
  let gy1 = field.y0;
  if (fill.kind === "radial") {
    // handled below
  } else if (fill.axis === "y") {
    gx1 = field.x0;
    gy1 = field.y0 + field.size;
  } else if (fill.axis === "d") {
    gx1 = field.x0 + field.size;
    gy1 = field.y0 + field.size;
  }
  const g =
    fill.kind === "radial"
      ? ctx.createRadialGradient(
          field.x0 + field.size / 2,
          field.y0 + field.size / 2,
          0,
          field.x0 + field.size / 2,
          field.y0 + field.size / 2,
          field.size * 0.72,
        )
      : ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  const n = stops.length;
  stops.forEach((s, i) => g.addColorStop(n === 1 ? 0 : i / (n - 1), s));
  return g;
}
