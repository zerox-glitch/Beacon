import { ImagePlus, X } from "lucide-react";
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
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Picture</p>
        <button
          type="button"
          onClick={() => artRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) readFile(file, setImageUrl);
          }}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-elevated px-4 py-6 text-center transition-colors hover:bg-surface"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Source"
              className="h-24 w-24 rounded-md object-cover"
            />
          ) : (
            <ImagePlus className="size-6 text-muted" />
          )}
          <span className="text-sm text-fg">Drop a photo or browse</span>
          <span className="text-xs text-muted">Turns into a working QR code</span>
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
          <button
            type="button"
            className="mt-2 inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs text-muted hover:text-fg"
            onClick={() => setImageUrl(null)}
          >
            <X className="size-3.5" />
            Remove picture
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Try a sample</p>
        <div className="grid grid-cols-6 gap-1.5">
          {SAMPLE_IMAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.name}
              onClick={() => setImageUrl(s.src)}
              className={cn(
                "aspect-square overflow-hidden rounded-md border",
                imageUrl === s.src ? "border-accent" : "border-border",
              )}
            >
              <img src={s.src} alt={s.name} className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Picture treatment</p>
        <div className="grid grid-cols-3 gap-1.5">
          {IMAGE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              disabled={!imageUrl && m.id !== "none"}
              onClick={() => patchStyle({ imageMode: m.id })}
              className={cn(
                "h-11 rounded-md border text-xs font-medium disabled:opacity-40",
                style.imageMode === m.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {(style.imageMode === "paint" || style.imageMode === "halftone") && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Dot weight</Label>
            <span className="text-xs tabular-nums text-subtle">
              {Math.round(style.dotScale * 100)}%
            </span>
          </div>
          <Slider
            min={0.28}
            max={0.72}
            step={0.01}
            value={[style.dotScale]}
            onValueChange={([v]) => patchStyle({ dotScale: v ?? 0.46 })}
          />
        </div>
      )}

      {style.imageMode === "mosaic" && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Contrast lock</Label>
            <span className="text-xs tabular-nums text-subtle">
              {Math.round(style.contrast * 100)}%
            </span>
          </div>
          <Slider
            min={0.35}
            max={1}
            step={0.01}
            value={[style.contrast]}
            onValueChange={([v]) => patchStyle({ contrast: v ?? 0.72 })}
          />
        </div>
      )}

      {style.imageMode === "backdrop" && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Photo opacity</Label>
            <span className="text-xs tabular-nums text-subtle">
              {Math.round(style.imageOpacity * 100)}%
            </span>
          </div>
          <Slider
            min={0.15}
            max={1}
            step={0.01}
            value={[style.imageOpacity]}
            onValueChange={([v]) => patchStyle({ imageOpacity: v ?? 0.9 })}
          />
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Detail (version)</Label>
          <span className="text-xs tabular-nums text-subtle">{style.minVersion}</span>
        </div>
        <Slider
          min={2}
          max={12}
          step={1}
          value={[style.minVersion]}
          onValueChange={([v]) => patchStyle({ minVersion: v ?? 6 })}
        />
        <p className="mt-1 text-xs text-subtle">Higher detail keeps more of the photo.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Center logo</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-border bg-elevated"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-4 text-muted" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <Label>Logo size</Label>
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
              className="size-9 text-muted hover:text-fg"
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
