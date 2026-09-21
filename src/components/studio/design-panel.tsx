import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  EYE_SHAPES,
  MODULE_SHAPES,
  type EccLevel,
  type GradientType,
} from "@/lib/qr/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-elevated px-2 py-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-8 shrink-0 cursor-pointer rounded-sm"
      />
      <span className="min-w-0 flex-1 text-xs text-muted">{label}</span>
      <span className="font-mono text-[10px] uppercase text-subtle">{value}</span>
    </label>
  );
}

export function DesignPanel() {
  const style = useStudio((s) => s.style);
  const patch = useStudio((s) => s.patchStyle);
  const imageUrl = useStudio((s) => s.imageUrl);
  const pictured = Boolean(imageUrl) && style.imageMode !== "none" && style.imageMode !== "logo";

  const caption = useStudio((s) => s.caption);
  const setCaption = useStudio((s) => s.setCaption);
  const frame = useStudio((s) => s.frame);
  const setFrame = useStudio((s) => s.setFrame);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Frame & caption</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["none", "soft", "ticket"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrame(f)}
              className={cn(
                "h-10 rounded-md border text-[11px] font-semibold capitalize",
                frame === f
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {f === "none" ? "None" : f}
            </button>
          ))}
        </div>
        <input
          value={caption}
          placeholder='Optional · “SCAN ME”'
          onChange={(e) => setCaption(e.target.value.slice(0, 24))}
          className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </section>

      {/* Module Shapes */}
      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Module shape</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MODULE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ moduleShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium transition active:scale-95",
                style.moduleShape === s.id
                  ? "border-accent bg-accent text-accent-fg shadow-sm font-semibold"
                  : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Finder Eyes Outer */}
      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Finder eyes (outer)</p>
        <div className="grid grid-cols-4 gap-1.5">
          {EYE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ eyeShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium transition active:scale-95",
                style.eyeShape === s.id
                  ? "border-accent bg-accent text-accent-fg shadow-sm font-semibold"
                  : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Finder Eye Balls Center */}
      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Eye balls (center)</p>
        <div className="grid grid-cols-4 gap-1.5">
          {EYE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ ballShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium transition active:scale-95",
                style.ballShape === s.id
                  ? "border-accent bg-accent text-accent-fg shadow-sm font-semibold"
                  : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Geometry Tuning: Dot Weight & Contrast (ALWAYS VISIBLE & WORKING) */}
      <section className="grid gap-4 rounded-xl border border-border bg-elevated/60 p-4">
        <p className="text-xs font-semibold tracking-wide text-fg">Geometry & Weight</p>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Dot weight</Label>
            <span className="text-xs font-medium tabular-nums text-fg">
              {Math.round(style.dotScale * 100)}%
            </span>
          </div>
          <Slider
            min={0.25}
            max={0.95}
            step={0.01}
            value={[style.dotScale]}
            onValueChange={([v]) => patch({ dotScale: v ?? 0.56 })}
          />
          <p className="mt-1 text-[11px] text-muted">Adjusts the size of the QR modules.</p>
        </div>

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
            onValueChange={([v]) => patch({ contrast: v ?? 0.72 })}
          />
          <p className="mt-1 text-[11px] text-muted">Boosts color separation and camera readability.</p>
        </div>

        {pictured && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Photo opacity / fade</Label>
              <span className="text-xs font-medium tabular-nums text-fg">
                {Math.round(style.imageOpacity * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={1.0}
              step={0.01}
              value={[style.imageOpacity]}
              onValueChange={([v]) => patch({ imageOpacity: v ?? 0.85 })}
            />
            <p className="mt-1 text-[11px] text-muted">Lower values help the code pop from the photo.</p>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Module gap</Label>
            <span className="text-xs font-medium tabular-nums text-fg">
              {Math.round(style.moduleGap * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={0.3}
            step={0.01}
            value={[style.moduleGap]}
            onValueChange={([v]) => patch({ moduleGap: v ?? 0 })}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Quiet zone margin</Label>
            <span className="text-xs font-medium tabular-nums text-fg">{style.quietZone} cells</span>
          </div>
          <Slider
            min={1}
            max={6}
            step={1}
            value={[style.quietZone]}
            onValueChange={([v]) => patch({ quietZone: v ?? 2 })}
          />
        </div>
      </section>

      {/* Colors & Gradient */}
      <section className="grid gap-2.5">
        <p className="text-xs font-medium tracking-wide text-muted">Color Palette</p>
        <ColorField label="Modules" value={style.fg} onChange={(fg) => patch({ fg })} />
        <ColorField label="Background" value={style.bg} onChange={(bg) => patch({ bg })} />
        <ColorField label="Eyes" value={style.eyeColor} onChange={(eyeColor) => patch({ eyeColor })} />
        <ColorField label="Balls" value={style.ballColor} onChange={(ballColor) => patch({ ballColor })} />
        
        <div className="mt-2">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Gradient</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(["none", "linear", "diagonal", "radial"] as GradientType[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => patch({ gradientType: g })}
                className={cn(
                  "h-10 rounded-md border text-[11px] font-medium capitalize transition active:scale-95",
                  style.gradientType === g
                    ? "border-accent bg-accent text-accent-fg font-semibold"
                    : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
                )}
              >
                {g === "none" ? "Solid" : g}
              </button>
            ))}
          </div>
          {style.gradientType !== "none" && (
            <div className="mt-2">
              <ColorField
                label="Gradient to"
                value={style.gradientTo}
                onChange={(gradientTo) => patch({ gradientTo })}
              />
            </div>
          )}
        </div>
      </section>

      {/* Error Correction & Transparency */}
      <section className="grid gap-3">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Error correction level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(["L", "M", "Q", "H"] as EccLevel[]).map((e) => (
              <button
                key={e}
                type="button"
                disabled={pictured}
                onClick={() => patch({ ecc: e })}
                className={cn(
                  "h-10 rounded-md border text-xs font-medium transition disabled:opacity-50",
                  pictured
                    ? e === "H"
                      ? "border-accent bg-accent text-accent-fg font-semibold"
                      : "border-border bg-elevated text-muted"
                    : style.ecc === e
                      ? "border-accent bg-accent text-accent-fg font-semibold"
                      : "border-border bg-elevated text-muted hover:text-fg",
                )}
              >
                {e} {e === "H" && "(Max)"}
              </button>
            ))}
          </div>
          {pictured && (
            <p className="mt-1 text-[11px] text-subtle">
              Auto-locked to H for photo embedding to guarantee camera decoding.
            </p>
          )}
        </div>

        <label
          className={cn(
            "flex h-11 items-center justify-between rounded-md border border-border bg-elevated px-3 text-sm transition",
            pictured && "opacity-50",
          )}
        >
          Transparent background
          <Switch
            disabled={pictured}
            checked={style.transparentBg}
            onCheckedChange={(transparentBg) => patch({ transparentBg })}
          />
        </label>
      </section>
    </div>
  );
}
