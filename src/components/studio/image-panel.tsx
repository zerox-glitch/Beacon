import { ImagePlus, Sliders, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { analyzeImage, smartArtPatch } from "@/lib/qr/art/analyzer";
import { WEAVE_PRESETS } from "@/lib/qr/art/weave-presets";
import { loadImage } from "@/lib/qr/render";
import { IMAGE_MODES } from "@/lib/qr/types";
import { SAMPLE_IMAGES } from "@/lib/qr/presets";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function readFile(file: File, onUrl: (url: string) => void) {
  const url = URL.createObjectURL(file);
  onUrl(url);
}

const WEAVE_MODES = IMAGE_MODES.filter((m) => m.id !== "logo");

export function ImagePanel() {
  const imageUrl = useStudio((s) => s.imageUrl);
  const logoUrl = useStudio((s) => s.logoUrl);
  const style = useStudio((s) => s.style);
  const setImageUrl = useStudio((s) => s.setImageUrl);
  const setLogoUrl = useStudio((s) => s.setLogoUrl);
  const patchStyle = useStudio((s) => s.patchStyle);
  const artRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const pictured = Boolean(imageUrl) && style.imageMode !== "none" && style.imageMode !== "logo";
  const strength = style.artisticStrength ?? 0.42;
  const smartArt = useStudio((s) => s.smartArt);
  const setSmartArt = useStudio((s) => s.setSmartArt);

  useEffect(() => {
    if (!smartArt || !imageUrl) return;
    let cancelled = false;
    loadImage(imageUrl)
      .then((img) => {
        if (cancelled) return;
        const suggestion = smartArtPatch(analyzeImage(img));
        useStudio.getState().patchStyle(suggestion.patch);
      })
      .catch(() => {
        /* keep current knobs */
      });
    return () => {
      cancelled = true;
    };
  }, [smartArt, imageUrl]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Upload a picture</p>
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
          <span className="text-xs text-muted">
            Woven into the QR in this browser — no upload, no AI models.
          </span>
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

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Or try a sample</p>
        <div className="grid grid-cols-6 gap-2">
          {SAMPLE_IMAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.name}
              onClick={() => setImageUrl(s.src)}
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

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Weave</p>
        <div className="grid grid-cols-2 gap-1.5">
          {WEAVE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              disabled={!imageUrl && m.id !== "none"}
              onClick={() => patchStyle({ imageMode: m.id })}
              className={cn(
                "h-11 rounded-md border px-2 text-xs font-medium transition disabled:opacity-40 active:scale-95",
                style.imageMode === m.id
                  ? "border-accent bg-accent text-accent-fg font-semibold shadow-sm"
                  : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-subtle">
          {IMAGE_MODES.find((m) => m.id === style.imageMode)?.hint}
        </p>
      </div>

      {imageUrl && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Weave look</p>
          <div className="grid grid-cols-4 gap-1.5">
            {WEAVE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                onClick={() => patchStyle(p.patch)}
                className="h-10 rounded-md border border-border bg-elevated px-1 text-[10px] font-semibold text-muted transition hover:border-border-strong hover:text-fg active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {imageUrl && (
        <label className="flex h-11 items-center justify-between rounded-md border border-border bg-elevated px-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-ok" />
            Smart Art
          </span>
          <Switch checked={smartArt} onCheckedChange={setSmartArt} />
        </label>
      )}
      {smartArt && imageUrl && (
        <p className="text-[11px] leading-snug text-subtle">
          Reads luma, contrast, edges and color in this browser, then picks a weave. Not a model.
        </p>
      )}

      {pictured && (
        <div className="grid gap-4 rounded-xl border border-border bg-elevated/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-fg flex items-center gap-1.5">
            <Sliders className="size-3.5 text-ok" />
            <span>Artistic strength</span>
          </p>
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold tracking-wide">
              <span className="text-ok">Safe</span>
              <span className="tabular-nums text-fg">{Math.round(strength * 100)}%</span>
              <span className="text-warn">Artistic</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[strength]}
              onValueChange={([v]) => patchStyle({ artisticStrength: v ?? 0.42 })}
            />
            <p className="mt-1 text-[11px] text-muted">
              Safe keeps a bigger machine-readable center in each module. Artistic lets more of the
              photo into the surround — never past scan-safe limits.
            </p>
          </div>

          <details className="rounded-lg border border-border bg-surface/50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-fg">Advanced</summary>
            <div className="mt-3 grid gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Contrast</Label>
                  <span className="text-xs font-medium tabular-nums text-fg">
                    {Math.round(style.contrast * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.3}
                  max={1.0}
                  step={0.01}
                  value={[style.contrast]}
                  onValueChange={([v]) => patchStyle({ contrast: v ?? 0.82 })}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Module scale</Label>
                  <span className="text-xs font-medium tabular-nums text-fg">
                    {Math.round(style.dotScale * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.45}
                  max={0.96}
                  step={0.01}
                  value={[style.dotScale]}
                  onValueChange={([v]) => patchStyle({ dotScale: v ?? 0.78 })}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Quiet zone</Label>
                  <span className="text-xs font-medium tabular-nums text-fg">{style.quietZone}</span>
                </div>
                <Slider
                  min={2}
                  max={6}
                  step={1}
                  value={[style.quietZone]}
                  onValueChange={([v]) => patchStyle({ quietZone: v ?? 3 })}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Grid detail</Label>
                  <span className="text-xs font-medium tabular-nums text-fg">{style.minVersion}</span>
                </div>
                <Slider
                  min={5}
                  max={12}
                  step={1}
                  value={[style.minVersion]}
                  onValueChange={([v]) => patchStyle({ minVersion: v ?? 7 })}
                />
              </div>
            </div>
          </details>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Center logo</p>
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
