import { GALLERY_PRESETS, PRESETS, PRESET_CATEGORIES } from "@/lib/qr/presets";
import type { Preset } from "@/lib/qr/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function PresetThumb({
  preset,
  active,
  onPick,
}: {
  preset: Preset;
  active: boolean;
  onPick: () => void;
}) {
  const style = preset.style;

  return (
    <button
      type="button"
      onClick={onPick}
      title={preset.name}
      className={cn(
        "group flex min-w-0 flex-col gap-1.5 rounded-md border p-1.5 text-left transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgb(0_0_0/0.35)] active:scale-[0.97]",
        active ? "border-accent bg-surface" : "border-border bg-elevated hover:border-border-strong",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-sm" style={{ background: style.bg }}>
        {preset.artUrl ? (
          <>
            <img src={preset.artUrl} alt="" className="size-full object-cover" />
            <span className="pointer-events-none absolute left-1 top-1 size-3 rounded-[2px] border-2 border-white/90" />
            <span className="pointer-events-none absolute right-1 top-1 size-3 rounded-[2px] border-2 border-white/90" />
            <span className="pointer-events-none absolute bottom-1 left-1 size-3 rounded-[2px] border-2 border-white/90" />
          </>
        ) : (
          <div className="grid size-full grid-cols-2 grid-rows-2">
            <span style={{ background: style.eyeColor }} />
            <span style={{ background: style.fg }} />
            <span style={{ background: style.gradientTo }} />
            <span style={{ background: style.ballColor }} />
          </div>
        )}
      </div>
      <span className="truncate px-0.5 text-[10px] leading-tight text-muted group-hover:text-fg">
        {preset.name}
      </span>
      <span className="px-0.5 text-[9px] font-semibold uppercase tracking-wide text-ok opacity-0 group-hover:opacity-100">
        Use template
      </span>
    </button>
  );
}

export function PresetGallery() {
  const category = useStudio((s) => s.category);
  const presetId = useStudio((s) => s.presetId);
  const setCategory = useStudio((s) => s.setCategory);
  const applyPreset = useStudio((s) => s.applyPreset);

  const list = category === "All" ? PRESETS : PRESETS.filter((p) => p.category === category);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium",
              category === c
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-elevated text-muted hover:text-fg",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {category === "All" && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">QR Art gallery</p>
          <div className="grid grid-cols-4 gap-2">
            {GALLERY_PRESETS.slice(0, 12).map((p) => (
              <PresetThumb
                key={p.id}
                preset={p}
                active={presetId === p.id}
                onPick={() => applyPreset(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs tabular-nums text-subtle">{list.length} presets</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {list.map((p) => (
          <PresetThumb
            key={p.id}
            preset={p}
            active={presetId === p.id}
            onPick={() => applyPreset(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
