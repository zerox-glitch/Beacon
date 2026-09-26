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
import type { ArtDirection, ArtShape, EyeShape, QrStyle } from "../types.ts";
import { safeFinder } from "./finder-battery.ts";

// Picker values that mean "no preference" for the art pipeline UNLESS the
// user explicitly picked them (style.eyePicked / style.ballPicked): "square"
// is the preset seed placeholder, and "extra-rounded" is DEFAULT_STYLE's
// classic default — styles built the classic way (and legacy saves) must
// keep rendering the template's own finder.
const NO_PREFERENCE_EYES: readonly EyeShape[] = ["square", "extra-rounded"];

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
  // A pick is "explicit" when it differs from the direction's own shape, or
  // when the Design tab recorded an actual click (style.modulePicked) — the
  // marker also honours a Square pick on a template whose seed is "square".
  const dirShapeKnown = (MODULE_SHAPES as readonly { id: string }[]).some((m) => m.id === dir.shape);
  if (
    style.moduleShape &&
    (style.modulePicked === true || dirShapeKnown || style.moduleShape !== "square")
  ) {
    patch.shape = style.moduleShape as ArtShape;
  }
  // Eye / pupil picks (Design tab): "square" (preset seed) and
  // "extra-rounded" (the classic DEFAULT_STYLE default) mean "no preference"
  // — unless the user explicitly clicked them (eyePicked / ballPicked) — so a
  // legacy or seeded value never flattens the template's finder.
  //
  // An explicit pick goes through the per-template camera battery
  // (safeFinder): the rendered (frame, ball) is the closest pair the battery
  // proved on THIS template. The old 5-design mapping (10 icons → 5 subtle
  // FINDER_STYLES) made most clicks visually no-ops — Circle on a
  // ringed-look template was a literal no-op — which read as "the eye and
  // pupil pickers don't work". Now every pick is a whole classic silhouette
  // (7×7 frame + 5×5 gap + 3×3 ball, exactly what the picker icons preview),
  // and the battery keeps it camera-safe per template.
  const eyeShape = style.eyeShape;
  const ballShape = style.ballShape;
  const eyeExplicit =
    eyeShape !== undefined &&
    (style.eyePicked === true || !NO_PREFERENCE_EYES.includes(eyeShape));
  const ballExplicit =
    ballShape !== undefined &&
    (style.ballPicked === true || !NO_PREFERENCE_EYES.includes(ballShape));
  const applySafe = (frame: EyeShape, ball: EyeShape | undefined) => {
    const safe = safeFinder(dir.id, frame, ball);
    // null = no silhouette decodes on this template: keep the template's
    // own camera-validated finder instead of shipping a rejected one.
    if (safe.frame) {
      patch.finderFrame = safe.frame;
      patch.finderBall = safe.ball;
    }
  };
  if (eyeShape && eyeExplicit) {
    applySafe(eyeShape, ballExplicit ? ballShape : undefined);
  } else if (ballShape && ballExplicit) {
    // Pupil-only pick: the pupil silhouette rides the circular ring — the
    // carrier the battery proves on the most templates — the same
    // "finder moves to carry the ball" behaviour the old mapping had.
    applySafe("circle", ballShape);
  }
  if (typeof style.moduleGap === "number" && Number.isFinite(style.moduleGap)) {
    patch.gap = clamp(style.moduleGap, 0, 0.18);
  }
  return Object.keys(patch).length ? { ...dir, ...patch } : dir;
}
