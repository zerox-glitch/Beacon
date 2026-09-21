/** Empirical kernel sizing. Not a universal “1/3 is safe” rule. */

export interface KernelContext {
  strength: number;
  contrast: number;
  version: number;
  cellPx: number;
  quietZone: number;
  /** Extra kernel from auto-safety (0–1) after a failed decode. */
  boost?: number;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

/**
 * Fraction of the module taken by the machine-readable center.
 *
 * Floor depends on physical module size (px/module), QR version, quiet zone,
 * contrast and artistic strength. Tiny preview modules need a larger kernel;
 * a 2048px export can keep a much smaller center and still scan.
 */
export function kernelFrac(ctx: KernelContext): number {
  const cell = ctx.cellPx;
  let floor: number;
  if (cell < 5) floor = 0.5;
  else if (cell < 8) floor = 0.4;
  else if (cell < 12) floor = 0.32;
  else if (cell < 18) floor = 0.26;
  else floor = 0.22;

  const versionLift = ctx.version <= 2 ? 0.1 : ctx.version <= 4 ? 0.06 : ctx.version <= 6 ? 0.03 : 0;
  const qzLift = ctx.quietZone < 2 ? 0.05 : 0;
  const boost = clamp(ctx.boost ?? 0, 0, 1) * 0.18;
  const raw =
    0.5 -
    clamp(ctx.strength, 0, 1) * 0.26 -
    (1 - clamp(ctx.contrast, 0.35, 1)) * 0.04 +
    versionLift +
    qzLift +
    boost;
  return clamp(raw, floor, 0.64);
}

export function kernelTarget(dark: boolean, strength: number, contrast: number): number {
  const s = clamp(strength, 0, 1);
  const c = clamp(contrast, 0.35, 1);
  if (dark) return clamp(0.04 + s * 0.09 * (1.15 - c), 0.03, 0.18);
  return clamp(0.96 - s * 0.07 * (1.15 - c), 0.82, 0.98);
}

/**
 * How hard Photo QR pushes each module toward its bit (0 = photo wins, 1 = bit wins).
 * Used by the full-bleed luminance weaver — not a visible kernel disc.
 */
export function lumaBias(ctx: KernelContext): number {
  const cell = ctx.cellPx;
  let floor: number;
  if (cell < 5) floor = 0.58;
  else if (cell < 8) floor = 0.46;
  else if (cell < 12) floor = 0.36;
  else if (cell < 18) floor = 0.28;
  else floor = 0.22;

  const versionLift = ctx.version <= 2 ? 0.12 : ctx.version <= 4 ? 0.07 : ctx.version <= 6 ? 0.04 : 0;
  const qzLift = ctx.quietZone < 2 ? 0.06 : 0;
  const boost = clamp(ctx.boost ?? 0, 0, 1) * 0.32;
  const contrastLift = (1 - clamp(ctx.contrast, 0.35, 1)) * 0.1;
  const raw =
    0.76 -
    clamp(ctx.strength, 0, 1) * 0.4 +
    versionLift +
    qzLift +
    contrastLift +
    boost;
  return clamp(raw, floor, 0.92);
}

/** Surround may keep more of the photo as strength rises. */
export function surroundTarget(photoL: number, dark: boolean, strength: number): number {
  const s = clamp(strength, 0, 1);
  if (dark) {
    const safe = Math.min(photoL, 0.3);
    return clamp(safe + (photoL - safe) * s * 0.95, 0, 0.8);
  }
  const safe = Math.max(photoL, 0.78);
  return clamp(safe + (photoL - safe) * s * 0.95, 0.28, 1);
}
