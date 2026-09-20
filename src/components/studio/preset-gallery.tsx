import { encode } from "uqr";
import { useEffect, useState } from "react";
import { GALLERY_PRESETS, PRESETS, PRESET_CATEGORIES } from "@/lib/qr/presets";
import { renderQr } from "@/lib/qr/render";
import type { Preset, QrStyle } from "@/lib/qr/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

const THUMB = encode("QRWHO", { ecc: "M", border: 0 });

function PresetThumb({
  preset,
  active,
  delay,
  onPick,
}: {
  preset: Preset;
  active: boolean;
  delay: number;
  onPick: () => void;
}) {
  const [src, setSrc] = useState("");
  const style = preset.style;

  useEffect(() => {
    if (preset.artUrl) return;
    const canvas = document.createElement("canvas");
    const thumbStyle: QrStyle = { ...style, imageMode: "none", quietZone: 1, transparentBg: false };
    renderQr(canvas, THUMB, thumbStyle, { pixelSize: 96, exportScale: true });
    setSrc(canvas.toDataURL("image/png"));
  }, [style, preset.artUrl]);

  return (
    <button
      type="button"
      onClick={onPick}
      title={preset.name}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "preset-pop group flex min-w-0 flex-col gap-1.5 rounded-md border p-1.5 text-left transition-all duration-150",
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
        ) : src ? (
          <img src={src} alt="" className="size-full" />
        ) : null}
      </div>
      <span className="truncate px-0.5 text-[10px] leading-tight text-muted group-hover:text-fg">
        {preset.name}
      </span>
    </button>
  );
}

export function PresetGallery() {
  const category = useStudio((s) => s.category);
  const presetId = useStudio((s) => s.presetId);
  const setCategory = useStudio((s) => s.setCategory);
  const applyPreset = useStudio((s) => s.applyPreset);

  const list =
    category === "All" ? PRESETS : PRESETS.filter((p) => p.category === category);

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
            {GALLERY_PRESETS.slice(0, 8).map((p, i) => (
              <PresetThumb
                key={p.id}
                preset={p}
                delay={i * 16}
                active={presetId === p.id}
                onPick={() => applyPreset(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs tabular-nums text-subtle">{list.length} presets</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {list.map((p, i) => (
          <PresetThumb
            key={p.id}
            preset={p}
            delay={Math.min(i, 23) * 16}
            active={presetId === p.id}
            onPick={() => applyPreset(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
