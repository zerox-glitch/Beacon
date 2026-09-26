/**
 * ART QR STYLE SYSTEM — the deterministic plan builder.
 *
 * `buildArtPlan` turns (matrix, direction, viewport) into a flat display list
 * of paint primitives. Two painters consume the very same list:
 *
 *   • `paint.ts`     → Canvas2D, for the live studio preview and PNG export
 *   • `rasterize.ts` → typed-array rasterizer, so the node validation harness
 *                       can run the camera battery against identical geometry
 *
 * Because the plan is data, the browser render and the validation render can
 * never drift apart — a style that passes offline passes on screen.
 *
 * Structural guarantees enforced here (the global rules):
 *   • the QR matrix is never modified — only painted;
 *   • nothing is drawn outside the body, so the quiet zone stays clean;
 *   • finders keep the 1:1:3:1:1 ratio and never depend on tiny details;
 *   • format/version cells are always solid, full-mass squares;
 *   • timing/alignment alternate exactly as encoded, at ≥ MIN_DARK_MASS;
 *   • dark data modules are grouped into features of one module or larger —
 *     never sub-module noise, never random holes;
 *   • light-cell decoration is capped at MAX_LIGHT_MARK of the cell.
 */

import {
  MIN_DARK_MASS,
  MAX_DARK_MASS,
  MAX_LIGHT_MARK,
  coverageOf,
  detailLevelFor,
  inksFor,
  lumaOf,
  massScale,
  ppmOf,
  resolveDirection,
  type ResolvedInks,
} from "../art-directions";
import { clamp, hash2, pick, wobble } from "./noise";
import { applyRung, relaxLadder } from "./relax";
import type { EncodedQr } from "../encode";
import { cellRole, isDark } from "../structure";
import { tuneDirection } from "./tune";
import type { ArtDetailLevel, ArtDirection, ArtFinder, ArtShape, EyeShape, QrStyle } from "../types";

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export type FillKind = "solid" | "linear" | "radial";

export interface FillSpec {
  kind: FillKind;
  stops: string[];
  /** Gradient axis for `linear`. */
  axis?: "x" | "y" | "d";
}

/** Geometric vocabulary the painters understand. */
export type PaintShape =
  | "rrect"
  | "circle"
  | "poly"
  | "capsule"
  | "diamond"
  | "hex"
  | "star"
  | "plus"
  | "leaf"
  | "petal"
  | "heart"
  | "pebble"
  | "gem"
  | "facet"
  | "cross"
  | "bar";

export type PaintRole =
  | "paper"
  | "data"
  | "plate"
  | "accent"
  | "accent-light"
  | "finder"
  | "finder-gap"
  | "timing"
  | "alignment"
  | "format";

export interface Paint {
  shape: PaintShape;
  /** Bounding box in device pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Uniform corner radius in pixels. */
  r?: number;
  /** Per-corner radii [tl, tr, br, bl] — merged runs read as one object. */
  corners?: [number, number, number, number];
  /** Rotation in radians. */
  rot?: number;
  /** Polygon points (device pixels) for `poly`. */
  pts?: number[];
  /** `bar` orientation. */
  vertical?: boolean;
  /** `bar` thickness as a fraction of the cell (user-picked line shapes ride the standard renderer's weight). */
  barThick?: number;
  fill: FillSpec;
  role: PaintRole;
  /** Module coordinates this paint came from — deterministic variation only. */
  gx: number;
  gy: number;
}

export interface ArtPlan {
  px: number;
  cell: number;
  origin: number;
  modules: number;
  quietZone: number;
  ppm: number;
  level: ArtDetailLevel;
  paper: string;
  directionId: string;
  directionName: string;
  /** The direction as actually resolved for this size (post-LOD). */
  resolved: ArtDirection;
  /**
   * True when the data modules carry a shape the user explicitly picked for
   * this template. The mass floor then no longer guards the plan — the user
   * owns the module mass (exactly like the classic renderer, which has no
   * floor); the scanability meter and Fix scan report what a camera sees.
   */
  userShape: boolean;
  paints: Paint[];
  /** Ink coverage of a dark data module (0–1). */
  darkMass: number;
  /** Decoration coverage of a light data module (0–1). */
  lightMark: number;
  inks: ResolvedInks;
}

export interface ArtPlanInput {
  qr: EncodedQr;
  style: QrStyle;
  direction: ArtDirection;
  px: number;
  /** Relax-ladder rung (0 = the direction exactly as authored). */
  relax?: number;
  /** Force the camera-safe fallback regardless of size. */
  cameraSafe?: boolean;
}

/**
 * Classic-parity geometry for a user-picked module shape in a template. The
 * values mirror `drawModuleShape` in render.ts (the classic path) so a pick
 * looks the same in templates as in the plain QR: the template's own corner
 * radius would otherwise flatten "Round"/"Soft" into its native square.
 */
const USER_SHAPE_RADIUS: Partial<Record<ArtShape, number>> = {
  square: 0,
  rounded: 0.28,
  squircle: 0.42,
  fluid: 0.52,
  leaf: 0.62,
  petal: 0.62,
  // "Burst" is a petal too — without this entry its radius fell back to 0
  // and every burst petal collapsed into a plain rectangle.
  radial: 0.62,
};
const USER_SHAPE_CORNERS: Partial<Record<ArtShape, [number, number, number, number]>> = {
  // Classic "classy": two large diagonal corners.
  classy: [0, 0.55, 0, 0.55],
};

/** Map a direction's module shape onto the painter vocabulary. */
export function paintShapeFor(shape: ArtShape): PaintShape {
  switch (shape) {
    case "dots":
      return "circle";
    case "cross":
      return "cross";
    case "diamond":
      return "diamond";
    case "hex":
      return "hex";
    case "star":
      return "star";
    case "plus":
      return "plus";
    case "leaf":
      return "leaf";
    case "heart":
      return "heart";
    case "pebble":
      return "pebble";
    case "gem":
      return "gem";
    case "facet":
      return "facet";
    case "capsule":
    case "pill":
      return "capsule";
    case "hbar":
    case "vbar":
    case "dash":
    case "diag":
      return "bar";
    case "petal":
      return "petal";
    case "confetti":
      return "bar";
    case "radial":
      return "petal";
    case "bubbles":
      return "circle";
    default:
      return "rrect";
  }
}

/* ------------------------------------------------------------------ *
 * Fill resolution — colour as a function of place
 * ------------------------------------------------------------------ */

function fillFor(dir: ArtDirection, inks: ResolvedInks, gx: number, gy: number, modules: number): FillSpec {
  const base = inks.stops[0]!;
  const stops = inks.stops.length > 1 ? inks.stops : [base, base];
  const u = modules > 1 ? gx / (modules - 1) : 0;
  const v = modules > 1 ? gy / (modules - 1) : 0;

  switch (dir.gradient) {
    case "none":
      return { kind: "solid", stops: [base] };
    case "linear-x":
      return { kind: "linear", stops, axis: "x" };
    case "linear-y":
      return { kind: "linear", stops, axis: "y" };
    case "diagonal":
      return { kind: "linear", stops, axis: "d" };
    case "radial":
      return { kind: "radial", stops };
    case "ramp":
      return { kind: "solid", stops: [rampAt2(stops, v)] };
    case "spectrum":
      return { kind: "solid", stops: [rampAt2(stops, (u + v) / 2)] };
    case "bands": {
      const band = 3;
      return { kind: "solid", stops: [stops[Math.floor(gy / band) % stops.length]!] };
    }
    case "split":
      return { kind: "solid", stops: [u + v < 1 ? stops[0]! : stops[stops.length - 1]!] };
    default:
      return { kind: "solid", stops: [base] };
  }
}

function rampAt2(stops: string[], t: number): string {
  if (stops.length === 1) return stops[0]!;
  const pos = clamp(t, 0, 0.99999) * (stops.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const a = stops[i]!;
  const b = stops[Math.min(stops.length - 1, i + 1)]!;
  const mix = (ai: number, bi: number) =>
    Math.round(ai + (bi - ai) * f)
      .toString(16)
      .padStart(2, "0");
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  return `#${mix((pa >> 16) & 255, (pb >> 16) & 255)}${mix((pa >> 8) & 255, (pb >> 8) & 255)}${mix(pa & 255, pb & 255)}`;
}

/* ------------------------------------------------------------------ *
 * Grouping — larger shapes, medium-scale clusters, connected runs
 * ------------------------------------------------------------------ */

export interface Run {
  cells: [number, number][];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function darkDataCells(qr: EncodedQr): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < qr.size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < qr.size; x++) {
      row.push(cellRole(qr, x, y) === "data" && isDark(qr, x, y));
    }
    grid.push(row);
  }
  return grid;
}

/** Which neighbours a cell bridges to, per geometry. */
function bridgeMask(
  grid: boolean[][],
  size: number,
  dir: ArtDirection,
  level: ArtDetailLevel,
): { n: boolean[][]; e: boolean[][]; s: boolean[][]; w: boolean[][] } {
  const mk = (): boolean[][] => grid.map((row) => row.map(() => false));
  const n = mk();
  const e = mk();
  const s = mk();
  const w = mk();
  const geometry = level === "lean" && dir.geometry === "traces" ? "runs-both" : dir.geometry;
  const k = level === "rich" ? 3 : 2;

  const linkH = (x: number, y: number): void => {
    e[y]![x] = true;
    w[y]![x + 1] = true;
  };
  const linkV = (x: number, y: number): void => {
    s[y]![x] = true;
    n[y + 1]![x] = true;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y]![x]) continue;
      const east = x + 1 < size && grid[y]![x + 1];
      const south = y + 1 < size && grid[y + 1]![x];
      switch (geometry) {
        case "runs-h":
          if (east) linkH(x, y);
          break;
        case "runs-v":
          if (south) linkV(x, y);
          break;
        case "runs-both":
          if (east) linkH(x, y);
          if (south) linkV(x, y);
          break;
        case "blocks":
          // Bridge only inside the same k×k tile — hard tile edges between.
          if (east && Math.floor(x / k) === Math.floor((x + 1) / k)) linkH(x, y);
          if (south && Math.floor(y / k) === Math.floor((y + 1) / k)) linkV(x, y);
          break;
        case "components":
          if (east) linkH(x, y);
          if (south) linkV(x, y);
          break;
        case "traces": {
          if (east) linkH(x, y);
          // Vertical stubs only where a horizontal trace passes through, so
          // the join reads as a right-angle board trace.
          const onHRun =
            (x > 0 && grid[y]![x - 1]) || (x + 1 < size && grid[y]![x + 1]);
          if (south && onHRun) linkV(x, y);
          break;
        }
        default:
          break;
      }
    }
  }
  return { n, e, s, w };
}

/* ------------------------------------------------------------------ *
 * Distortion — medium scale only, never sub-module texture
 * ------------------------------------------------------------------ */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function distort(box: Box, run: Run, dir: ArtDirection, cell: number, level: ArtDetailLevel): Box {
  const kind = level === "lean" ? "none" : dir.distortion;
  const [gx, gy] = run.cells[0]!;
  const amt = level === "rich" ? 1 : 0.6;
  const vertical = run.y1 > run.y0;
  switch (kind) {
    case "jitter": {
      const jx = wobble(gx, gy) * 0.05 * cell * amt;
      const jy = wobble(gy, gx) * 0.05 * cell * amt;
      return { x: box.x + jx, y: box.y + jy, w: box.w, h: box.h };
    }
    case "taper": {
      // Elongate along the run — flame / leaf rhythm. Bounded so the shape
      // never reaches a neighbouring light module.
      const grow = 0.08 * amt;
      return vertical
        ? { x: box.x + (box.w * grow) / 2, y: box.y, w: box.w * (1 - grow), h: box.h }
        : { x: box.x, y: box.y + (box.h * grow) / 2, w: box.w, h: box.h * (1 - grow) };
    }
    case "wobble": {
      const dy = wobble(gx, gy) * 0.04 * cell * amt;
      return { x: box.x, y: box.y + dy, w: box.w, h: box.h };
    }
    case "bands": {
      // CRT / marble banding: thickness follows the row band.
      const k = [1, 0.9, 0.95][Math.floor(gy / 2) % 3]!;
      return vertical
        ? { x: box.x + (box.w * (1 - k)) / 2, y: box.y, w: box.w * k, h: box.h }
        : { x: box.x, y: box.y + (box.h * (1 - k)) / 2, w: box.w, h: box.h * k };
    }
    case "steps": {
      const step = [1, 0.94, 1, 0.9][(gx + gy) % 4]!;
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      return { x: cx - (box.w * step) / 2, y: cy - (box.h * step) / 2, w: box.w * step, h: box.h * step };
    }
    default:
      return box;
  }
}

/**
 * The SHAPE RULE as a predicate: can this silhouette, at its largest safe size
 * (the whole cell minus its gap), still carry MIN_DARK_MASS of ink? If not, it
 * rides on a plate.
 */
function needsPlateFor(shape: ArtShape, inner: number): boolean {
  return coverageOf(shape) * inner * inner < MIN_DARK_MASS;
}

/**
 * Per-cell shape scale. Plated silhouettes simply fill their cell; un-plated
 * ones grow until they reach the mass floor but never past the cell boundary,
 * so light modules stay light either way.
 */
function perCellScale(shape: ArtShape, targetMass: number, gap: number, plated: boolean): number {
  const maxScale = 1 - gap;
  if (plated) return maxScale;
  // 0.7 (not 0.85): an untouched template's targetMass floor (0.78) keeps
  // its scale above 0.88, so the looser bound only ever shows when the user
  // explicitly shrinks their dots — then it is the slider doing its job.
  return clamp(Math.sqrt(targetMass / coverageOf(shape)), 0.7, maxScale);
}

/* ------------------------------------------------------------------ *
 * Finder patterns — artistic, never dependent on tiny details
 * ------------------------------------------------------------------ */

function octagon(x: number, y: number, w: number, h: number, k: number): number[] {
  return [
    x + k, y, x + w - k, y, x + w, y + k, x + w, y + h - k,
    x + w - k, y + h, x + k, y + h, x, y + h - k, x, y + k,
  ];
}

/**
 * Finder styling, constrained by the FINDER PATTERN RULE.
 *
 * The 7×7 island must keep its 1:1:3:1:1 luminance run, so:
 *   • the outer ring stays a square or chamfered square whose mid-edges sit
 *     exactly on the island boundary — a *circular* outer ring would cover the
 *     light gap at the edge midpoints and destroy the ratio;
 *   • the light gap is always a square inset by exactly one module;
 *   • only the BALL (the 3×3 centre) takes a decorative silhouette, since a
 *     detector only needs its centre dark and its 3-module run.
 *
 * That is the whole artistic budget for a finder, and it is deliberate: this
 * is the one structure that must never depend on a tiny detail.
 */
interface FinderStyle {
  /** Outer ring corner radius, in cells. */
  outerR: number;
  /** Chamfer the outer ring into an octagon (in cells). */
  chamfer?: number;
  /** Light-gap corner radius, in cells. */
  gapR: number;
  ball: "square" | "circle" | "diamond" | "octagon";
}

/**
 * Finder styling, measured against jsQR + the camera battery:
 *   • the outer ring keeps square-ish corners (outerR here is cosmetic edge
 *     softness on the ring rectangle; the ring always spans the full 7×7
 *     island so the 1:1:3:1:1 runs survive on every centre scanline);
 *   • chamfer cuts are capped at 0.8 cells — deeper octagon cuts slide the
 *     detector's grid estimate;
 *   • the centre ball never takes a diamond silhouette — the point-toward-
 *     gap corners read as eroded modules; octagon/circle/square only.
 */
const FINDER_STYLES: Record<ArtFinder, FinderStyle> = {
  solid: { outerR: 0.2, gapR: 0.1, ball: "square" },
  ringed: { outerR: 1.2, gapR: 0.8, ball: "circle" },
  bracket: { outerR: 0.1, gapR: 0.1, ball: "square" },
  chamfer: { outerR: 0, gapR: 0, ball: "octagon", chamfer: 0.8 },
  diamond: { outerR: 0.5, gapR: 0.3, ball: "octagon" },
  circle: { outerR: 1.3, gapR: 1, ball: "circle" },
  floral: { outerR: 1.5, gapR: 1.1, ball: "circle" },
  circuit: { outerR: 0.1, gapR: 0.1, ball: "octagon", chamfer: 0.8 },
  gothic: { outerR: 0, gapR: 0, ball: "octagon" },
  deco: { outerR: 0.8, gapR: 0.45, ball: "octagon", chamfer: 0.8 },
  soft: { outerR: 0.6, gapR: 0.4, ball: "square" },
  ring8: { outerR: 1.2, gapR: 0.8, ball: "octagon" },
  halo: { outerR: 1.8, gapR: 1.4, ball: "circle" },
  cut: { outerR: 0, gapR: 0, ball: "square", chamfer: 0.4 },
};

/**
 * One silhouette layer of the classic eye — the exact geometry
 * `drawEye`/`drawLayer` in render.ts paint for plain QRs (and the picker
 * icons preview): square, rounded (0.18), extra-rounded (0.32), circle,
 * diamond, hex (0.52 radius), classy (two diagonal corners, 0.38), leaf
 * (other diagonal pair, 0.42), ticks (0.18 rounded). Radii scale with the
 * LAYER's own size, so the 7×7 / 5×5 / 3×3 layers keep the classic ratios.
 */
function pushEyeLayer(
  out: Paint[],
  x: number,
  y: number,
  sz: number,
  shape: EyeShape,
  fill: FillSpec,
  role: PaintRole,
): void {
  if (shape === "circle") {
    out.push({ shape: "circle", x, y, w: sz, h: sz, fill, role, gx: 0, gy: 0 });
    return;
  }
  if (shape === "diamond") {
    const cx = x + sz / 2;
    const cy = y + sz / 2;
    out.push({
      shape: "poly",
      x,
      y,
      w: sz,
      h: sz,
      pts: [cx, y, x + sz, cy, cx, y + sz, x, cy],
      fill,
      role,
      gx: 0,
      gy: 0,
    });
    return;
  }
  if (shape === "hex") {
    const cx = x + sz / 2;
    const cy = y + sz / 2;
    const r = sz * 0.52;
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    out.push({ shape: "poly", x, y, w: sz, h: sz, pts, fill, role, gx: 0, gy: 0 });
    return;
  }
  let c: [number, number, number, number];
  switch (shape) {
    case "square":
      c = [0, 0, 0, 0];
      break;
    case "extra-rounded":
      c = [sz * 0.32, sz * 0.32, sz * 0.32, sz * 0.32];
      break;
    case "classy":
      c = [0, sz * 0.38, 0, sz * 0.38];
      break;
    case "leaf":
      c = [sz * 0.42, 0, sz * 0.42, 0];
      break;
    case "target":
      c = [sz * 0.5, sz * 0.5, sz * 0.5, sz * 0.5];
      break;
    default:
      c = [sz * 0.18, sz * 0.18, sz * 0.18, sz * 0.18];
  }
  out.push({ shape: "rrect", x, y, w: sz, h: sz, corners: c, fill, role, gx: 0, gy: 0 });
}

/**
 * A user-picked eye + pupil, drawn with the classic three-layer system:
 * 7×7 frame silhouette, 5×5 gap silhouette, 3×3 ball silhouette — identical
 * to `drawEye` in render.ts, so the QR matches the picker icons and the
 * mobile app. The (frame, ball) pair arrives already resolved through the
 * per-template camera battery (tuneDirection → safeFinder), which is why
 * "weird" frames (diamond/hex corners) only ever appear where they decode.
 * `target` is the true circular ring (the classic's Target special case,
 * which carries a round ball); `ticks` adds the four cross-hair marks.
 */
function silhouetteFinder(
  frame: EyeShape,
  ball: EyeShape | undefined,
  inks: ResolvedInks,
  ox: number,
  oy: number,
  cell: number,
  corner: "tl" | "tr" | "bl",
): Paint[] {
  const s = cell * 7;
  const eyeFill: FillSpec = { kind: "solid", stops: [inks.eye] };
  const ballFill: FillSpec = { kind: "solid", stops: [inks.ball] };
  const gapFill: FillSpec = { kind: "solid", stops: [inks.bg] };
  const out: Paint[] = [];

  // Paper the whole 8×8 island (finder + separator) first, so no body ink can
  // bleed into the one-module light gap and the quiet zone stays clean.
  out.push({
    shape: "rrect",
    x: ox - (corner === "tr" ? cell : 0),
    y: oy - (corner === "bl" ? cell : 0),
    w: cell * 8,
    h: cell * 8,
    r: 0,
    fill: gapFill,
    role: "finder-gap",
    gx: 0,
    gy: 0,
  });

  if (frame === "target") {
    out.push({ shape: "circle", x: ox, y: oy, w: s, h: s, fill: eyeFill, role: "finder", gx: 0, gy: 0 });
    out.push({ shape: "circle", x: ox + cell, y: oy + cell, w: cell * 5, h: cell * 5, fill: gapFill, role: "finder-gap", gx: 0, gy: 0 });
    out.push({ shape: "circle", x: ox + cell * 2, y: oy + cell * 2, w: cell * 3, h: cell * 3, fill: ballFill, role: "finder", gx: 0, gy: 0 });
    return out;
  }

  const ballShape = ball ?? "square";
  pushEyeLayer(out, ox, oy, s, frame, eyeFill, "finder");
  pushEyeLayer(out, ox + cell, oy + cell, cell * 5, frame, gapFill, "finder-gap");
  pushEyeLayer(out, ox + cell * 2, oy + cell * 2, cell * 3, ballShape, ballFill, "finder");

  if (frame === "ticks") {
    const t = cell * 1.35;
    const r = t * 0.3;
    out.push({ shape: "rrect", x: ox + s / 2 - t / 2, y: oy, w: t, h: t, r, fill: eyeFill, role: "finder", gx: 0, gy: 0 });
    out.push({ shape: "rrect", x: ox + s / 2 - t / 2, y: oy + s - t, w: t, h: t, r, fill: eyeFill, role: "finder", gx: 0, gy: 0 });
    out.push({ shape: "rrect", x: ox, y: oy + s / 2 - t / 2, w: t, h: t, r, fill: eyeFill, role: "finder", gx: 0, gy: 0 });
    out.push({ shape: "rrect", x: ox + s - t, y: oy + s / 2 - t / 2, w: t, h: t, r, fill: eyeFill, role: "finder", gx: 0, gy: 0 });
  }
  return out;
}

function finderPaints(
  dir: ArtDirection,
  inks: ResolvedInks,
  ox: number,
  oy: number,
  cell: number,
  corner: "tl" | "tr" | "bl",
  level: ArtDetailLevel,
): Paint[] {
  const s = cell * 7;
  // Design-tab eye/pupil picks (explicit): the classic 10-silhouette system,
  // battery-resolved per template by tuneDirection. At "lean" level the
  // camera-safe solid finder wins, as before.
  if (level !== "lean" && dir.finderFrame) {
    return silhouetteFinder(dir.finderFrame, dir.finderBall, inks, ox, oy, cell, corner);
  }
  // The template's own finder, as authored (or solid at lean).
  const baseFinder: ArtFinder = level === "lean" ? "solid" : dir.finder;
  const fs: FinderStyle = FINDER_STYLES[baseFinder] ?? FINDER_STYLES.solid;
  const eyeFill: FillSpec = { kind: "solid", stops: [inks.eye] };
  const ballFill: FillSpec = { kind: "solid", stops: [inks.ball] };
  const gapFill: FillSpec = { kind: "solid", stops: [inks.bg] };
  const out: Paint[] = [];

  // Paper the whole 8×8 island (finder + separator) first, so no body ink can
  // bleed into the one-module light gap and the quiet zone stays clean.
  out.push({
    shape: "rrect",
    x: ox - (corner === "tr" ? cell : 0),
    y: oy - (corner === "bl" ? cell : 0),
    w: cell * 8,
    h: cell * 8,
    r: 0,
    fill: gapFill,
    role: "finder-gap",
    gx: 0,
    gy: 0,
  });

  const ring = (
    chamfer: number | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: FillSpec,
    role: PaintRole,
  ): void => {
    if (chamfer) {
      out.push({
        shape: "poly",
        x,
        y,
        w,
        h,
        pts: octagon(x, y, w, h, Math.min(chamfer * cell, w / 2.4)),
        fill,
        role,
        gx: 0,
        gy: 0,
      });
      return;
    }
    out.push({ shape: "rrect", x, y, w, h, r, fill, role, gx: 0, gy: 0 });
  };

  // Outer dark ring — square or chamfered square, never a circle.
  ring(fs.chamfer, ox, oy, s, s, fs.outerR * cell, eyeFill, "finder");
  // Light gap: exactly one module, always square-ish.
  ring(undefined, ox + cell, oy + cell, cell * 5, cell * 5, fs.gapR * cell, gapFill, "finder-gap");

  // Centre ball — the only decorative silhouette inside a finder.
  const bx = ox + cell * 2;
  const by = oy + cell * 2;
  const bw = cell * 3;
  if (fs.ball === "circle") {
    out.push({ shape: "circle", x: bx, y: by, w: bw, h: bw, fill: ballFill, role: "finder", gx: 0, gy: 0 });
  } else if (fs.ball === "diamond") {
    const k = bw * 1.1; // keep the 3-module dark run at the midpoints
    out.push({
      shape: "diamond",
      x: bx - (k - bw) / 2,
      y: by - (k - bw) / 2,
      w: k,
      h: k,
      fill: ballFill,
      role: "finder",
      gx: 0,
      gy: 0,
    });
  } else if (fs.ball === "octagon") {
    out.push({
      shape: "poly",
      x: bx,
      y: by,
      w: bw,
      h: bw,
      pts: octagon(bx, by, bw, bw, cell * 0.8),
      fill: ballFill,
      role: "finder",
      gx: 0,
      gy: 0,
    });
  } else {
    out.push({
      shape: "rrect",
      x: bx,
      y: by,
      w: bw,
      h: bw,
      r: fs.gapR * cell * 0.6,
      fill: ballFill,
      role: "finder",
      gx: 0,
      gy: 0,
    });
  }
  return out;
}

/**
 * Clip a box to the body. Nothing decorative may reach into the separator or
 * the quiet zone — that is the QUIET ZONE RULE, enforced geometrically rather
 * than by hoping the distortion parameters stay small.
 */
function clampToBody(box: Box, x0: number, y0: number, x1: number, y1: number): Box {
  const nx0 = Math.max(box.x, x0);
  const ny0 = Math.max(box.y, y0);
  const nx1 = Math.min(box.x + box.w, x1);
  const ny1 = Math.min(box.y + box.h, y1);
  return { x: nx0, y: ny0, w: Math.max(0, nx1 - nx0), h: Math.max(0, ny1 - ny0) };
}

export function buildArtPlan(input: ArtPlanInput): ArtPlan {
  const { qr, style, px } = input;
  const qz0 = Math.max(2, Math.min(8, Math.round(style.quietZone || input.direction.quietZone)));
  const rungs = relaxLadder({ ...style, artDirection: input.direction.id });
  const rung = rungs[Math.min(rungs.length - 1, Math.max(0, input.relax ?? 0))];
  const relaxed = rung ? applyRung(input.direction, rung) : { dir: input.direction, cameraSafe: false };
  // Tune edits enter BEFORE LOD resolution: the relax ladder exists to
  // simplify (and thereby protect) a code under stress, so at low detail
  // levels its tweaks still win over a user-picked shape.
  const dir = resolveDirection(tuneDirection(relaxed.dir, style), detailLevelFor(ppmOf(px, qr.size, qz0)), {
    cameraSafe: Boolean(input.cameraSafe) || relaxed.cameraSafe,
  });
  const inks = inksFor(dir);
  const quietZone = Math.max(3, qz0);
  const total = qr.size + quietZone * 2;
  const cell = px / total;
  const origin = quietZone * cell;
  const ppm = px / total;
  const level = detailLevelFor(ppm);

  const paints: Paint[] = [
    {
      shape: "rrect",
      x: 0,
      y: 0,
      w: px,
      h: px,
      r: 0,
      fill: { kind: "solid", stops: [inks.bg] },
      role: "paper",
      gx: 0,
      gy: 0,
    },
  ];

  const size = qr.size;
  const grid = darkDataCells(qr);
  const gapInk = clamp(dir.gap * (level === "lean" ? 0.4 : 1), 0, 0.1);
  /**
   * The Design-tab "Dot size" slider drives module mass in templates too.
   * `dotScaleRef` records the value the template was applied with (the studio
   * writes it when applying a preset; presets seed 0.9). Without it — raw
   * harness or legacy styles — the template renders exactly as before this
   * feature and the slider stays classic-only. Once the user moves the slider
   * away from the reference they own the mass: the MIN_DARK_MASS floor (a
   * guard for untouched templates) steps aside, exactly like the classic
   * renderer has no floor — the scanability meter and Fix scan take over.
   */
  const dotScaleRef =
    typeof style.dotScaleRef === "number" &&
    Number.isFinite(style.dotScaleRef) &&
    style.dotScaleRef >= 0.3
      ? style.dotScaleRef
      : null;
  const dotScaleValue = Number(style.dotScale ?? 0.9);
  const dotTouched = dotScaleRef !== null && Math.abs(dotScaleValue - dotScaleRef) >= 0.005;
  const dotWeight = dotTouched ? clamp(dotScaleValue / dotScaleRef, 0.35, 1.12) : 1;
  const targetMass = clamp(
    (level === "lean" ? Math.max(dir.mass, MIN_DARK_MASS + 0.08) : dir.mass) * dotWeight,
    dotTouched ? 0.35 : MIN_DARK_MASS,
    MAX_DARK_MASS,
  );
  /**
   * A module shape the user explicitly picked for this template. Such a pick
   * is rendered the way the classic QR renderer draws it — un-plated, at full
   * cell size, classic corner radii — instead of the template's mass system,
   * which would bury low-coverage silhouettes (diamond, star, plus…) under a
   * solid same-colour plate and make the pick look like the template's own
   * shape.
   *
   * An actual Design-tab click (the `modulePicked` marker) ALWAYS counts —
   * even when the click re-selects the shape the template was seeded with.
   * Presets pre-highlight their own shape in the picker, so without the
   * marker rule that click is a silent no-op: the QR keeps the template's
   * mass-scaled rendering of the same silhouette (tiny traces/specks on some
   * templates) and Fix scan agrees it scans, so nothing ever visibly happens.
   * Without a click, only a value that differs from the direction's own
   * authored shape counts (the "square" seed is a no-preference placeholder),
   * so untouched pickers and raw harness styles leave templates alone.
   */
  const userShape =
    style.moduleShape !== undefined &&
    (style.modulePicked === true ||
      (style.moduleShape !== "square" && input.direction.shape !== style.moduleShape));
  // The pick survives EVERY rung — including the camera-safe last resort,
  // whose shape fallback would otherwise swap it back to the template's own
  // silhouette and leave the dot picker looking dead after Fix scan. The
  // pick is drawn un-plated at full cell (its mass is the user's choice),
  // and Fix scan's real levers (gaps, quiet zone, ECC, contrast) still apply.
  const shape: ArtShape = userShape ? (style.moduleShape as ArtShape) : dir.shape;
  const paintShape = paintShapeFor(shape);
  const radius = (level === "lean" ? Math.min(dir.radius, 0.3) : dir.radius) * cell;
  const perCell = dir.geometry === "single";
  const inner = 1 - gapInk;

  /**
   * A module shape the user explicitly picked for this template (differs from
   * the direction's own authored shape; the "square" seed placeholder counts
   * as a pick only when the Design tab recorded an actual click). Such a pick
   * is rendered the way the classic QR renderer draws it — un-plated, at full
   * cell size, classic corner radii — instead of the template's mass system,
   * which would bury low-coverage silhouettes (diamond, star, plus…) under a
   * solid same-colour plate and make the pick look like the template's own
   * shape. Only a pick that *differs from the template's own shape* counts:
   * presets seed the picker with the direction's shape, so an untouched
   * picker leaves templates alone.
   */
  // The dot-size slider travels along user picks too (down to 0.75×, never
  // past the cell); an untouched slider renders them exactly full cell.
  const userScale =
    (1 - gapInk) * (dotTouched ? clamp(dotScaleValue / dotScaleRef!, 0.75, 1) : 1);
  /**
   * Decorative silhouettes that cannot reach MIN_DARK_MASS even at full cell
   * size get a solid plate underneath: art on top, QR signal beneath. Anything
   * that can carry its own mass does, un-plated. A user pick owns its own
   * mass (like the classic renderer, which has no floor) — the scanability
   * meter and Fix scan take over.
   */
  const needsPlate = perCell && needsPlateFor(shape, inner) && !userShape && !dotTouched;
  /* The SHAPE RULE: a dark module must never become a tiny decorative dot.
   * Grouped geometry fills its cells and bridges the gaps, so the floor is
   * already met there; per-cell silhouettes either scale up to the floor or
   * ride on a plate that carries the mass for them. Either way the shape never
   * leaves its own cell — that is what keeps light modules light. */
  const scale = userShape ? userScale : perCellScale(shape, targetMass, gapInk, needsPlate);

  /* ---- data modules ----
   *
   * Every dark DATA cell is painted individually, and grouping is expressed by
   * *bridging* the gap between grouped neighbours. That distinction matters:
   * painting the bounding box of an L-shaped cluster would fill in light
   * modules that happen to sit inside the box, which is exactly the "randomly
   * erasing QR modules" failure the global rules forbid. Per-cell + bridges
   * gives connected runs, medium-scale clusters and pixel tiles while the
   * light cells stay untouched.
   */
  const geometry = level === "lean" && dir.geometry === "traces" ? "runs-both" : dir.geometry;
  const grouped = geometry !== "single";
  const links = grouped ? bridgeMask(grid, size, { ...dir, geometry }, level) : null;
  // User-picked shapes stay discrete modules (like the classic renderer) —
  // a solid bridge between two diamonds would smear them into a blob.
  const bridge = grouped && gapInk > 0.005 && !userShape;
  const side = cell * scale * inner;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y]![x]) continue;
          const run: Run = { cells: [[x, y]], x0: x, y0: y, x1: x, y1: y };
      const inset = (cell - side) / 2;
      // A user pick is drawn the way the classic renderer draws it — clean,
      // uniform geometry. The template's distortion (jitter/taper/wobble/
      // bands/steps) is part of the template's own art and would shrink,
      // nudge or band the picked silhouette cell by cell, which is exactly
      // the "weird shapes on some presets" failure: the same pick looks fine
      // on a `none`-distortion template and ragged on a banded one.
      const baseBox = { x: origin + x * cell + inset, y: origin + y * cell + inset, w: side, h: side };
      const box = userShape ? baseBox : distort(baseBox, run, dir, cell, level);
      const clipped = clampToBody(box, origin, origin, origin + size * cell, origin + size * cell);

      if (needsPlate) {
        // Decorative silhouettes sit on a solid plate so the module still
        // delivers its full dark mass — art on top, signal underneath.
        paints.push({
          shape: "rrect",
          x: origin + x * cell + cell * 0.04,
          y: origin + y * cell + cell * 0.04,
          w: cell * 0.92,
          h: cell * 0.92,
          r: cell * 0.26,
          fill: { kind: "solid", stops: [inks.stops[0]!] },
          role: "plate",
          gx: x,
          gy: y,
        });
      }

      // Neighbour-aware corners: rounded on the outside of a cluster, square
      // where it joins a neighbour, so a group reads as ONE object.
      const n = links?.n[y]?.[x] ?? false;
      const e = links?.e[y]?.[x] ?? false;
      const so = links?.s[y]?.[x] ?? false;
      const w = links?.w[y]?.[x] ?? false;
      const corners: [number, number, number, number] = grouped
        ? [
            n || w ? 0 : radius,
            n || e ? 0 : radius,
            so || e ? 0 : radius,
            so || w ? 0 : radius,
          ]
        : [radius, radius, radius, radius];

      // Streaks angle 45°, confetti takes a per-cell hash angle (same
      // distribution the classic renderer uses), dashes alternate — matching
      // what the picker icon promises.
      const barRot =
        paintShape === "bar"
          ? shape === "diag"
            ? -Math.PI / 4
            : shape === "confetti"
              ? ((hash2(x, y) % 360) * Math.PI) / 180
              : shape === "dash"
                ? (hash2(x, y) % 2 === 1 ? Math.PI / 2 : undefined)
                : undefined
          : undefined;
      // Classic "Bubbles": a per-cell hash radius (0.26–0.48 of the cell,
      // exactly the classic renderer's range) — the plan carries the box.
      let bx0 = clipped.x;
      let by0 = clipped.y;
      let bw0 = clipped.w;
      let bh0 = clipped.h;
      if (userShape && shape === "bubbles") {
        const b = Math.min(side, clipped.w, clipped.h) * (0.52 + ((hash2(x, y) % 64) / 64) * 0.44);
        bx0 = clipped.x + (clipped.w - b) / 2;
        by0 = clipped.y + (clipped.h - b) / 2;
        bw0 = bh0 = b;
      }
      // A user pick takes the classic renderer's own geometry (corner radius
      // / per-corner radii) — the template's radius would flatten Round/Soft
      // into its native square, and the pick would look like nothing changed.
      const uc = userShape ? USER_SHAPE_CORNERS[shape] : undefined;
      const userCorners: [number, number, number, number] | undefined = uc
        ? [uc[0]! * cell, uc[1]! * cell, uc[2]! * cell, uc[3]! * cell]
        : undefined;
      const userR = userShape ? (USER_SHAPE_RADIUS[shape] ?? 0) * cell : radius;
      paints.push({
        shape: paintShape,
        x: bx0,
        y: by0,
        w: bw0,
        h: bh0,
        r: userR,
        // A user pick keeps ONE uniform corner profile across the whole code
        // (the classic look). The neighbour-aware corners below would square
        // off every cell that touches a run — jagged half-rounded blobs.
        corners:
          userCorners ??
          (userShape
            ? [userR, userR, userR, userR]
            : grouped
              ? corners
              : undefined),
        rot:
          paintShape === "facet" || paintShape === "gem"
            ? ((hash2(x, y) % 4) * Math.PI) / 8
            : (barRot ?? undefined),
        vertical: shape === "vbar",
        barThick: userShape && paintShape === "bar" ? 0.56 : undefined,
        fill: fillFor(dir, inks, x, y, size),
        role: "data",
        gx: x,
        gy: y,
      });

      if (!bridge) continue;
      const gapW = cell - side;
      if (gapW <= 0.4) continue;
      const fill = fillFor(dir, inks, x, y, size);
      // East bridge
      if (e) {
        const bx = origin + x * cell + inset + side;
        const b = clampToBody(
          { x: bx, y: origin + y * cell + inset, w: gapW + cell * 0.02, h: side },
          origin,
          origin,
          origin + size * cell,
          origin + size * cell,
        );
        if (b.w > 0.2) paints.push({ shape: "rrect", ...b, r: 0, fill, role: "data", gx: x, gy: y });
      }
      // South bridge
      if (so) {
        const by = origin + y * cell + inset + side;
        const b = clampToBody(
          { x: origin + x * cell + inset, y: by, w: side, h: gapW + cell * 0.02 },
          origin,
          origin,
          origin + size * cell,
          origin + size * cell,
        );
        if (b.h > 0.2) paints.push({ shape: "rrect", ...b, r: 0, fill, role: "data", gx: x, gy: y });
      }
    }
  }

  /* ---- format + version: always solid, always full mass ---- */
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const role = cellRole(qr, x, y);
      if (role !== "format" && role !== "version") continue;
      if (!isDark(qr, x, y)) continue;
      paints.push({
        shape: "rrect",
        x: origin + x * cell,
        y: origin + y * cell,
        w: cell,
        h: cell,
        r: 0,
        fill: { kind: "solid", stops: [inks.stops[0]!] },
        role: "format",
        gx: x,
        gy: y,
      });
    }
  }

  /* ---- timing ---- */
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cellRole(qr, x, y) !== "timing" || !isDark(qr, x, y)) continue;
      const timingStyle = dir.timing === "dot" ? "pill" : dir.timing;
      const inset = timingStyle === "solid" ? 0 : cell * 0.08;
      paints.push({
        shape: "rrect",
        x: origin + x * cell + inset,
        y: origin + y * cell + inset,
        w: cell - inset * 2,
        h: cell - inset * 2,
        r: timingStyle === "pill" ? cell * 0.32 : 0,
        fill: { kind: "solid", stops: [inks.stops[0]!] },
        role: "timing",
        gx: x,
        gy: y,
      });
    }
  }

  /* ---- alignment ----
   * Always solid squares. The alignment pattern is decoder scaffolding:
   * stylising it (dots, rings) measurably breaks grid estimation, so the
   * direction's `alignment` field colours nothing here on purpose. */
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cellRole(qr, x, y) !== "alignment" || !isDark(qr, x, y)) continue;
      paints.push({
        shape: "rrect",
        x: origin + x * cell,
        y: origin + y * cell,
        w: cell,
        h: cell,
        r: 0,
        fill: { kind: "solid", stops: [inks.stops[0]!] },
        role: "alignment",
        gx: x,
        gy: y,
      });
    }
  }

  /* ---- finders last among structure: they win any overlap ---- */
  const corners: ["tl" | "tr" | "bl", number, number][] = [
    ["tl", 0, 0],
    ["tr", size - 7, 0],
    ["bl", 0, size - 7],
  ];
  for (const [corner, ex, ey] of corners) {
    for (const p of finderPaints(dir, inks, origin + ex * cell, origin + ey * cell, cell, corner, level)) {
      paints.push(p);
    }
  }

  /* ---- accents ---- */
  /* ---- accents: on ink only ----
   * A decorative mark on a *light* module becomes a phantom module under
   * local binarisation (verified empirically against jsQR), so accents are
   * only ever painted over dark data modules, in a colour locked to the ink. */
  const accent = dir.accentMark !== "none" && dir.accentFreq > 0 ? inks.accent : null;
  const lightMark = 0;
  if (accent && level !== "lean") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (cellRole(qr, x, y) !== "data" || !isDark(qr, x, y)) continue;
        if (pick(x, y) > dir.accentFreq) continue;
        const frac = 0.4;
        const s = cell * frac;
        const tickW = dir.accentMark === "tick" ? s * 1.5 : s;
        const tickH = dir.accentMark === "tick" ? s * 0.45 : s;
        paints.push({
          shape:
            dir.accentMark === "spark"
              ? "star"
              : dir.accentMark === "tick"
                ? "rrect"
                : "circle",
          x: origin + x * cell + (cell - tickW) / 2,
          y: origin + y * cell + (cell - tickH) / 2,
          w: tickW,
          h: tickH,
          r: dir.accentMark === "tick" ? tickH * 0.4 : 0,
          rot: dir.accentMark === "tick" ? ((hash2(x, y) % 2) * Math.PI) / 2 : undefined,
          fill: { kind: "solid", stops: [accent] },
          role: "accent",
          gx: x,
          gy: y,
        });
      }
    }
  }

  const darkMass = perCell
    ? needsPlate
      ? clamp(0.92 * 0.92, 0, 1)
      : clamp(coverageOf(shape) * scale * scale, 0, 1)
    : clamp(inner * inner, 0, 1);

  return {
    px,
    cell,
    origin,
    modules: size,
    quietZone,
    ppm,
    level,
    paper: inks.bg,
    directionId: dir.id,
    directionName: dir.name,
    resolved: dir,
    userShape,
    paints,
    darkMass,
    lightMark,
    inks,
  };
}

function accentCoverage(mark: ArtDirection["accentMark"], frac: number): number {
  const cov = mark === "ring" ? 0.5 : mark === "spark" ? 0.34 : mark === "tick" ? 0.45 : 0.78;
  return cov * frac * frac;
}

/* ------------------------------------------------------------------ *
 * QA — structural audit (no decoding)
 * ------------------------------------------------------------------ */

export interface PlanAudit {
  ok: boolean;
  problems: string[];
  separation: number;
  darkMass: number;
  lightMark: number;
  quietZoneClean: boolean;
  paintCount: number;
}

/**
 * The invariants the global rules demand, checked on the plan itself. Cheap
 * enough to run on every studio render; the node harness asserts it for all
 * fifty directions.
 */
export function auditPlan(plan: ArtPlan): PlanAudit {
  const problems: string[] = [];
  const body0 = plan.origin;
  const body1 = plan.origin + plan.modules * plan.cell;

  let quietZoneClean = true;
  for (const p of plan.paints) {
    if (p.role === "paper") continue;
    const pad = p.role === "finder" ? plan.cell * 0.02 : plan.cell * 0.02;
    if (p.x < body0 - pad || p.y < body0 - pad || p.x + p.w > body1 + pad || p.y + p.h > body1 + pad) {
      quietZoneClean = false;
      break;
    }
  }
  if (!quietZoneClean) problems.push("artwork crosses into the quiet zone");
  // The mass floor guards untouched templates; a user-picked shape owns its
  // own mass (like the classic renderer) and is judged by the camera battery
  // instead — otherwise every low-coverage pick (Star, Cross, Bubbles…) would
  // trip the audit and push Fix scan to walk the whole ladder for no reason.
  if (!plan.userShape && plan.darkMass < MIN_DARK_MASS - 0.02) {
    problems.push(`dark modules carry only ${(plan.darkMass * 100).toFixed(0)}% mass`);
  }
  if (plan.lightMark > MAX_LIGHT_MARK + 0.001) {
    problems.push(`light-cell decoration covers ${(plan.lightMark * 100).toFixed(0)}% of the cell`);
  }
  if (plan.inks.separation < 0.44) {
    problems.push(`ink/paper luminance separation is only ${plan.inks.separation.toFixed(2)}`);
  }
  if (plan.quietZone < 3) problems.push("quiet zone narrower than 3 modules");
  if (plan.paints.filter((p) => p.role === "finder").length < 6) {
    problems.push("finder patterns are incomplete");
  }
  if (plan.paints.filter((p) => p.role === "timing").length === 0) {
    problems.push("timing pattern was not painted");
  }

  return {
    ok: problems.length === 0,
    problems,
    separation: plan.inks.separation,
    darkMass: plan.darkMass,
    lightMark: plan.lightMark,
    quietZoneClean,
    paintCount: plan.paints.length,
  };
}

/** Luminance summary — the studio meter shows this next to "Fix scan". */
export function planLuminance(plan: ArtPlan): { ink: number; paper: number; separation: number } {
  const ink =
    plan.inks.stops.map((s) => lumaOf(s)).reduce((a, b) => a + b, 0) / Math.max(1, plan.inks.stops.length);
  const paper = lumaOf(plan.paper);
  return { ink, paper, separation: Math.abs(ink - paper) };
}
