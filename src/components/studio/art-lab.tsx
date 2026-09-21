import { useEffect, useState } from "react";
import { tryEncodePayload } from "@/lib/qr/encode";
import { SAMPLE_IMAGES } from "@/lib/qr/presets";
import { canvasPngBlob, loadImage, renderQr } from "@/lib/qr/render";
import { inspectPngBlob, inspectRenderedQr } from "@/lib/qr/scan-engine";
import { DEFAULT_STYLE, emptyPayload, type ImageMode, type QrStyle } from "@/lib/qr/types";

const MODES: { id: ImageMode; label: string }[] = [
  { id: "paint", label: "Photo" },
  { id: "mosaic", label: "Blend" },
  { id: "halftone", label: "Halftone" },
  { id: "duotone", label: "Duotone" },
  { id: "mono", label: "Mono" },
];

const LAB_IMAGES = SAMPLE_IMAGES.slice(0, 4);

interface Cell {
  src: string;
  mode: ImageMode;
  url: string;
  ok: boolean;
  pngOk: boolean | null;
}

function styleFor(mode: ImageMode): QrStyle {
  return {
    ...DEFAULT_STYLE,
    imageMode: mode,
    artisticStrength: 0.44,
    contrast: 0.84,
    quietZone: 3,
    moduleShape: "square",
    effect: "none",
  };
}

export function ArtLab() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRunning(true);
      setStatus("Rendering weaves…");
      const payload = emptyPayload();
      payload.url = "https://qrwho.vercel.app/lab";
      const next: Cell[] = [];
      for (const img of LAB_IMAGES) {
        const art = await loadImage(img.src).catch(() => null);
        if (!art || cancelled) continue;
        for (const mode of MODES) {
          const style = styleFor(mode.id);
          const enc = tryEncodePayload(payload, style);
          if (!enc.ok) continue;
          const canvas = document.createElement("canvas");
          renderQr(canvas, enc.qr, style, { pixelSize: 360, art, exportScale: true });
          const report = await inspectRenderedQr(canvas, payload.url);
          let pngOk: boolean | null = null;
          try {
            const blob = await canvasPngBlob(canvas);
            pngOk = (await inspectPngBlob(blob, payload.url)).ok;
          } catch {
            pngOk = false;
          }
          next.push({
            src: img.src,
            mode: mode.id,
            url: canvas.toDataURL("image/jpeg", 0.72),
            ok: report.ok,
            pngOk,
          });
          if (cancelled) return;
          setCells([...next]);
        }
      }
      if (!cancelled) {
        const pass = next.filter((c) => c.ok && c.pngOk).length;
        setStatus(`${pass}/${next.length} weaves decoded (canvas + PNG)`);
        setRunning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ok">Weaver lab</p>
        <h1 className="font-display mt-1 text-3xl italic">Original vs weave, same matrix</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Deterministic Photo / Blend / Halftone / Duotone / Mono on four samples. Each cell is
          decoded with jsQR at native, 480 and 360 — including the exported PNG, not only the
          preview canvas. No AI.
        </p>
        <p className="mt-2 text-xs font-medium text-fg/80">{running ? "Rendering…" : status}</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted">
                <th className="p-2">Original</th>
                {MODES.map((m) => (
                  <th key={m.id} className="p-2">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAB_IMAGES.map((img) => (
                <tr key={img.id} className="align-top">
                  <td className="p-2">
                    <img src={img.src} alt={img.name} className="size-28 rounded-md object-cover" />
                    <p className="mt-1 font-medium">{img.name}</p>
                  </td>
                  {MODES.map((m) => {
                    const cell = cells.find((c) => c.src === img.src && c.mode === m.id);
                    return (
                      <td key={m.id} className="p-2">
                        {cell ? (
                          <div>
                            <img src={cell.url} alt={`${img.name} ${m.label}`} className="size-28 rounded-md bg-white" />
                            <p className={cell.ok ? "mt-1 text-ok" : "mt-1 text-danger"}>
                              {cell.ok ? "canvas ✓" : "canvas ✗"}
                              {cell.pngOk == null ? "" : cell.pngOk ? " · png ✓" : " · png ✗"}
                            </p>
                          </div>
                        ) : (
                          <div className="size-28 rounded-md border border-dashed border-border" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-[11px] text-subtle">
          Standard (non-picture) QR still uses the original renderer. This page only exercises the
          artistic weaver.
        </p>
      </div>
    </div>
  );
}
