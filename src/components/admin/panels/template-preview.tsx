/**
 * Live QR preview for the template editor — renders the *exact* pipeline the
 * studio uses (uqr encode → renderQr), including the chosen artwork, so what
 * the admin sees is what visitors get. Re-renders on any style change.
 */
import { useEffect, useRef } from "react";
import { encode } from "uqr";
import { loadImage, renderQr } from "@/lib/qr/render";
import { DEFAULT_STYLE, type Preset } from "@/lib/qr/types";

export function TemplatePreview({ preset, size = 224 }: { preset: Preset; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const alive = useRef(0);

  useEffect(() => {
    const token = ++alive.current;
    void token;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const style = { ...DEFAULT_STYLE, ...preset.style };
    void (async () => {
      const art = preset.artUrl ? await loadImage(preset.artUrl).catch(() => null) : null;
      if (alive.current !== token) return;
      try {
        const qr = encode("https://qrwho.app/preview", {
          ecc: art ? "H" : "M",
          minVersion: style.minVersion,
          border: 0,
        });
        renderQr(canvas, qr, style, { pixelSize: size, art, exportScale: true });
      } catch {
        /* render race — next edit repaints */
      }
    })();
  }, [preset.id, preset.style, preset.artUrl, size]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} className="size-full" aria-label="Template preview" />
    </div>
  );
}
