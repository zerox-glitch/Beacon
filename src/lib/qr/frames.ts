/**
 * QR frames — decorative borders drawn AROUND the code, inside the quiet
 * margin, so they never touch the modules (scannability untouched). Frames
 * render in the canvas itself: studio preview, PNG export, phone-test —
 * what you see is what downloads. SVG export is the style-only vector and
 * does not include frames.
 *
 * Which frames visitors can use is admin-controlled (Admin → Branding →
 * Frames). "None" is always available.
 */
export type FrameId =
  | "none"
  | "soft"
  | "ticket"
  | "corners"
  | "neon"
  | "vintage"
  | "dots"
  | "gradient";

export const FRAME_IDS: FrameId[] = [
  "none",
  "soft",
  "ticket",
  "corners",
  "neon",
  "vintage",
  "dots",
  "gradient",
];

export interface FrameDef {
  id: FrameId;
  label: string;
  hint: string;
}

export const FRAME_DEFS: FrameDef[] = [
  { id: "none", label: "None", hint: "Just the code, edge to edge" },
  { id: "soft", label: "Soft", hint: "A thin, quiet border" },
  { id: "ticket", label: "Ticket", hint: "Rounded ticket with punched side notches" },
  { id: "corners", label: "Scan corners", hint: "Four camera-style corner brackets" },
  { id: "neon", label: "Neon ring", hint: "A glowing accent ring around the code" },
  { id: "vintage", label: "Vintage", hint: "A double rule with corner squares" },
  { id: "dots", label: "Dot ring", hint: "A ring of dots — playful print feel" },
  { id: "gradient", label: "Gradient", hint: "A border fading through the accent" },
];

export function frameDef(id: string): FrameDef {
  return FRAME_DEFS.find((f) => f.id === id) ?? FRAME_DEFS[0]!;
}

export interface FrameGeometry {
  /** Full canvas size (px, square). */
  px: number;
  /** Margin thickness reserved for the frame (0 = no frame). */
  band: number;
  /** QR body edge (origin) and side length. */
  origin: number;
  body: number;
  fg: string;
  bg: string;
}

function ring(
  ctx: CanvasRenderingContext2D,
  g: FrameGeometry,
  inset: number,
  radius: number,
  lineWidth: number,
  stroke: string | CanvasGradient,
) {
  const i = inset;
  const r = Math.min(radius, (g.px - i * 2) / 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(i + r, i);
  ctx.arcTo(g.px - i, i, g.px - i, g.px - i, r);
  ctx.arcTo(g.px - i, g.px - i, i, g.px - i, r);
  ctx.arcTo(i, g.px - i, i, i, r);
  ctx.arcTo(i, i, g.px - i, i, r);
  ctx.closePath();
  ctx.stroke();
}

const WARM = "#ece4d4";

/** Draw the chosen frame into the margin band. No-op for "none". */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: FrameId, g: FrameGeometry): void {
  if (frame === "none" || g.band <= 0) return;
  const e = g.band;
  const inset = e * 0.3;
  const lw = Math.max(1.5, e * 0.1);
  ctx.save();

  switch (frame) {
    case "soft": {
      ctx.globalAlpha = 0.35;
      ring(ctx, g, inset, e * 0.7, Math.max(1, e * 0.08), g.fg);
      break;
    }
    case "ticket": {
      ring(ctx, g, e * 0.22, e * 0.9, e * 0.11, g.fg);
      // punched notches mid-left / mid-right
      const nr = e * 0.26;
      ctx.fillStyle = g.bg;
      for (const nx of [e * 0.22, g.px - e * 0.22]) {
        ctx.beginPath();
        ctx.arc(nx, g.px / 2, nr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "corners": {
      const arm = g.body * 0.085;
      const w = Math.max(2, e * 0.26);
      ctx.strokeStyle = WARM;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      const c = inset * 0.4;
      const L: [number, number, number, number][] = [
        [c, c, 1, 1],
        [g.px - c, c, -1, 1],
        [c, g.px - c, 1, -1],
        [g.px - c, g.px - c, -1, -1],
      ];
      for (const [x, y, sx, sy] of L) {
        ctx.beginPath();
        ctx.moveTo(x + sx * arm, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * arm);
        ctx.stroke();
      }
      break;
    }
    case "neon": {
      ctx.shadowColor = WARM;
      ctx.shadowBlur = e * 0.55;
      ring(ctx, g, inset, e * 0.6, lw * 0.9, WARM);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.85;
      ring(ctx, g, inset, e * 0.6, Math.max(1, lw * 0.45), "#fff7e8");
      break;
    }
    case "vintage": {
      ring(ctx, g, e * 0.18, e * 0.5, e * 0.14, g.fg);
      ctx.globalAlpha = 0.75;
      const i2 = e * 0.62;
      ring(ctx, g, i2, e * 0.18, Math.max(1, e * 0.05), g.fg);
      // corner squares on the inner rule
      const s = e * 0.2;
      ctx.fillStyle = g.fg;
      for (const [x, y] of [
        [i2, i2],
        [g.px - i2, i2],
        [i2, g.px - i2],
        [g.px - i2, g.px - i2],
      ]) {
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      break;
    }
    case "dots": {
      const d = Math.max(2, e * 0.17);
      const step = e * 0.75;
      ctx.fillStyle = g.fg;
      const put = (x: number, y: number) => ctx.fillRect(x - d / 2, y - d / 2, d, d);
      const edge = (from: number, to: number) => {
        for (let p = from; p <= to; p += step) put(p, inset);
        for (let p = from; p <= to; p += step) put(p, g.px - inset);
        for (let p = from; p <= to; p += step) put(inset, p);
        for (let p = from; p <= to; p += step) put(g.px - inset, p);
      };
      edge(inset, g.px - inset);
      break;
    }
    case "gradient": {
      const grad = ctx.createLinearGradient(0, 0, g.px, g.px);
      grad.addColorStop(0, g.fg);
      grad.addColorStop(0.5, WARM);
      grad.addColorStop(1, g.fg);
      ring(ctx, g, inset, e * 0.6, lw * 1.15, grad);
      break;
    }
  }
  ctx.restore();
}

/** Margin (px) the canvas needs around the QR body for a frame. */
export function frameBandFor(frame: FrameId, px: number): number {
  return frame === "none" ? 0 : Math.max(10, Math.round(px * 0.045));
}
