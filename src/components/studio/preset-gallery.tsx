import { useEffect, useRef, useState } from "react";
import { useCms } from "@/lib/cms/runtime";
import { worksWithImages } from "@/lib/cms/catalog-merge";
import { cachedPresetThumb, renderPresetThumb } from "@/lib/qr/preset-thumb";
import type { Preset, QrStyle } from "@/lib/qr/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/store";

function Finder({
  className,
  ink,
  paper,
  ball,
}: {
  className: string;
  ink: string;
  paper: string;
  ball: string;
}) {
  return (
    <span className={cn("absolute size-[22%]", className)} style={{ background: ink }}>
      <span className="absolute inset-[18%]" style={{ background: paper }} />
      <span className="absolute inset-[36%]" style={{ background: ball }} />
    </span>
  );
}

function QrSkeleton({ style }: { style: QrStyle }) {
  const ink = style.eyeColor || style.fg;
  const paper = style.bg;
  const ball = style.ballColor || ink;
  const dot = style.fg;
  return (
    <div className="relative size-full overflow-hidden" style={{ background: paper }}>
      <Finder className="left-[8%] top-[8%]" ink={ink} paper={paper} ball={ball} />
      <Finder className="right-[8%] top-[8%]" ink={ink} paper={paper} ball={ball} />
      <Finder className="left-[8%] bottom-[8%]" ink={ink} paper={paper} ball={ball} />
      <span className="absolute left-[38%] top-[12%] size-[7%]" style={{ background: dot }} />
      <span className="absolute left-[52%] top-[12%] size-[7%]" style={{ background: dot }} />
      <span className="absolute left-[45%] top-[38%] size-[9%]" style={{ background: dot }} />
      <span className="absolute right-[18%] top-[42%] size-[7%]" style={{ background: dot }} />
      <span className="absolute left-[40%] bottom-[18%] size-[7%]" style={{ background: dot }} />
      <span className="absolute right-[28%] bottom-[28%] size-[8%]" style={{ background: dot }} />
    </div>
  );
}

function PresetThumb({
  preset,
  active,
  onPick,
}: {
  preset: Preset;
  active: boolean;
  onPick: () => void;
}) {
  const hostRef = useRef<HTMLButtonElement>(null);
  const [src, setSrc] = useState<string | null>(() => cachedPresetThumb(preset.id) ?? null);

  useEffect(() => {
    if (src) return;
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void renderPresetThumb(preset)
          .then(setSrc)
          .catch(() => {
            /* skeleton stays */
          });
      },
      { rootMargin: "180px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preset, src]);

  return (
    <button
      ref={hostRef}
      type="button"
      onClick={onPick}
      title={preset.blurb ? `${preset.name} — ${preset.blurb}` : preset.name}
      className={cn(
        "group flex min-w-0 flex-col gap-1.5 rounded-md border p-1.5 text-left transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgb(0_0_0/0.35)] active:scale-[0.97]",
        active ? "border-accent bg-surface" : "border-border bg-elevated hover:border-border-strong",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-sm" style={{ background: preset.style.bg }}>
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <QrSkeleton style={preset.style} />
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
  const style = useStudio((s) => s.style);
  const imageUrl = useStudio((s) => s.imageUrl);
  const [showAll, setShowAll] = useState(false);

  // CMS-merged: built-ins + admin custom templates, hidden ones filtered out.
  const { catalog } = useCms();
  const PRESETS = catalog.presets;
  const GALLERY_PRESETS = PRESETS.filter((p) => Boolean(p.artUrl));
  const PRESET_CATEGORIES = ["All", ...catalog.categories];

  // With a photo driving the QR, only templates that can CARRY the photo are
  // offered by default — flat weave-less styles would drop it. Admins pin the
  // verdict per template (imageCompatible); the toggle reveals the rest.
  const photoActive =
    Boolean(imageUrl) && style.imageMode !== "none" && style.imageMode !== "logo";
  const baseList = category === "All" ? PRESETS : PRESETS.filter((p) => p.category === category);
  const list = photoActive && !showAll
    ? baseList.filter((p) => worksWithImages(p) || p.id === presetId)
    : baseList;
  const hiddenCount = baseList.length - list.length;

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

      {photoActive ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-subtle">
          <span>
            {showAll
              ? "All styles shown — flat ones leave the picture out."
              : `Photo is on: ${list.length} photo-ready look${list.length === 1 ? "" : "s"} shown.`}
          </span>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="font-semibold text-accent hover:underline"
          >
            {showAll ? "Show only photo styles" : `Show all (${hiddenCount} more)`}
          </button>
        </p>
      ) : null}
      <p className="text-xs tabular-nums text-subtle">{list.length} looks — each tile is a real QR</p>
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
