export type FrameKind = "none" | "soft" | "ticket";

/** Wrap a QR canvas with optional paper frame + caption for download. */
export function finishExport(
  qr: HTMLCanvasElement,
  opts: { frame: FrameKind; caption: string; paper: string },
): HTMLCanvasElement {
  const caption = opts.caption.trim();
  const framed = opts.frame !== "none" || Boolean(caption);
  if (!framed) return qr;

  const pad = opts.frame === "ticket" ? Math.round(qr.width * 0.08) : Math.round(qr.width * 0.06);
  const capH = caption ? Math.round(qr.width * 0.12) : 0;
  const out = document.createElement("canvas");
  out.width = qr.width + pad * 2;
  out.height = qr.height + pad * 2 + capH;
  const ctx = out.getContext("2d");
  if (!ctx) return qr;

  ctx.fillStyle = opts.paper || "#f4efe6";
  if (opts.frame === "ticket") {
    roundRect(ctx, 0, 0, out.width, out.height, Math.round(out.width * 0.04));
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, out.width, out.height);
  }

  ctx.drawImage(qr, pad, pad);

  if (caption) {
    ctx.fillStyle = "#141412";
    ctx.font = `700 ${Math.round(qr.width * 0.055)}px "Figtree", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, out.width / 2, pad + qr.height + capH / 2, out.width - pad * 2);
  }
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const EXPORT_PRESETS: { id: string; label: string; px: number; kind: "png" | "svg" }[] = [
  { id: "png-2k", label: "PNG 2048 · print", px: 2048, kind: "png" },
  { id: "png-4k", label: "PNG 4096 · poster", px: 4096, kind: "png" },
  { id: "png-1k", label: "PNG 1080 · social", px: 1080, kind: "png" },
  { id: "png-card", label: "PNG 1200 · card", px: 1200, kind: "png" },
  { id: "svg", label: "SVG vector", px: 1000, kind: "svg" },
];
