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
import type { ArtDetailLevel, ArtDirection, ArtFinder, ArtShape, QrStyle } from "../types";

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

/** Map a direction's module shape onto the painter vocabulary. */
export function paintShapeFor(shape: ArtShape): PaintShape {
  switch (shape) {
    case "dots":
      return "circle";
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
    case "cross":
      return "plus";
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
  return clamp(Math.sqrt(targetMass / coverageOf(shape)), 0.85, maxScale);
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
  const fs: FinderStyle = FINDER_STYLES[level === "lean" ? "solid" : dir.finder] ?? FINDER_STYLES.solid;
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
  const targetMass = clamp(
    level === "lean" ? Math.max(dir.mass, MIN_DARK_MASS + 0.08) : dir.mass,
    MIN_DARK_MASS,
    MAX_DARK_MASS,
  );
  const shape = dir.shape;
  const paintShape = paintShapeFor(shape);
  const radius = (level === "lean" ? Math.min(dir.radius, 0.3) : dir.radius) * cell;
  const perCell = dir.geometry === "single";
  const inner = 1 - gapInk;
  /**
   * Decorative silhouettes that cannot reach MIN_DARK_MASS even at full cell
   * size get a solid plate underneath: art on top, QR signal beneath. Anything
   * that can carry its own mass does, un-plated.
   */
  const needsPlate = perCell && needsPlateFor(shape, inner);
  /* The SHAPE RULE: a dark module must never become a tiny decorative dot.
   * Grouped geometry fills its cells and bridges the gaps, so the floor is
   * already met there; per-cell silhouettes either scale up to the floor or
   * ride on a plate that carries the mass for them. Either way the shape never
   * leaves its own cell — that is what keeps light modules light. */
  const scale = perCellScale(shape, targetMass, gapInk, needsPlate);

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
  const bridge = grouped && gapInk > 0.005;
  const side = cell * scale * inner;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y]![x]) continue;
          const run: Run = { cells: [[x, y]], x0: x, y0: y, x1: x, y1: y };
      const inset = (cell - side) / 2;
      const box = distort(
        { x: origin + x * cell + inset, y: origin + y * cell + inset, w: side, h: side },
        run,
        dir,
        cell,
        level,
      );
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

      paints.push({
        shape: paintShape,
        x: clipped.x,
        y: clipped.y,
        w: clipped.w,
        h: clipped.h,
        r: radius,
        corners: grouped ? corners : undefined,
        rot:
          paintShape === "facet" || paintShape === "gem"
            ? ((hash2(x, y) % 4) * Math.PI) / 8
            : undefined,
        vertical: shape === "vbar",
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
  if (plan.darkMass < MIN_DARK_MASS - 0.02) {
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
