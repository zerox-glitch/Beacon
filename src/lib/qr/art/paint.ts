/**
 * ART QR STYLE SYSTEM — Canvas2D painter.
 *
 * Consumes an `ArtPlan` and paints it into a CanvasRenderingContext2D. This is
 * what the studio preview, the PNG export and the preset thumbnails all use.
 * The node harness uses `rasterize.ts` on the same plan, so the bitmap that
 * gets validated is the bitmap that gets shipped.
 */

import { canvasFill, type GradientField } from "./colors";
import { shapePrim, tracePath } from "./geometry";
import type { ArtPlan } from "./art-plan";

export interface PaintOptions {
  /** Skip the paper rect (the caller already painted a background). */
  skipPaper?: boolean;
}

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

  for (const paint of plan.paints) {
    if (opts.skipPaper && paint.role === "paper") continue;
    ctx.fillStyle = canvasFill(ctx, paint.fill, field);
    tracePath(ctx, shapePrim(paint));
    ctx.fill();
  }
}
