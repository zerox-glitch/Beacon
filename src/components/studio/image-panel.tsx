import { ImagePlus, Sliders, X } from "lucide-react";
import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { IMAGE_MODES } from "@/lib/qr/types";
import { SAMPLE_IMAGES } from "@/lib/qr/presets";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function readFile(file: File, onUrl: (url: string) => void) {
  const url = URL.createObjectURL(file);
  onUrl(url);
}

export function ImagePanel() {
  const imageUrl = useStudio((s) => s.imageUrl);
  const logoUrl = useStudio((s) => s.logoUrl);
  const style = useStudio((s) => s.style);
  const setImageUrl = useStudio((s) => s.setImageUrl);
  const setLogoUrl = useStudio((s) => s.setLogoUrl);
  const patchStyle = useStudio((s) => s.patchStyle);
  const artRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Box */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Upload Custom Image</p>
        <button
          type="button"
          onClick={() => artRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) readFile(file, setImageUrl);
          }}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-elevated/70 px-4 py-6 text-center transition-all hover:border-accent hover:bg-surface"
        >
          {imageUrl ? (
            <div className="relative group">
              <img
                src={imageUrl}
                alt="Source preview"
                className="size-24 rounded-lg object-cover shadow-md border border-border"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-bg/60 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                Change Photo
              </span>
            </div>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-surface border border-border">
              <ImagePlus className="size-6 text-ok" />
            </div>
          )}
          <span className="text-sm font-medium text-fg">
            {imageUrl ? "Click to replace photo" : "Drop a picture or browse"}
          </span>
          <span className="text-xs text-muted">Blends your image into a working, scannable QR code</span>
        </button>
        <input
          ref={artRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file, setImageUrl);
            e.target.value = "";
          }}
        />
        {imageUrl && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-danger hover:bg-danger/10 transition"
              onClick={() => setImageUrl(null)}
            >
              <X className="size-3.5" />
              Remove picture
            </button>
          </div>
        )}
      </div>

      {/* Preset Sample Gallery */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Or try sample pictures</p>
        <div className="grid grid-cols-6 gap-2">
          {SAMPLE_IMAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.name}
              onClick={() => {
                setImageUrl(s.src);
                if (style.imageMode === "none") patchStyle({ imageMode: "paint" });
              }}
              className={cn(
                "aspect-square overflow-hidden rounded-lg border transition-all active:scale-95",
                imageUrl === s.src ? "border-ok ring-2 ring-ok/40 scale-105" : "border-border hover:border-border-strong",
              )}
            >
              <img src={s.src} alt={s.name} className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Picture Treatment Modes */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Picture Treatment Mode</p>
        <div className="grid grid-cols-3 gap-1.5">
          {IMAGE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              disabled={!imageUrl && m.id !== "none"}
              onClick={() => patchStyle({ imageMode: m.id })}
              className={cn(
                "h-11 rounded-md border text-xs font-medium transition disabled:opacity-40 active:scale-95",
                style.imageMode === m.id
                  ? "border-accent bg-accent text-accent-fg font-semibold shadow-sm"
                  : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Picture Tuning Controls (ALWAYS VISIBLE & FUNCTIONAL WHEN IMAGE LOADED) */}
      {imageUrl && style.imageMode !== "none" && (
        <div className="grid gap-4 rounded-xl border border-border bg-elevated/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-fg flex items-center gap-1.5">
            <Sliders className="size-3.5 text-ok" />
            <span>Picture Tuning & Contrast</span>
          </p>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Photo Opacity / Fade</Label>
              <span className="text-xs font-medium tabular-nums text-fg">
                {Math.round(style.imageOpacity * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={1.0}
              step={0.01}
              value={[style.imageOpacity]}
              onValueChange={([v]) => patchStyle({ imageOpacity: v ?? 0.85 })}
            />
            <p className="mt-1 text-[11px] text-muted">Controls how much the photo shines through.</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Image Contrast</Label>
              <span className="text-xs font-medium tabular-nums text-fg">
                {Math.round(style.contrast * 100)}%
              </span>
            </div>
            <Slider
              min={0.3}
              max={1.0}
              step={0.01}
              value={[style.contrast]}
              onValueChange={([v]) => patchStyle({ contrast: v ?? 0.72 })}
            />
            <p className="mt-1 text-[11px] text-muted">Sharpens edges for instant camera detection.</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Dot Weight</Label>
              <span className="text-xs font-medium tabular-nums text-fg">
                {Math.round(style.dotScale * 100)}%
              </span>
            </div>
            <Slider
              min={0.25}
              max={0.9}
              step={0.01}
              value={[style.dotScale]}
              onValueChange={([v]) => patchStyle({ dotScale: v ?? 0.56 })}
            />
            <p className="mt-1 text-[11px] text-muted">Thickness of the data dots over the picture.</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Grid Detail (Version)</Label>
              <span className="text-xs font-medium tabular-nums text-fg">{style.minVersion}</span>
            </div>
            <Slider
              min={2}
              max={12}
              step={1}
              value={[style.minVersion]}
              onValueChange={([v]) => patchStyle({ minVersion: v ?? 6 })}
            />
            <p className="mt-1 text-[11px] text-muted">Higher grid density preserves finer photo details.</p>
          </div>
        </div>
      )}

      {/* Center Logo */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Center Logo / Icon</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-elevated transition hover:border-accent"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-5 text-muted" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <Label>Logo Scale</Label>
              <span className="text-xs tabular-nums text-subtle">
                {Math.round(style.logoScale * 100)}%
              </span>
            </div>
            <Slider
              min={0.12}
              max={0.3}
              step={0.01}
              value={[style.logoScale]}
              onValueChange={([v]) => patchStyle({ logoScale: v ?? 0.22 })}
            />
          </div>
          {logoUrl && (
            <button
              type="button"
              className="size-9 rounded-md text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition"
              onClick={() => setLogoUrl(null)}
              aria-label="Remove logo"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file, setLogoUrl);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
