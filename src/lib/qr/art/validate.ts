/**
 * ART QR STYLE SYSTEM — automatic validation.
 *
 * Every generated style is tested against:
 *
 *   • native decode            — the exported bitmap, read as-is
 *   • downscaled decode        — 75% / 50% / 33% (sensor binning)
 *   • blur decode              — lens + ISP softness
 *   • contrast variation       — flat light, bright wall, dim room
 *   • perspective variation    — off-axis capture
 *   • final exported PNG       — JPEG frame compression at 50% scale
 *
 * …which is exactly the camera battery the photo engine already ships
 * (`photo/camera-sim.ts`), reused here so there is one definition of "a phone
 * can read this".
 *
 * A style that looks beautiful but fails automatically walks the relax ladder
 * (`art/relax.ts`) — shape, grouping, spacing, decoration, colour separation —
 * and only reaches for the camera-safe cut of the same design at the last
 * rung. It never silently becomes a plain QR: that is the caller's decision,
 * not the validator's.
 */

import { encode } from "uqr";
import { MIN_SEPARATION, getArtDirection } from "../art-directions";
import { buildPayload } from "../payload";
import { CAMERA_ROBUST_REQUIRED, runCameraBattery, type BatteryResult } from "../photo/camera-sim";
import type { Bitmap } from "../photo/imaging";
import { relaxLadder } from "./relax";
import { buildArtPlan, auditPlan, type ArtPlan, type PlanAudit } from "./art-plan";
import { rasterizeArtPlan } from "./rasterize";
import type { ArtDirection, EccLevel, Payload, QrStyle } from "../types";

export type DecodeFn = (bm: Bitmap) => string | null;

export interface ValidationAttempt {
  rung: number;
  note: string;
  dimension: string;
  native: boolean;
  robustness: number;
  cameraRobust: boolean;
  failed: string[];
  audit: PlanAudit;
  ppm: number;
  level: ArtPlan["level"];
  separation: number;
}

export interface ValidationResult {
  directionId: string;
  directionName: string;
  ok: boolean;
  /** Rung that passed (0 = the direction as authored). */
  rung: number;
  /** What had to change to get there. */
  notes: string[];
  robustness: number;
  cameraRobust: boolean;
  attempts: ValidationAttempt[];
  /** The plan that passed — the caller can paint it straight to canvas. */
  plan: ArtPlan;
}

export interface ValidateInput {
  payload: Payload;
  style: QrStyle;
  decode: DecodeFn;
  /** Bitmap edge in device pixels (the exported PNG size). */
  px?: number;
  /** Supersampling for the rasterizer. */
  ss?: number;
  /** Stop after the first rung that passes (default true). */
  firstPass?: boolean;
}

const DEFAULT_PX = 512;

/** Encode the payload exactly the way the studio does for a styled (non-photo) QR. */
function encodeFor(payload: Payload, style: QrStyle) {
  const text = buildPayload(payload).trim() || "https://qrwho.vercel.app";
  return encode(text, {
    ecc: (style.ecc ?? "Q") as EccLevel,
    boostEcc: false,
    minVersion: style.minVersion || 1,
    border: 0,
    maskPattern: (style.maskPattern ?? -1) >= 0 ? style.maskPattern : undefined,
  });
}

/**
 * Template kits ship with a centre logo plate (imageMode "logo"), so their
 * validation must assume the plate is there: stamp a worst-case opaque paper
 * rounded square over the middle before decoding. ECC Q recovers ~25% of
 * codewords and the plate costs ~7% of the body area, but the battery has to
 * prove it, not assume it.
 */
function stampLogoPlate(bm: Bitmap, plan: ArtPlan): void {
  const body = plan.cell * plan.modules;
  const size = body * 0.3; // logoScale 0.24 + its padding, rounded up
  const x0 = plan.origin + (body - size) / 2;
  const y0 = plan.origin + (body - size) / 2;
  const r = size * 0.12;
  const bg = plan.inks.bg;
  const cr = parseInt(bg.slice(1, 3), 16);
  const cg = parseInt(bg.slice(3, 5), 16);
  const cb = parseInt(bg.slice(5, 7), 16);
  for (let y = Math.floor(y0); y < Math.ceil(y0 + size); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + size); x++) {
      const dx = Math.max(x0 - x, x - (x0 + size - 1), 0);
      const dy = Math.max(y0 - y, y - (y0 + size - 1), 0);
      const inside = dx + dy <= 0 ? true : Math.hypot(dx, dy) <= r;
      if (!inside) continue;
      const i = (y * bm.w + x) * 4;
      bm.data[i] = cr;
      bm.data[i + 1] = cg;
      bm.data[i + 2] = cb;
      bm.data[i + 3] = 255;
    }
  }
}

export function validateArtDirection(input: ValidateInput): ValidationResult {
  const dir = getArtDirection(input.style.artDirection);
  const px = input.px ?? DEFAULT_PX;
  if (!dir) {
    throw new Error(`Unknown art direction: ${String(input.style.artDirection)}`);
  }
  const expected = buildPayload(input.payload).trim() || "https://qrwho.vercel.app";
  const qr = encodeFor(input.payload, input.style);
  const rungs = relaxLadder(input.style);
  const attempts: ValidationAttempt[] = [];

  let winner: { plan: ArtPlan; attempt: ValidationAttempt } | null = null;

  for (const rung of rungs) {
    const style: QrStyle = { ...input.style, ...rung.patch };
    const localQr = rung.patch.ecc || rung.patch.maskPattern !== undefined ? encodeFor(input.payload, style) : qr;
    const plan = buildArtPlan({
      qr: localQr,
      style,
      direction: dir,
      px,
      relax: rung.level,
      cameraSafe: rung.cameraSafe,
    });
    const audit = auditPlan(plan);
    const bm = rasterizeArtPlan(plan, { ss: input.ss });
    if (dir.category === "Templates") stampLogoPlate(bm, plan);
    const native = input.decode(bm) === expected;
    const battery: BatteryResult = runCameraBattery(bm, input.decode, expected);
    const attempt: ValidationAttempt = {
      rung: rung.level,
      note: rung.note,
      dimension: rung.dimension,
      native,
      robustness: battery.robustness,
      cameraRobust: battery.cameraRobust,
      failed: [...battery.failed],
      audit,
      ppm: plan.ppm,
      level: plan.level,
      separation: plan.inks.separation,
    };
    attempts.push(attempt);

    const passed =
      native &&
      battery.cameraRobust &&
      CAMERA_ROBUST_REQUIRED.every((id) => battery.passed.has(id)) &&
      audit.ok;

    if (passed) {
      winner = { plan, attempt };
      if (input.firstPass !== false) break;
    }
  }

  const best: ValidationAttempt | null = winner
    ? winner.attempt
    : attempts.reduce<ValidationAttempt | null>(
        (acc, a) => (!acc || a.robustness > acc.robustness ? a : acc),
        null,
      );
  const finalPlan =
    winner?.plan ??
    buildArtPlan({
      qr,
      style: input.style,
      direction: dir,
      px,
      relax: best?.rung ?? 0,
      cameraSafe: best?.rung === rungs.length - 1,
    });

  return {
    directionId: dir.id,
    directionName: dir.name,
    ok: Boolean(winner),
    rung: winner ? winner.attempt.rung : -1,
    notes: winner
      ? attempts.slice(0, winner.attempt.rung).map((a) => a.note)
      : attempts.map((a) => `${a.note}: still failed (${a.failed.join(", ") || "audit"})`),
    robustness: best?.robustness ?? 0,
    cameraRobust: best?.cameraRobust ?? false,
    attempts,
    plan: finalPlan,
  };
}

/** jsQR-backed decoder — works identically in the browser and in node. */
export function makeJsQrDecoder(jsQR: (data: Uint8ClampedArray, w: number, h: number, opts?: unknown) => { data: string } | null): DecodeFn {
  return (bm) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

/** Summary row for the QA table / `npm run validate:art`. */
export interface DirectionRow {
  id: string;
  name: string;
  category: string;
  ok: boolean;
  rung: number;
  robustness: number;
  separation: number;
  level: string;
  ppm: number;
  failed: string;
}

export function summarize(result: ValidationResult, dir: ArtDirection): DirectionRow {
  const attempt = result.attempts[result.attempts.length - 1];
  return {
    id: dir.id,
    name: dir.name,
    category: dir.category,
    ok: result.ok,
    rung: result.rung,
    robustness: result.robustness,
    separation: attempt?.separation ?? 0,
    level: attempt?.level ?? "rich",
    ppm: attempt?.ppm ?? 0,
    failed: attempt?.failed.join(",") ?? "",
  };
}

export { MIN_SEPARATION };
