/**
 * Image field used by Branding/Media/SEO: pick an uploaded asset, paste any
 * safe URL, or upload inline. The stored value is the /api/media/<id> URL (or
 * a same-site path) — the same string the public site renders.
 */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/lib/cms/admin-api";
import { isSafeImageUrl } from "@/lib/cms/media-format";
import { cn } from "@/lib/utils";
import type { MediaRow } from "@/lib/cms/store-contract";
import { useAdminMutation } from "./session";

export function ImagePicker({
  value,
  onChange,
  media,
  kind = "image",
  label,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  media: MediaRow[];
  kind?: "logo" | "og" | "art" | "image";
  label: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const relevant = media.filter((m) => m.kind === kind || kind === "image");

  const upload = useAdminMutation(
    async (file: File) => {
      if (file.size > 4 * 1024 * 1024) throw new Error("Max 4 MB");
      if (file.type === "image/svg+xml") throw new Error("SVG uploads are not allowed");
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 4096) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
      }
      return uploadMedia({
        data: { filename: file.name, kind, alt: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 200), dataBase64: btoa(bin) },
      });
    },
    { success: "Image uploaded", invalidate: ["admin-media"] },
  );

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface">
          {value && isSafeImageUrl(value) ? (
            <img src={value} alt="" className="size-full object-contain" onError={() => setError("Preview failed to load")} />
          ) : (
            <ImagePlus className="size-4 text-subtle" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={upload.isPending} title="Upload new image">
                <Upload className="size-3.5" />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setUrlDraft(value); setShowUrl((v) => !v); }} title="Paste a URL">
                <Link2 className="size-3.5" />
              </Button>
              {value ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(""); setError(null); }} title="Remove">
                  ✕
                </Button>
              ) : null}
            </div>
          </div>
          {relevant.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {relevant.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.url); setError(null); }}
                  title={m.filename}
                  className={cn(
                    "size-9 overflow-hidden rounded-md border bg-surface transition",
                    value === m.url ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-border-strong",
                  )}
                >
                  <img src={m.url} alt="" className="size-full object-contain" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-subtle">No uploads yet — press the upload button (PNG/JPEG/WebP/GIF, max 4 MB).</p>
          )}
          {error ? <p className="text-[11px] text-danger">{error}</p> : null}
          {hint ? <p className="text-[11px] leading-relaxed text-subtle">{hint}</p> : null}
        </div>
      </div>
      {showUrl ? (
        <div className="flex items-center gap-2">
          <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="https://… or /path…" className="h-9 text-xs" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const v = urlDraft.trim();
              if (v && !isSafeImageUrl(v)) {
                setError("Only http(s) URLs or /site paths are allowed");
                return;
              }
              setError(null);
              onChange(v);
              setShowUrl(false);
            }}
          >
            Use
          </Button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload.mutate(f);
        }}
      />
      <AdoptUpload result={upload.data} onApplied={onChange} />
    </div>
  );
}

/** Adopt an inline upload into the field as soon as it resolves. */
function AdoptUpload({ result, onApplied }: { result: MediaRow | null | undefined; onApplied: (url: string) => void }) {
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (result && result.url !== appliedRef.current) {
      appliedRef.current = result.url;
      onApplied(result.url);
    }
  }, [result, onApplied]);
  return null;
}
