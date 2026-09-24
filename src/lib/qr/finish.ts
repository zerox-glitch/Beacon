/** Frames now render inside the QR canvas itself (see frames.ts) — what
 * downloads is what previews. finishExport only appends the optional caption
 * strip; the frame parameter is kept for call-site compatibility. */
export function finishExport(
  qr: HTMLCanvasElement,
  opts: { frame: string; caption: string; paper: string },
): HTMLCanvasElement {
  const caption = opts.caption.trim();
  if (!caption) return qr;

  const pad = Math.round(qr.width * 0.06);
  const capH = Math.round(qr.width * 0.12);
  const out = document.createElement("canvas");
  out.width = qr.width + pad * 2;
  out.height = qr.height + pad * 2 + capH;
  const ctx = out.getContext("2d");
  if (!ctx) return qr;

  ctx.fillStyle = opts.paper || "#f4efe6";
  ctx.fillRect(0, 0, out.width, out.height);

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


export const EXPORT_PRESETS: { id: string; label: string; px: number; kind: "png" | "svg" }[] = [
  { id: "png-2k", label: "PNG 2048 · print", px: 2048, kind: "png" },
  { id: "png-4k", label: "PNG 4096 · poster", px: 4096, kind: "png" },
  { id: "png-1k", label: "PNG 1080 · social", px: 1080, kind: "png" },
  { id: "png-card", label: "PNG 1200 · card", px: 1200, kind: "png" },
  { id: "svg", label: "SVG vector", px: 1000, kind: "svg" },
];
