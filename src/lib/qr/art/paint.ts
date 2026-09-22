/**
 * ART QR STYLE SYSTEM — Canvas2D painter.
 *
 * Consumes an `ArtPlan` and paints it into a CanvasRenderingContext2D. This is
 * what the studio preview, the PNG export and the preset thumbnails all use.
 * The node harness uses `rasterize.ts` on the same plan, so the bitmap that
 * gets validated is the bitmap that gets shipped.
 *
 * The `effect` option renders the Tune panel's "Kernel effect" choices for
 * art directions too: cheap full-plan silhouette passes run under the ink
 * (shadow / glow / emboss / extrude) or a keyline stroke runs over it
 * (outline), all scaled by the cell so the look is resolution-independent.
 */

import { canvasFill, type GradientField } from "./colors";
import { shapePrim, tracePath } from "./geometry";
import type { ArtPlan } from "./art-plan";
import type { QrEffect } from "../types";

export interface PaintOptions {
  /** Skip the paper rect (the caller already painted a background). */
  skipPaper?: boolean;
  /** Tune-panel effect to apply under/over the ink. */
  effect?: QrEffect;
}

/** Roles that are real ink — used for silhouette (shadow/glow/emboss) passes. */
const INK_ROLES: ReadonlySet<ArtPlan["paints"][number]["role"]> = new Set([
  "data",
  "accent",
  "finder",
  "timing",
  "alignment",
  "format",
]);

export function paintArtPlan(
  ctx: CanvasRenderingContext2D,
  plan: ArtPlan,
  opts: PaintOptions = {},
): void {
  const field: GradientField = {
    x0: plan.origin,
    y0: plan.origin,
    size: plan.modules * plan.cell,
  };
  const cell = plan.cell;
  const effect: QrEffect = opts.effect ?? "none";
  const canFilter = typeof (ctx as CanvasRenderingContext2D & { filter?: unknown }).filter === "string";

  /** Offset copy of the ink silhouette, optionally blurred. */
  const silhouette = (dx: number, dy: number, color: string, blurPx = 0) => {
    ctx.save();
    ctx.fillStyle = color;
    if (blurPx > 0 && canFilter) {
      (ctx as CanvasRenderingContext2D & { filter: string }).filter = `blur(${blurPx.toFixed(2)}px)`;
    }
    ctx.translate(dx, dy);
    for (const p of plan.paints) {
      if (!INK_ROLES.has(p.role)) continue;
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.w, p.h);
      ctx.fill();
    }
    ctx.restore();
  };

  // Silhouettes must sit ON TOP of the paper but UNDER the ink, so when the
  // caller lets us paint the paper we pull that rect out first.
  const prePaintedPaper = effect !== "none" && effect !== "outline" && !opts.skipPaper;
  if (prePaintedPaper) {
    for (const p of plan.paints) {
      if (p.role !== "paper") continue;
      ctx.fillStyle = canvasFill(ctx, p.fill, field);
      tracePath(ctx, shapePrim(p));
      ctx.fill();
    }
  }

  if (effect === "shadow") {
    silhouette(0, cell * 0.22, "rgba(4,5,9,0.34)", cell * 0.45);
  } else if (effect === "glow") {
    silhouette(0, 0, "rgba(255,214,140,0.42)", cell * 0.85);
    silhouette(0, 0, "rgba(255,214,140,0.3)", cell * 0.3);
  } else if (effect === "emboss") {
    silhouette(-cell * 0.085, -cell * 0.085, "rgba(255,255,255,0.7)");
    silhouette(cell * 0.09, cell * 0.09, "rgba(6,7,11,0.5)");
  } else if (effect === "extrude") {
    for (let k = 3; k >= 1; k--) {
      silhouette(cell * 0.085 * k, cell * 0.115 * k, "rgba(12,13,18,0.55)");
    }
  }

  for (const paint of plan.paints) {
    if ((opts.skipPaper || prePaintedPaper) && paint.role === "paper") continue;
    ctx.fillStyle = canvasFill(ctx, paint.fill, field);
    tracePath(ctx, shapePrim(paint));
    ctx.fill();
  }

  if (effect === "outline") {
    // Keyline every ink shape. Dark paper gets a light keyline, light paper a
    // dark one — same trick the flat renderer uses, so an outline never
    // disappears into the surface it sits on.
    const dark = isDarkPaper(plan);
    ctx.save();
    ctx.lineWidth = Math.max(1, cell * 0.06);
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.5)" : "rgba(8,9,13,0.5)";
    for (const p of plan.paints) {
      if (!INK_ROLES.has(p.role)) continue;
      tracePath(ctx, shapePrim(p));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function isDarkPaper(plan: ArtPlan): boolean {
  const hex = plan.paper;
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const l = (parseInt(m[1]!, 16) * 299 + parseInt(m[2]!, 16) * 587 + parseInt(m[3]!, 16) * 114) / 255000;
  return l < 0.42;
}
