import { Check, Copy, Download, ImageDown, Info, Loader2, Printer, Shuffle, Wand2 } from "lucide-react";
import { autoFixScan } from "@/lib/qr/autofix";
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

const HOOKS = [
  "Scan me. I dare you.",
  "Your cat, now teleporting to phones.",
  "The Mona Lisa of machine-readable squares.",
  "Ugly QRs are a choice. Choose again.",
  "Zero trackers. 100% on-device. Zero middleman.",
  "Because life is too short for boring barcodes.",
  "Point. Shoot. Teleport.",
  "Made with love & error correction level H.",
  "High fashion for internet links.",
  "Warning: may cause excessive camera scanning.",
  "Art your phone camera understands in 0.02 seconds.",
  "Forever static. No expiring links. No paywalls.",
  "Proof that algorithms can have good taste.",
  "From canvas to camera with zero friction.",
];

/** Quirky one-liners that keep the empty space charming. */
function HookLine() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % HOOKS.length), 4200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <p
      key={i}
      className="word-in min-h-5 font-display text-sm italic text-muted"
      aria-live="polite"
    >
      {HOOKS[i]}
    </p>
  );
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
  const [helpOpen, setHelpOpen] = useState(false);
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
      downloadCanvasPng(canvas, "qrwho-qr.png");
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

  const [fixing, setFixing] = useState(false);
  async function onAutoFix() {
    if (fixing) return;
    setFixing(true);
    try {
      const result = await autoFixScan(payload, style, imageUrl, logoUrl);
      if (result.ok) {
        if (Object.keys(result.patch).length === 0) {
          toast.success("Already scannable — you're good!");
        } else {
          useStudio.getState().patchStyle(result.patch);
          toast.success(`Auto-fix worked: ${result.notes.join(", ")}.`);
        }
      } else {
        toast.error(result.error ?? "Could not make this scannable.");
      }
    } finally {
      setFixing(false);
    }
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
        <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <div
            className={cn(
              "pointer-events-auto relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              scanOk
                ? "border-ok/30 bg-bg/80 text-ok"
                : scanOk === false
                  ? "border-warn/30 bg-bg/80 text-warn"
                  : "border-border bg-bg/80 text-muted",
            )}
          >
            {scanOk ? "Scannable" : scanOk === false ? "Tighten contrast" : "Checking"}
            <button
              type="button"
              aria-label="What does this mean and how do I fix it?"
              onClick={() => setHelpOpen((v) => !v)}
              onMouseEnter={() => setHelpOpen(true)}
              className="rounded-full opacity-70 transition hover:opacity-100"
            >
              <Info className="size-3.5" />
            </button>
            {helpOpen && (
              <div
                onMouseLeave={() => setHelpOpen(false)}
                className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[78vw] rounded-xl border border-border bg-bg/95 p-3 text-left font-normal leading-relaxed text-muted shadow-2xl backdrop-blur"
              >
                {scanOk === false ? (
                  <>
                    <p className="mb-1.5 font-medium text-fg">
                      Cameras may struggle with this style. To tighten it:
                    </p>
                    <ul className="list-disc space-y-1 pl-4">
                      <li>
                        Design tab: raise <span className="text-fg">Contrast</span> or{" "}
                        <span className="text-fg">Module gap</span>
                      </li>
                      <li>
                        Image tab: lower <span className="text-fg">Opacity</span> so the code
                        stands out from the picture
                      </li>
                      <li>Pick darker modules on a lighter background (or the reverse)</li>
                      <li>Sturdier shapes scan best: Square, Round or Dots</li>
                    </ul>
                    <p className="mt-1.5">
                      Or tap <span className="text-fg">Fix scan</span> below and QRWho will
                      tune it for you.
                    </p>
                  </>
                ) : scanOk ? (
                  <p>
                    We just decoded this exact artwork with a camera-style reader — phone
                    cameras will read it too.
                  </p>
                ) : (
                  <p>Checking whether a camera can still read the code with this style…</p>
                )}
              </div>
            )}
          </div>
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
        {scanOk === false && (
          <Button variant="secondary" onClick={onAutoFix} disabled={fixing}>
            {fixing ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {fixing ? "Tuning…" : "Fix scan"}
          </Button>
        )}
      </div>
      <p className="max-w-[420px] px-2 text-center text-xs text-subtle">
        Phone cameras read the mark. Picture mode keeps finder eyes solid so scans stay reliable.
      </p>
      <HookLine />
    </div>
  );
}
