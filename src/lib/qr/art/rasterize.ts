/**
 * ART QR STYLE SYSTEM — pure rasterizer.
 *
 * Paints an `ArtPlan` into an RGBA `Bitmap` with signed-distance coverage and
 * no DOM at all. This is the half that lets the whole style system be
 * validated offline: `node --test` can render all fifty directions, run the
 * camera-stress battery over them and decode with jsQR, exactly the way the
 * studio's own verification pass does in the browser.
 *
 * Anti-aliasing: 2×2 supersampling per output pixel, coverage from the exact
 * signed distance of each primitive. Painter order is plan order, so the
 * raster matches Canvas2D's `fill()` sequence.
 */

import { hexToRgb } from "../art-directions";
import { sampleFill, type GradientField } from "./colors";
import { primBounds, sdPrim, shapePrim, type Prim } from "./geometry";
import type { Bitmap } from "../photo/imaging";
import type { ArtPlan, Paint } from "./art-plan";

export interface RasterOptions {
  /** Supersamples per output pixel edge (2 = 2×2 = 4 taps). */
  ss?: number;
}

interface Item {
  prim: Prim;
  paint: Paint;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  rgb: [number, number, number] | null;
  fill: Paint["fill"];
}

export function rasterizeArtPlan(plan: ArtPlan, opts: RasterOptions = {}): Bitmap {
  const n = plan.px;
  const ss = opts.ss ?? 2;
  const data = new Uint8ClampedArray(n * n * 4);
  const field: GradientField = {
    x0: plan.origin,
    y0: plan.origin,
    size: plan.modules * plan.cell,
  };

  // Pre-resolve geometry, bounds and (for solid fills) colour once per paint.
  const items: Item[] = plan.paints.map((paint) => {
    const prim = shapePrim(paint);
    const b = primBounds(prim);
    const solid = paint.fill.kind === "solid" ? hexToRgb(paint.fill.stops[0]!) : null;
    return { prim, paint, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, rgb: solid, fill: paint.fill };
  });

  // Row buckets: for each output row, only the paints that can touch it.
  const buckets: Item[][] = Array.from({ length: n }, () => []);
  for (const it of items) {
    const r0 = Math.max(0, Math.floor(it.y0));
    const r1 = Math.min(n - 1, Math.ceil(it.y1));
    for (let y = r0; y <= r1; y++) buckets[y]!.push(it);
  }

  const step = 1 / ss;
  const offs: number[] = [];
  for (let i = 0; i < ss; i++) offs.push((i + 0.5) * step);
  const taps = ss * ss;
  // Coverage falls off over ~1 device pixel — one supersample step wide.
  const aa = step;

  for (let y = 0; y < n; y++) {
    const row = buckets[y]!;
    for (let x = 0; x < n; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let painted = false;

      // Painter's algorithm, walked top-down: the last paint in the plan is
      // the topmost layer, so we composite it first and let whatever is
      // underneath show through the part it does not cover. Once the
      // accumulated alpha is opaque nothing below can contribute, which is
      // where the early exit comes from — an exit that is *correct*, unlike
      // stopping at the first opaque paint in plan order.
      for (let idx = row.length - 1; idx >= 0; idx--) {
        const it = row[idx]!;
        if (it.x1 < x || it.x0 > x + 1) continue;
        let cover = 0;
        for (const oy of offs) {
          const py = y + oy;
          if (py < it.y0 || py > it.y1) continue;
          for (const ox of offs) {
            const px = x + ox;
            if (px < it.x0 || px > it.x1) continue;
            const d = sdPrim(px, py, it.prim);
            if (d <= -aa) cover += 1;
            else if (d < aa) cover += 0.5 - d / (2 * aa);
          }
        }
        cover /= taps;
        if (cover <= 0) continue;

        const rgb = it.rgb ?? hexToRgb(sampleFill(it.fill, x + 0.5, y + 0.5, field));
        // Walking top→bottom: whatever has accumulated so far is the ink
        // ABOVE this layer, so this layer only shows through where the ink
        // above is transparent.
        const wgt = cover * (1 - a);
        r += rgb[0] * wgt;
        g += rgb[1] * wgt;
        b += rgb[2] * wgt;
        a += wgt;
        painted = true;
        if (a > 0.9995) break;
      }

      const i = (y * n + x) * 4;
      data[i] = painted ? r : 0;
      data[i + 1] = painted ? g : 0;
      data[i + 2] = painted ? b : 0;
      data[i + 3] = 255;
    }
  }

  return { data, w: n, h: n };
}
