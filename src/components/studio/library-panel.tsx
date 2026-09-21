import { Copy, Download, FolderOpen, ScanLine, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { decodeClipboardImage, decodeFile, decodeImageSource } from "@/lib/qr/decode";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LibraryPanel() {
  return (
    <div className="flex flex-col gap-8">
      <HistorySection />
      <DecoderSection />
    </div>
  );
}

function HistorySection() {
  const history = useStudio((s) => s.history);
  const load = useStudio((s) => s.loadHistoryItem);
  const remix = useStudio((s) => s.remixHistoryItem);
  const remove = useStudio((s) => s.deleteHistoryItem);

  return (
    <section>
      <p className="mb-1 text-xs font-semibold tracking-wide text-fg">Recent · this browser</p>
      <p className="mb-3 text-[11px] leading-snug text-muted">
        Saved when you download. Stays on this device — nothing is uploaded.
      </p>
      {history.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-elevated/60 px-4 text-center">
          <FolderOpen className="size-5 text-muted" />
          <p className="text-xs text-muted">No downloads yet. Save PNG to pin a remix here.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-2"
            >
              {h.thumb ? (
                <img src={h.thumb} alt="" className="size-12 rounded-md object-cover" />
              ) : (
                <span className="size-12 rounded-md bg-surface" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-fg">{h.label}</p>
                <p className="text-[10px] text-muted">
                  {new Date(h.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="h-8 rounded-md px-2 text-[11px] font-semibold text-fg hover:bg-surface"
                onClick={() => {
                  load(h.id);
                  toast.success("Loaded");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="h-8 rounded-md px-2 text-[11px] font-semibold text-fg hover:bg-surface"
                onClick={() => {
                  remix(h.id);
                  toast.success("Remixed look — paste a new destination");
                }}
              >
                Remix
              </button>
              <button
                type="button"
                className="size-8 rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                aria-label="Delete"
                onClick={() => remove(h.id)}
              >
                <Trash2 className="mx-auto size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DecoderSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const patchPayload = useStudio((s) => s.patchPayload);
  const setKind = useStudio((s) => s.setKind);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    try {
      const text = await fn();
      setResult(text);
      if (!text) toast.message("No QR found in that image");
    } catch {
      toast.error("Could not decode");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      toast.error("Camera is blocked in this browser");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function snapCamera() {
    const video = videoRef.current;
    if (!video) return;
    await run(() => decodeImageSource(video, video.videoWidth || 640, video.videoHeight || 480));
  }

  function useAsDestination() {
    if (!result) return;
    if (/^WIFI:/i.test(result)) {
      setKind("wifi");
    } else if (/^BEGIN:VCARD/i.test(result)) {
      setKind("vcard");
    } else if (/^mailto:/i.test(result)) {
      setKind("email");
    } else if (/^tel:/i.test(result)) {
      setKind("phone");
    } else if (/^https?:/i.test(result) || result.includes(".")) {
      setKind("url");
      patchPayload({ url: result });
    } else {
      setKind("text");
      patchPayload({ text: result });
      return;
    }
    if (/^https?:/i.test(result) || result.includes(".")) patchPayload({ url: result });
    toast.success("Loaded as a new QR");
  }

  return (
    <section>
      <p className="mb-1 text-xs font-semibold tracking-wide text-fg">Decode a QR</p>
      <p className="mb-3 text-[11px] leading-snug text-muted">
        Runs locally with jsQR — same engine as Fix scan. Not a phone-camera test.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold hover:bg-surface-hover"
        >
          <Upload className="size-3.5" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => run(decodeClipboardImage)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold hover:bg-surface-hover"
        >
          Paste
        </button>
        <button
          type="button"
          onClick={camOn ? stopCamera : startCamera}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold",
            camOn ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:bg-surface-hover",
          )}
        >
          <ScanLine className="size-3.5" />
          {camOn ? "Stop camera" : "Camera"}
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
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full bg-black object-cover" />
          <button
            type="button"
            onClick={() => void snapCamera()}
            className="h-10 w-full bg-accent text-xs font-bold text-accent-fg"
          >
            Capture & decode
          </button>
        </div>
      )}
      {busy && <p className="mt-2 text-xs text-muted">Reading…</p>}
      {result && (
        <div className="mt-3 rounded-xl border border-border bg-elevated p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Extracted</p>
          <p className="break-all text-sm text-fg">{result}</p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-semibold"
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
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-semibold"
              >
                <Download className="size-3.5" />
                Open
              </a>
            )}
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-accent px-2.5 text-[11px] font-bold text-accent-fg"
              onClick={useAsDestination}
            >
              Make a new QR
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
