import { test } from "node:test";
import assert from "node:assert/strict";

import { artDirectionPresets, getArtDirection, inksFor } from "../art-directions.ts";
import { DEFAULT_STYLE, type QrStyle } from "../types.ts";
import { tuneDirection } from "./tune.ts";

/** A direction as an art preset would seed it: style mirrors the resolved look. */
function seededStyle(id: string): QrStyle {
  const dir = getArtDirection(id)!;
  return {
    ...DEFAULT_STYLE,
    moduleShape: dir.shape as QrStyle["moduleShape"],
    fg: dir.stops[0]!,
    bg: dir.bg,
    eyeColor: dir.eye ?? dir.stops[0]!,
    ballColor: dir.ball ?? dir.stops[0]!,
    gradientType: "none",
    gradientTo: dir.stops[dir.stops.length - 1]!,
    moduleGap: dir.gap,
    artDirection: dir.id,
  };
}

test("tuneDirection: untouched preset style leaves the direction alone", () => {
  const dir = getArtDirection("neon-cyber-grid")!;
  const style = { ...seededStyle("neon-cyber-grid"), fg: dir.stops[0]!, bg: dir.bg };
  const out = tuneDirection(dir, style);
  assert.deepEqual(out.stops, dir.stops, "base ink round-trips");
  assert.equal(out.bg, dir.bg);
  assert.equal(out.gradient, dir.gradient);
  assert.equal(out.shape, dir.shape);
  assert.equal(out.gap, dir.gap);
});

test("tuneDirection: fg repaints the base ink and keeps the direction's stops tail", () => {
  const dir = { ...getArtDirection("neon-cyber-grid")!, bg: "#101014" };
  const style = { ...seededStyle("neon-cyber-grid"), fg: "#ff8800" };
  const out = tuneDirection(dir, style);
  assert.equal(out.stops[0], "#ff8800");
  assert.deepEqual(out.stops.slice(1), dir.stops.slice(1));
});

test("tuneDirection: bg, eye and ball flow through; junk hexes are ignored", () => {
  const dir = getArtDirection("neon-cyber-grid")!;
  const style = {
    ...seededStyle("neon-cyber-grid"),
    bg: "#fafafa",
    eyeColor: "#123456",
    ballColor: "not-a-color",
  };
  const out = tuneDirection(dir, style);
  assert.equal(out.bg, "#fafafa");
  assert.equal(out.eye, "#123456");
  assert.equal(out.ball, dir.ball, "invalid color must not clobber the direction");
});

test("tuneDirection: picker gradients override, and 'none' only kills picker-shaped ones", () => {
  const spectrum = { ...getArtDirection("neon-cyber-grid")!, gradient: "spectrum" as const };
  const linear = { ...spectrum, gradient: "linear-x" as const };

  const onLinear = tuneDirection(linear, {
    ...seededStyle("neon-cyber-grid"),
    gradientType: "radial",
    gradientTo: "#22ff88",
  });
  assert.equal(onLinear.gradient, "radial");
  assert.deepEqual(onLinear.stops, [onLinear.stops[0], "#22ff88"]);

  const offLinear = tuneDirection(linear, { ...seededStyle("neon-cyber-grid"), gradientType: "none" });
  assert.equal(offLinear.gradient, "none", "linear-x is picker-expressible, so 'none' switches it off");

  const offSpectrum = tuneDirection(spectrum, { ...seededStyle("neon-cyber-grid"), gradientType: "none" });
  assert.equal(offSpectrum.gradient, "spectrum", "direction-only rhythms survive 'none'");

  // "Linear" in the picker means "along an axis" — a vertical direction stays
  // vertical instead of snapping horizontal at apply time.
  const vertical = { ...spectrum, gradient: "linear-y" as const };
  const staysVertical = tuneDirection(vertical, { ...seededStyle("neon-cyber-grid"), gradientType: "linear" });
  assert.equal(staysVertical.gradient, "linear-y");
});

test("tuneDirection: shapes map onto the direction, placeholders never flatten art-only shapes", () => {
  const petal = { ...getArtDirection("neon-cyber-grid")!, shape: "petal" as const };
  const squarey = { ...petal, shape: "hex" as const };

  // Seeded placeholder "square" on an art-only shape keeps the petal.
  const seeded = tuneDirection(petal, { ...DEFAULT_STYLE, moduleShape: "square" });
  assert.equal(seeded.shape, "petal");
  // Any real picker choice overrides it.
  const chosen = tuneDirection(petal, { ...DEFAULT_STYLE, moduleShape: "star" });
  assert.equal(chosen.shape, "star");
  // When the direction's shape IS in the picker, square re-expresses it.
  const backToSquare = tuneDirection(squarey, { ...DEFAULT_STYLE, moduleShape: "square" });
  assert.equal(backToSquare.shape, "square");
});

test("tuneDirection: module gap follows the slider, clamped to the painter's range", () => {
  const dir = getArtDirection("neon-cyber-grid")!;
  assert.equal(tuneDirection(dir, { ...DEFAULT_STYLE, moduleGap: 0.05 }).gap, 0.05);
  assert.equal(tuneDirection(dir, { ...DEFAULT_STYLE, moduleGap: 5 }).gap, 0.18);
  assert.equal(tuneDirection(dir, { ...DEFAULT_STYLE, moduleGap: Number.NaN }).gap, dir.gap);
});

test("tuneDirection: applying a preset's own seeded style changes nothing visible", () => {
  for (const preset of artDirectionPresets()) {
    const dir = getArtDirection(preset.style.artDirection);
    assert.ok(dir, `direction ${preset.style.artDirection} resolves`);
    const tuned = tuneDirection(dir, preset.style);
    assert.equal(tuned.shape, dir.shape, `${dir.id}: shape survives preset apply`);
    assert.equal(tuned.gradient, dir.gradient, `${dir.id}: gradient survives preset apply`);
    assert.ok(Math.abs(tuned.gap - dir.gap) < 1e-9, `${dir.id}: gap survives preset apply`);
    // Colors go through resolveInks' repair pass — compare the inks that are
    // actually painted, not the raw authored fields.
    const before = inksFor(dir);
    const after = inksFor(tuned);
    assert.equal(after.stops[0]!, before.stops[0]!, `${dir.id}: base ink`);
    assert.equal(after.bg, before.bg, `${dir.id}: paper`);
    assert.equal(after.eye, before.eye, `${dir.id}: eye`);
    assert.equal(after.ball, before.ball, `${dir.id}: ball`);
  }
});
