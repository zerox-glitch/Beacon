import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  EYE_SHAPES,
  MODULE_SHAPES,
  type EccLevel,
  type GradientType,
  type ModuleShape,
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

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Module shape</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MODULE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ moduleShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium",
                style.moduleShape === s.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Finder eyes</p>
        <div className="grid grid-cols-4 gap-1.5">
          {EYE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ eyeShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium",
                style.eyeShape === s.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Eye balls</p>
        <div className="grid grid-cols-4 gap-1.5">
          {EYE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ ballShape: s.id })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium",
                style.ballShape === s.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted">Colors</p>
        <ColorField label="Modules" value={style.fg} onChange={(fg) => patch({ fg })} />
        <ColorField label="Background" value={style.bg} onChange={(bg) => patch({ bg })} />
        <ColorField label="Eyes" value={style.eyeColor} onChange={(eyeColor) => patch({ eyeColor })} />
        <ColorField label="Balls" value={style.ballColor} onChange={(ballColor) => patch({ ballColor })} />
        <ColorField
          label="Gradient to"
          value={style.gradientTo}
          onChange={(gradientTo) => patch({ gradientTo })}
        />
      </section>

      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Accent pop</p>
        <div className="grid grid-cols-5 gap-1.5">
          {([null, "cross", "dots", "dash", "diag"] as (ModuleShape | null)[]).map((s) => (
            <button
              key={s ?? "none"}
              type="button"
              onClick={() => patch({ accentShape: s ?? undefined, accentColor: style.accentColor ?? "#b3271c" })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium capitalize",
                (style.accentShape ?? null) === s
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {s ?? "None"}
            </button>
          ))}
        </div>
        {style.accentShape ? (
          <div className="mt-2 grid gap-2">
            <ColorField
              label="Accent color"
              value={style.accentColor ?? "#b3271c"}
              onChange={(accentColor) => patch({ accentColor })}
            />
            <label className="flex h-11 items-center justify-between rounded-md border border-border bg-elevated px-3 text-sm">
              Decorate light cells
              <Switch
                checked={Boolean(style.accentOnLight)}
                onCheckedChange={(accentOnLight) => patch({ accentOnLight })}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted">Gradient</p>
        <div className="grid grid-cols-4 gap-1.5">
          {(["none", "linear", "diagonal", "radial"] as GradientType[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => patch({ gradientType: g })}
              className={cn(
                "h-11 rounded-md border text-[11px] font-medium capitalize",
                style.gradientType === g
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-elevated text-muted hover:text-fg",
              )}
            >
              {g === "none" ? "Solid" : g}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Quiet zone</Label>
            <span className="text-xs tabular-nums text-subtle">{style.quietZone}</span>
          </div>
          <Slider
            min={1}
            max={6}
            step={1}
            value={[style.quietZone]}
            onValueChange={([v]) => patch({ quietZone: v ?? 2 })}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Module gap</Label>
            <span className="text-xs tabular-nums text-subtle">
              {Math.round(style.moduleGap * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={0.28}
            step={0.01}
            value={[style.moduleGap]}
            onValueChange={([v]) => patch({ moduleGap: v ?? 0 })}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Error correction</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(["L", "M", "Q", "H"] as EccLevel[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => patch({ ecc: e })}
                className={cn(
                  "h-11 rounded-md border text-xs font-medium",
                  style.ecc === e
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-elevated text-muted",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="flex h-11 items-center justify-between rounded-md border border-border bg-elevated px-3 text-sm">
          Transparent background
          <Switch
            checked={style.transparentBg}
            onCheckedChange={(transparentBg) => patch({ transparentBg })}
          />
        </label>
      </section>
    </div>
  );
}
