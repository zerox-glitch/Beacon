import {
  Check,
  Copy,
  Download,
  FileCode2,
  ImageDown,
  Loader2,
  Minus,
  Plus,
  Printer,
  Shuffle,
  Smartphone,
  Wand2,
} from "lucide-react";
import { autoSafetyBoost } from "@/lib/qr/art/optimizer";
import { autoFixScan } from "@/lib/qr/autofix";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DestinationDock } from "@/components/studio/destination-dock";
import { ScannabilityMeter } from "@/components/studio/scannability-meter";
import { tryEncodePayload } from "@/lib/qr/encode";
import { finishExport } from "@/lib/qr/finish";
import { buildPayload, payloadLabel } from "@/lib/qr/payload";
import { GALLERY_PRESETS, PRESETS } from "@/lib/qr/presets";
import { canvasPngBlob, loadImage, renderQr } from "@/lib/qr/render";
import { inspectPngBlob, inspectRenderedQr } from "@/lib/qr/scan-engine";
import { downloadSvg, exportQrSvg } from "@/lib/qr/svg-export";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

function makeCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

export function QrStage() {
  const innerRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const payload = useStudio((s) => s.payload);
  const style = useStudio((s) => s.style);
  const imageUrl = useStudio((s) => s.imageUrl);
  const logoUrl = useStudio((s) => s.logoUrl);
  const scanOk = useStudio((s) => s.scanOk);
  const presetId = useStudio((s) => s.presetId);
  const error = useStudio((s) => s.error);
  const [copied, setCopied] = useState(false);
  const [px, setPx] = useState(220);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [testOpen, setTestOpen] = useState(false);
  const setImageUrl = useStudio((s) => s.setImageUrl);
  const caption = useStudio((s) => s.caption);
  const frame = useStudio((s) => s.frame);
  const rendering = useStudio((s) => s.rendering);
  const boostRef = useRef(0);

  function onDropImage(e: React.DragEvent<HTMLDivElement>) {
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      setImageUrl(URL.createObjectURL(f));
      toast.success("Picture added");
    }
  }

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setPx(Math.max(180, Math.min(420, Math.floor(w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    useStudio.getState().setRendering(true);
    const handle = window.setTimeout(async () => {
      const encoded = tryEncodePayload(payload, style);
      if (!encoded.ok) {
        useStudio.getState().setError(encoded.error);
        useStudio.getState().setScan(null, null);
        useStudio.getState().setRendering(false);
        return;
      }
      useStudio.getState().setError(null);
      const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
      const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
      if (cancelled) return;
      const canvas = workRef.current;
      if (!canvas) {
        useStudio.getState().setRendering(false);
        return;
      }
      const expected = buildPayload(payload).trim() || null;
      const pictured = Boolean(art) && style.imageMode !== "none" && style.imageMode !== "logo";
      try {
        if (pictured) {
          const { boost, report } = await autoSafetyBoost(canvas, payload, style, {
            pixelSize: px,
            art,
            logo,
            expected,
          });
          boostRef.current = report.ok ? boost : 0;
          if (!cancelled) useStudio.getState().setScan(report.ok, report.decoded);
        } else {
          boostRef.current = 0;
          renderQr(canvas, encoded.qr, style, { pixelSize: px, art, logo, exportScale: true });
          const report = await inspectRenderedQr(canvas, expected);
          if (!cancelled) useStudio.getState().setScan(report.ok, report.decoded);
        }
      } catch {
        if (!cancelled) useStudio.getState().setScan(null, null);
      } finally {
        if (!cancelled) useStudio.getState().setRendering(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [payload, style, imageUrl, logoUrl, px]);

  async function renderExport(size: number) {
    const encoded = tryEncodePayload(payload, style);
    if (!encoded.ok) throw new Error(encoded.error);
    const canvas = makeCanvas();
    const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
    const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
    const pictured = Boolean(art) && style.imageMode !== "none" && style.imageMode !== "logo";
    if (pictured) {
      const expected = buildPayload(payload).trim() || null;
      renderQr(canvas, encoded.qr, style, {
        pixelSize: size,
        art,
        logo,
        exportScale: true,
        kernelBoost: boostRef.current,
      });
      const report = await inspectRenderedQr(canvas, expected);
      if (!report.ok) {
        await autoSafetyBoost(canvas, payload, style, {
          pixelSize: size,
          art,
          logo,
          expected,
        });
      }
    } else {
      renderQr(canvas, encoded.qr, style, { pixelSize: size, art, logo, exportScale: true });
    }
    return finishExport(canvas, { frame, caption, paper: style.bg });
  }

  async function onDownload() {
    try {
      const canvas = await renderExport(2048);
      const expected = buildPayload(payload).trim() || null;
      const blob = await canvasPngBlob(canvas);
      const pngReport = await inspectPngBlob(blob, expected);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qrwho-qr.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      const thumb = workRef.current?.toDataURL("image/jpeg", 0.6) ?? "";
      useStudio.getState().pushHistory({
        label: payloadLabel(payload),
        payload: { ...payload },
        style: { ...style },
        imageUrl: imageUrl?.startsWith("blob:") ? null : imageUrl,
        thumb,
        caption,
        frame,
      });
      if (pngReport.ok) toast.success("PNG saved (2048px) — jsQR read native / 480 / 360");
      else toast.error("PNG saved, but jsQR could not read the file. Try Fix scan before print.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  function onDownloadSvg() {
    try {
      const encoded = tryEncodePayload(payload, style);
      if (!encoded.ok) throw new Error(encoded.error);
      if (style.imageMode !== "none" && imageUrl) {
        toast.message("Use PNG for picture codes — SVG is the style-only vector.");
      }
      const svg = exportQrSvg(encoded.qr, style, 1000);
      downloadSvg(svg, "qrwho-vector.svg");
      toast.success("Vector SVG saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SVG export failed");
    }
  }

  async function onCopyImage() {
    try {
      const canvas = await renderExport(1024);
      const blob = await canvasPngBlob(canvas);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success("Copied image");
    } catch {
      toast.error("Clipboard is blocked in this browser");
    }
  }

  async function onCopyPayload() {
    const text = buildPayload(payload);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied destination");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function onPrint() {
    try {
      const canvas = await renderExport(1600);
      const url = canvas.toDataURL("image/png");
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(
        `<html><head><title>QRWho</title><style>html,body{margin:0;background:#fff}img{display:block;width:80vmin;margin:8vh auto}</style></head><body><img src="${url}" /></body></html>`,
      );
      doc.close();
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        window.setTimeout(() => frame.remove(), 1000);
      };
    } catch {
      toast.error("Print failed");
    }
  }

  function surprise() {
    const pick = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    if (pick) useStudio.getState().applyPreset(pick.id);
  }

  async function onAutoFix() {
    if (fixing) return;
    setFixing(true);
    try {
      const result = await autoFixScan(payload, style, imageUrl, logoUrl);
      useStudio.getState().setFixNotes(result.notes);
      if (Object.keys(result.patch).length === 0) {
        toast.success("Already scannable");
      } else {
        useStudio.getState().patchStyle(result.patch);
        toast.success(`Fix scan: ${result.notes[result.notes.length - 1]}`);
      }
    } finally {
      setFixing(false);
    }
  }

  const paper = style.bg;

  function openPhoneTest() {
    const canvas = workRef.current;
    setPreview(canvas && canvas.width > 0 ? canvas.toDataURL("image/png") : "");
    setTestOpen(true);
  }

  return (
    <div className="relative z-10 flex w-full flex-col items-center justify-center gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-5">
      <DestinationDock />
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDropImage}
        className={cn(
          "qr-mat relative w-full max-w-[210px] p-2.5 transition duration-200 sm:max-w-[300px] sm:p-4 md:max-w-[380px] md:p-5 lg:max-w-[420px]",
          frame === "ticket" ? "rounded-[28px]" : "rounded-2xl",
        )}
        style={{
          transform: `scale(${zoom})`,
          background: frame === "none" ? undefined : paper,
        }}
      >
        <div
          ref={innerRef}
          className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl"
          style={{ background: paper }}
        >
          <canvas ref={workRef} className="block size-full" aria-label="QR code preview" />
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/55 text-xs font-semibold tracking-wide text-fg">
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Rendering…
            </div>
          )}
          {dragging && (
            <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-accent/60 bg-bg/70 p-4 text-center text-xs font-medium text-fg">
              Drop picture to style code
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/80 p-4 text-center text-xs text-danger">
              {error}
            </div>
          )}
        </div>
        {caption.trim() ? (
          <p className="mt-2 text-center text-[11px] font-bold tracking-[0.18em] text-fg sm:text-xs">
            {caption.trim()}
          </p>
        ) : null}
        <div className="pointer-events-none absolute left-2 top-2 z-10 sm:left-4 sm:top-4">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur sm:text-xs",
              scanOk
                ? "border-ok/40 bg-bg/90 text-ok"
                : scanOk === false
                  ? "border-warn/40 bg-bg/90 text-warn"
                  : "border-border bg-bg/90 text-muted",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                scanOk ? "bg-ok" : scanOk === false ? "bg-warn animate-pulse" : "bg-muted",
              )}
            />
            {scanOk ? "Scannable" : scanOk === false ? "Needs tune" : "Checking"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.82, z - 0.08))}
          className="inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-bg/80 text-fg hover:bg-white/10"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-10 text-center text-[11px] font-semibold tabular-nums text-fg/80">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.2, z + 0.08))}
          className="inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-bg/80 text-fg hover:bg-white/10"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={openPhoneTest}
          className="ml-1 inline-flex h-8 items-center gap-1 rounded-full border border-white/20 bg-bg/80 px-2.5 text-[11px] font-semibold text-fg hover:bg-white/10"
        >
          <Smartphone className="size-3.5" />
          Test on phone
        </button>
      </div>

      <ScannabilityMeter
        scanOk={scanOk}
        style={style}
        hasImage={Boolean(imageUrl) && style.imageMode !== "none"}
        onAutoFix={onAutoFix}
        fixing={fixing}
      />

      <div className="action-bar z-10 flex w-full max-w-[210px] flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/20 p-2 sm:max-w-[300px] md:max-w-[380px] lg:max-w-[420px]">
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-bold text-accent-fg shadow-md transition hover:brightness-110 active:scale-[0.97] sm:flex-none sm:px-4"
        >
          <Download className="size-4" />
          Save PNG
        </button>
        <button
          type="button"
          onClick={onDownloadSvg}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-bold text-fg transition hover:bg-white/20 active:scale-[0.97]"
        >
          <FileCode2 className="size-4" />
          SVG
        </button>
        <button
          type="button"
          onClick={onAutoFix}
          disabled={fixing}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60",
            scanOk === false
              ? "border-warn bg-warn text-bg"
              : "border-white/25 bg-white/10 text-fg hover:bg-white/20",
          )}
        >
          {fixing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {fixing ? "Tuning…" : "Fix scan"}
        </button>
        <button
          type="button"
          onClick={onCopyImage}
          className="inline-flex size-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-fg transition hover:bg-white/20 active:scale-[0.97]"
          aria-label="Copy image"
        >
          {copied ? <Check className="size-4 text-ok" /> : <ImageDown className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onCopyPayload}
          className="inline-flex size-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-fg transition hover:bg-white/20 active:scale-[0.97]"
          aria-label="Copy destination"
        >
          <Copy className="size-4" />
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="hidden size-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-fg transition hover:bg-white/20 active:scale-[0.97] sm:inline-flex"
          aria-label="Print"
        >
          <Printer className="size-4" />
        </button>
        <button
          type="button"
          onClick={surprise}
          className="inline-flex size-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-fg transition hover:bg-white/20 active:scale-[0.97]"
          aria-label="Surprise preset"
        >
          <Shuffle className="size-4" />
        </button>
      </div>

      <div className="w-full max-w-[210px] sm:max-w-[300px] md:max-w-[380px] lg:max-w-[420px]">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold tracking-wide text-fg/80 sm:text-[11px]">
          Steal a look — summit, peony, dusk
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {GALLERY_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => useStudio.getState().applyPreset(p.id)}
              className={cn(
                "relative size-12 shrink-0 overflow-hidden rounded-md border sm:size-14",
                presetId === p.id ? "border-accent ring-1 ring-accent/50" : "border-border",
              )}
            >
              {p.artUrl ? (
                <img src={p.artUrl} alt={p.name} className="size-full object-cover" />
              ) : (
                <span className="block size-full" style={{ background: p.style.bg }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {testOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Test on phone"
          onClick={() => setTestOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-bg p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xl italic">Point your camera here</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              This preview is the same bitmap Fix scan reads with jsQR in the browser. Phone cameras
              can be stricter or more lenient — we do not guarantee every device.
            </p>
            {preview && (
              <img
                src={preview}
                alt="QR preview for phone test"
                className="mx-auto mt-4 w-56 rounded-xl"
                style={{ background: paper }}
              />
            )}
            {caption.trim() ? (
              <p className="mt-2 text-center text-xs font-bold tracking-[0.18em]">{caption.trim()}</p>
            ) : null}
            <button
              type="button"
              className="mt-4 h-11 w-full rounded-xl bg-accent text-sm font-bold text-accent-fg"
              onClick={() => setTestOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
