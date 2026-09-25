/**
 * Scan an EXISTING QR — upload a picture, paste one, or point the camera.
 * Decodes locally with jsQR (the same engine as the studio's Fix scan) and
 * hands the extracted text back. The studio uses it to load a destination;
 * the landing page uses it for the "remake your old code" flow, so the two
 * surfaces look and behave identically.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, ClipboardPaste, Copy, ScanLine, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { decodeClipboardImage, decodeFile, decodeImageSource } from "@/lib/qr/decode";
import { payloadLabel } from "@/lib/qr/payload";
import { classifyScan } from "@/lib/qr/scan-intent";
import { emptyPayload } from "@/lib/qr/types";
import { cn } from "@/lib/utils";

export function ScanDecode({
  heading = "Scan a QR you already have",
  hint = "Upload a photo or screenshot, paste an image, or use the camera — it reads the code and shows you what's inside. Nothing is uploaded anywhere; decoding runs in your browser.",
  primary,
  className,
}: {
  heading?: ReactNode;
  hint?: ReactNode;
  /** Extra CTA rendered with the result (e.g. "Use as destination", "Remake it"). */
  primary?: (result: string) => ReactNode;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const lastFoundRef = useRef<string | null>(null);
  const decodingRef = useRef(false);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // Attach the stream only AFTER React has rendered the <video> element.
  // (The old requestAnimationFrame could fire before the element existed —
  // on iPhone Safari the camera then stayed black forever.)
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      const played = videoRef.current.play();
      if (played) played.catch(() => undefined);
    }
  }, [stream, camOn]);

  // Live scanning: while the camera is open, decode the current frame every
  // ~300ms. A found code does NOT close the camera — the success state stays
  // on screen and the user stops the camera when they're done (or simply
  // holds up a different code, which replaces the result).
  useEffect(() => {
    if (!camOn || !stream) return;
    let cancelled = false;
    let timer: number;
    const tick = async () => {
      if (cancelled) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth > 0 && !decodingRef.current) {
        decodingRef.current = true;
        try {
          const text = await decodeImageSource(v, v.videoWidth, v.videoHeight);
          if (text && text !== lastFoundRef.current) {
            lastFoundRef.current = text;
            setResult(text);
          }
        } catch {
          /* frame was mid-motion — next tick retries */
        } finally {
          decodingRef.current = false;
        }
      }
      timer = window.setTimeout(tick, 300);
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [camOn, stream]);

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    try {
      const text = await fn();
      if (text) {
        setResult(text);
      } else {
        setResult(null);
        toast.message("No QR found in that image — try a straighter, closer shot");
      }
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser can't use the camera — upload a screenshot instead");
      return;
    }
    // Embedded previews can deny camera via permissions policy — say so.
    try {
      const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
      if (perm.state === "denied") {
        toast.error("Camera is blocked — allow it in your browser's site settings (or open the site directly if you're in a preview), then tap Use camera again");
        return;
      }
    } catch {
      /* permissions API unsupported — proceed to getUserMedia */
    }
    try {
      let got: MediaStream;
      try {
        got = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err) {
        const overconstrained =
          err instanceof DOMException &&
          (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError");
        if (!overconstrained) throw err;
        got = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      lastFoundRef.current = null;
      setStream(got);
      setCamOn(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Camera access was blocked — allow it in your browser's site settings, then tap Use camera again");
      } else if (name === "NotReadableError") {
        toast.error("The camera is busy in another app — close it and try again");
      } else if (name === "NotFoundError") {
        toast.error("No camera found on this device — upload a screenshot instead");
      } else {
        toast.error("Camera is blocked in this browser — upload a screenshot instead");
      }
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCamOn(false);
  }

  const btn =
    "inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold transition hover:bg-surface-hover";

  // A friendly summary of WHAT the code contains, when we recognize it.
  const intent = result ? { ...emptyPayload(), ...classifyScan(result) } : null;

  return (
    <div className={cn("space-y-3", className)}>
      {heading ? <p className="text-sm font-semibold text-fg">{heading}</p> : null}
      {hint ? <p className="text-[11px] leading-snug text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          <Upload className="size-3.5" />
          Upload image
        </button>
        <button type="button" onClick={() => void run(decodeClipboardImage)} className={btn}>
          <ClipboardPaste className="size-3.5" />
          Paste
        </button>
        <button
          type="button"
          onClick={camOn ? stopCamera : startCamera}
          className={cn(
            btn,
            camOn && "border-accent bg-accent text-accent-fg hover:bg-accent",
          )}
        >
          <ScanLine className="size-3.5" />
          {camOn ? "Close camera" : "Open camera"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void run(() => decodeFile(f));
          e.target.value = "";
        }}
      />
      {camOn && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Scan a QR code with the camera"
        >
          {/* top bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-semibold text-fg">Scan a QR code</p>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-fg transition hover:bg-white/20"
              aria-label="Close camera"
            >
              <X className="size-5" />
            </button>
          </div>
          {/* full-screen view — nothing on the page can sit above it */}
          <div className="relative min-h-0 flex-1">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full bg-black object-cover" />
            {result ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-6 pt-16">
                <div className="mx-auto max-w-md space-y-3 text-center">
                  <CheckCircle2 className="mx-auto size-12 text-ok" />
                  <p className="text-lg font-bold text-fg">QR found — you're all set</p>
                  <p className="line-clamp-2 break-all text-xs text-fg/70">{result}</p>
                  <p className="text-[11px] leading-relaxed text-fg/60">
                    The camera stays open — hold up a different code to scan it
                    live, or stop when you're done.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-bold text-accent-fg transition hover:brightness-110 active:scale-[0.97]"
                    >
                      <ScanLine className="size-4" />
                      Done — stop camera
                    </button>
                    {primary ? primary(result) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 px-4">
                <span className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-fg backdrop-blur">
                  <span className="size-2 animate-pulse rounded-full bg-ok" />
                  Scanning — point the camera at the code
                </span>
                <p className="text-[11px] text-fg/60">Good light and a straight angle read best.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {busy && <p className="text-xs text-muted">Reading…</p>}
      {result && intent ? (
        <div className="space-y-2 rounded-xl border border-border bg-elevated p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Found — {payloadLabel(intent)}
          </p>
          <p className="line-clamp-3 break-all text-sm text-fg">{result}</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={cn(btn, "h-9 border-border")}
              onClick={() => {
                void navigator.clipboard.writeText(result);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            {/^https?:/i.test(result) && (
              <a
                href={result}
                target="_blank"
                rel="noreferrer"
                className={cn(btn, "h-9 border-border")}
              >
                Open link
              </a>
            )}
            {primary ? primary(result) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
