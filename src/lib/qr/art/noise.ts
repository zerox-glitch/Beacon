/**
 * Deterministic noise for the art system. Same integers in the browser and in
 * node, so an offline validation render matches the studio pixel-for-pixel.
 * No `Math.random` anywhere in this pipeline — that is what "deterministic
 * renderer" means here.
 */

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Deterministic value in [-1, 1]. */
export function wobble(x: number, y: number): number {
  return (hash2(x, y) % 2000) / 1000 - 1;
}

/** Deterministic value in [0, 1). */
export function pick(x: number, y: number): number {
  return (hash2(x, y) % 1000) / 1000;
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}
