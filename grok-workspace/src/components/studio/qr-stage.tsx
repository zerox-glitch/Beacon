import { Check, Copy, Download, ImageDown, Printer, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { tryEncodePayload } from "@/lib/qr/encode";
import { buildPayload, payloadLabel } from "@/lib/qr/payload";
import { PRESETS } from "@/lib/qr/presets";
import { canvasPngBlob, downloadCanvasPng, loadImage, renderQr } from "@/lib/qr/render";
import { verifyQr } from "@/lib/qr/verify";
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
  const error = useStudio((s) => s.error);
  const [copied, setCopied] = useState(false);
  const [px, setPx] = useState(420);
  const [preview, setPreview] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const matRef = useRef<HTMLDivElement>(null);
  const setImageUrl = useStudio((s) => s.setImageUrl);

  function onTilt(e: React.PointerEvent<HTMLDivElement>) {
    const el = matRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(-dy * 3.5).toFixed(2)}deg) rotateY(${(dx * 4.5).toFixed(2)}deg)`;
  }

  function onTiltEnd() {
    const el = matRef.current;
    if (el) el.style.transform = "";
  }

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
      setPx(Math.max(240, Math.min(512, Math.floor(w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const encoded = tryEncodePayload(payload, style);
      if (!encoded.ok) {
        useStudio.getState().setError(encoded.error);
        useStudio.getState().setScan(null, null);
        return;
      }
      useStudio.getState().setError(null);
      let art: HTMLImageElement | null = null;
      let logo: HTMLImageElement | null = null;
      if (imageUrl) {
        art = await loadImage(imageUrl).catch(() => null);
      }
      if (logoUrl) {
        logo = await loadImage(logoUrl).catch(() => null);
      }
      if (cancelled) return;
      const canvas = workRef.current ?? makeCanvas();
      workRef.current = canvas;
      renderQr(canvas, encoded.qr, style, { pixelSize: px, art, logo, exportScale: true });
      setPreview(canvas.toDataURL("image/png"));
      const probe = makeCanvas();
      renderQr(probe, encoded.qr, style, { pixelSize: 640, art, logo, exportScale: true });
      try {
        const decoded = await verifyQr(probe);
        if (!cancelled) useStudio.getState().setScan(Boolean(decoded), decoded);
      } catch {
        if (!cancelled) useStudio.getState().setScan(null, null);
      }
    }, 50);
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
    renderQr(canvas, encoded.qr, style, { pixelSize: size, art, logo, exportScale: true });
    return canvas;
  }

  async function onDownload() {
    try {
      const canvas = await renderExport(2048);
      downloadCanvasPng(canvas, "beacon-qr.png");
      const thumb = workRef.current?.toDataURL("image/jpeg", 0.6) ?? "";
      useStudio.getState().pushHistory({
        label: payloadLabel(payload),
        payload: { ...payload },
        style: { ...style },
        imageUrl: imageUrl?.startsWith("blob:") ? null : imageUrl,
        thumb,
      });
      toast.success("PNG saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
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
        `<html><head><title>Beacon QR</title><style>html,body{margin:0;background:#fff}img{display:block;width:80vmin;margin:8vh auto}</style></head><body><img src="${url}" /></body></html>`,
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

  const paper = style.bg;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5 px-4 py-6 pb-24">
      <div
        ref={matRef}
        onPointerMove={onTilt}
        onPointerLeave={onTiltEnd}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDropImage}
        className="qr-mat relative w-full max-w-[520px] rounded-2xl p-4 transition-transform duration-150 will-change-transform sm:p-7"
      >
        <div
          ref={innerRef}
          className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl"
          style={{ background: paper }}
        >
          {preview ? (
            <img src={preview} alt="QR code preview" className="block size-full" />
          ) : (
            <div className="size-full bg-surface" />
          )}
          {dragging && (
            <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-accent/60 bg-bg/70 p-6 text-center text-sm font-medium text-fg">
              Drop your picture to style the code
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/80 p-6 text-center text-sm text-danger">
              {error}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
          <span
            className={cn(
              "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              scanOk
                ? "border-ok/30 bg-bg/80 text-ok"
                : scanOk === false
                  ? "border-warn/30 bg-bg/80 text-warn"
                  : "border-border bg-bg/80 text-muted",
            )}
          >
            {scanOk ? "Scannable" : scanOk === false ? "Tighten contrast" : "Checking"}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-[520px] flex-wrap items-center justify-center gap-2">
        <Button onClick={onDownload}>
          <Download />
          Download PNG
        </Button>
        <Button variant="secondary" onClick={onCopyImage}>
          {copied ? <Check /> : <ImageDown />}
          Copy image
        </Button>
        <Button variant="ghost" size="icon" onClick={onCopyPayload} aria-label="Copy destination">
          <Copy />
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrint} aria-label="Print">
          <Printer />
        </Button>
        <Button variant="ghost" size="icon" onClick={surprise} aria-label="Random preset">
          <Shuffle />
        </Button>
      </div>
      <p className="max-w-[420px] px-2 text-center text-xs text-subtle">
        Phone cameras read the mark. Picture mode keeps finder eyes solid so scans stay reliable.
      </p>
    </div>
  );
}
