/**
 * Shape-picker preview components. The painting itself lives in
 * shape-glyphs.ts (a port of the mobile app's ShapeVisuals.kt); these are
 * the React canvas wrappers the design panel renders. Colours follow the
 * app: unselected shapes are zinc #D4D4D8; selection is Electric Cyan
 * #00F0FF (modules, pupils) and Neon Violet #7A5AF8 (frames).
 */
import { useEffect, useRef } from "react";
import type { EyeShape, ModuleShape } from "@/lib/qr/types";
import { drawEyeBallGlyph, drawEyeFrameGlyph, drawModuleClusterIcon } from "./shape-glyphs";

function setup(ref: React.RefObject<HTMLCanvasElement | null>, size: number) {
  const c = ref.current;
  if (!c) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  return ctx;
}

function Glyph({
  size,
  draw,
}: {
  size: number;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = setup(ref, size);
    if (!ctx) return;
    draw(ctx, size);
  }, [draw, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

/** 2×2 cluster of the dot shape — the app's ModuleShapeVisualTile. */
export function ModuleShapeIcon({
  shape,
  color,
  size = 22,
}: {
  shape: ModuleShape;
  color: string;
  size?: number;
}) {
  return <Glyph size={size} draw={(ctx, s) => drawModuleClusterIcon(ctx, s, shape, color)} />;
}

/** Stroke-outline silhouette — the app's EyeShapeVisualTile. */
export function EyeFrameIcon({
  shape,
  color,
  size = 24,
}: {
  shape: EyeShape;
  color: string;
  size?: number;
}) {
  return <Glyph size={size} draw={(ctx, s) => drawEyeFrameGlyph(ctx, s, shape, color)} />;
}

/** Solid pupil behind a faint finder hint — the app's EyeBallVisualTile. */
export function EyeBallIcon({
  shape,
  color,
  size = 24,
}: {
  shape: EyeShape;
  color: string;
  size?: number;
}) {
  return <Glyph size={size} draw={(ctx, s) => drawEyeBallGlyph(ctx, s, shape, color)} />;
}
