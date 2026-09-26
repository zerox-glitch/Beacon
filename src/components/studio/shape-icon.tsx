/**
 * Tiny live previews of the ACTUAL renderers — the same drawModuleShape /
 * drawEye calls the QR uses, so what you pick is pixel-for-pixel what the
 * code gets (no icon-font approximations, no names to guess at).
 */
import { useEffect, useRef } from "react";
import { drawEye, drawModuleShape } from "@/lib/qr/render";
import type { EyeShape, ModuleShape } from "@/lib/qr/types";

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

export function ModuleShapeIcon({
  shape,
  color,
  size = 22,
}: {
  shape: ModuleShape;
  color: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = setup(ref, size);
    if (!ctx) return;
    ctx.fillStyle = color;
    const s = size * 0.74;
    // Fixed grid coords → confetti/dash/bubbles variants are stable per shape.
    drawModuleShape(ctx, (size - s) / 2, (size - s) / 2, s, shape, undefined, {
      gx: 3,
      gy: 5,
      size: 21,
    });
  }, [shape, color, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

export function EyeIcon({
  frame,
  ball,
  ink,
  pupil,
  paper,
  size = 24,
}: {
  frame: EyeShape;
  ball: EyeShape;
  ink: string;
  pupil: string;
  paper: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = setup(ref, size);
    if (!ctx) return;
    // A real 7×7 finder eye, edge to edge.
    drawEye(ctx, 0, 0, size / 7, frame, ball, ink, pupil, paper);
  }, [frame, ball, ink, pupil, paper, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
