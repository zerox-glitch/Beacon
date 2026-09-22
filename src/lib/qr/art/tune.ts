/**
 * ART QR STYLE SYSTEM — Tune-panel ⇄ art-direction bridge.
 *
 * Art directions own their palette, shape and rhythm; the Tune panel edits a
 * `QrStyle`. `tuneDirection` maps the latter onto the former so template
 * presets react to the controls (colors, gradient, shape, gap, quiet-zone
 * handled in `buildArtPlan`) without re-deciding anything the user did not
 * touch.
 *
 * The round trip is safe because `artDirectionPresets()` seeds every preset's
 * style with the direction's own resolved values — applying a preset is
 * therefore a no-op through this function, and only real edits change anything.
 * Everything lands back inside `resolveInks`, so the COLOR RULES luminance
 * repair still guarantees contrast between ink and paper.
 *
 * This module is a leaf on purpose (types only) so node can unit-test it.
 */

import { MODULE_SHAPES } from "../types.ts";
import type { ArtDirection, ArtShape, QrStyle } from "../types.ts";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Accept only "#rrggbb" — the pickers emit exactly that, anything else (or a
 * broken admin template JSON) must not clobber the direction's own colors. */
function hex(v: string | undefined | null): string | null {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : null;
}

export function tuneDirection(dir: ArtDirection, style: QrStyle): ArtDirection {
  const patch: Partial<ArtDirection> = {};
  const fg = hex(style.fg);
  const wantGrad =
    style.gradientType === "linear" || style.gradientType === "diagonal" || style.gradientType === "radial";
  if (fg) {
    // "Gradient second stop" only edits the ramp when the picker is actually
    // driving a gradient; otherwise the direction's own pairing survives.
    const to = wantGrad ? (hex(style.gradientTo) ?? fg) : null;
    patch.stops = to ? [fg, to] : [fg, ...dir.stops.slice(1)];
  }
  if (wantGrad) {
    patch.gradient =
      style.gradientType === "linear"
        ? // "Linear" keeps a linear-y direction flowing vertically — the picker
          // has one word for both axes, so the direction decides which.
          dir.gradient === "linear-y"
          ? "linear-y"
          : "linear-x"
        : style.gradientType === "radial"
          ? "radial"
          : "diagonal";
  } else if (style.gradientType === "none") {
    // "None" can only switch OFF a gradient the picker also offers. Patterns
    // the picker cannot name (ramp/spectrum/bands) are the direction's own
    // artistry and survive until the user picks a gradient of their own.
    const pickerGradients: readonly string[] = ["linear-x", "linear-y", "diagonal", "radial"];
    if (pickerGradients.includes(dir.gradient)) patch.gradient = "none";
  }
  const bg = hex(style.bg);
  if (bg) patch.bg = bg;
  const eye = hex(style.eyeColor);
  if (eye) patch.eye = eye;
  const ball = hex(style.ballColor);
  if (ball) patch.ball = ball;
  // Shapes: directions may use art-only silhouettes the picker cannot name.
  // When the direction's native shape is outside the picker's vocabulary, the
  // preset seeds "square" as a placeholder — treat that value as "no
  // preference" so applying a preset never flattens a petal direction.
  const dirShapeKnown = (MODULE_SHAPES as readonly { id: string }[]).some((m) => m.id === dir.shape);
  if (style.moduleShape && (dirShapeKnown || style.moduleShape !== "square")) {
    patch.shape = style.moduleShape as ArtShape;
  }
  if (typeof style.moduleGap === "number" && Number.isFinite(style.moduleGap)) {
    patch.gap = clamp(style.moduleGap, 0, 0.18);
  }
  return Object.keys(patch).length ? { ...dir, ...patch } : dir;
}
