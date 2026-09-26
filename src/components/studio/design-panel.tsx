import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  EYE_SHAPES,
  MODULE_SHAPES,
  QR_EFFECTS,
  type EccLevel,
  type GradientType,
} from "@/lib/qr/types";
import { useCms } from "@/lib/cms/runtime";
import { cn } from "@/lib/utils";
import { FRAME_DEFS } from "@/lib/qr/frames";
import { useStudio } from "@/lib/store";
import { ColorStudio } from "@/components/studio/color-studio";
import { EyeIcon, ModuleShapeIcon } from "@/components/studio/shape-icon";

/**
 * Per-element color pill (e.g. "Dot Color" beside Module Dot Shapes).
 * Shows the live color; tapping it opens the system picker for just that element.
 */
function ColorChip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg transition hover:border-border-strong"
      title={`Pick ${label.toLowerCase()}`}
    >
      <span
        className="size-3.5 rounded-full border border-white/25"
        style={{ background: value }}
        aria-hidden
      />
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label={`${label} picker`}
      />
    </label>
  );
}

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

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold text-fg">{children}</p>;
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
  const { brand } = useCms();
  const frameDefs = FRAME_DEFS.filter(
    (f) => f.id === "none" || (brand.enabledFrames ?? []).includes(f.id),
  );

  const eyeInk = style.eyeColor || style.fg;
  const pupilInk = style.ballColor || style.fg;

  return (
    <div className="flex flex-col gap-5">
      {/* Module Shapes — the actual shapes, drawn by the real renderer */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle>Module Dot Shapes</SectionTitle>
          <ColorChip label="Dot Color" value={style.fg} onChange={(v) => patch({ fg: v })} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {MODULE_SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              onClick={() => patch({ moduleShape: sh.id })}
              title={sh.label}
              aria-label={`Module shape: ${sh.label}`}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl border transition active:scale-95",
                style.moduleShape === sh.id
                  ? "border-accent bg-accent/15 shadow-sm"
                  : "border-border bg-elevated hover:border-border-strong",
              )}
            >
              <ModuleShapeIcon shape={sh.id} color={style.fg} size={32} />
            </button>
          ))}
        </div>
      </section>

      {/* Finder Eyes Outer — real 7×7 eye previews */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle>Eye Frame Shapes</SectionTitle>
          <ColorChip
            label="Frame Color"
            value={eyeInk}
            onChange={(v) => patch({ eyeColor: v })}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {EYE_SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              onClick={() => patch({ eyeShape: sh.id })}
              title={sh.label}
              aria-label={`Eye frame: ${sh.label}`}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl border p-2 transition active:scale-95",
                style.eyeShape === sh.id
                  ? "border-accent bg-accent/15 shadow-sm"
                  : "border-border bg-elevated hover:border-border-strong",
              )}
            >
              <EyeIcon
                frame={sh.id}
                ball={style.ballShape as never}
                ink={eyeInk}
                pupil={pupilInk}
                paper={style.bg}
                size={34}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Finder Eye Balls Center — shown inside your chosen frame */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle>Eye Pupil Shapes</SectionTitle>
          <ColorChip
            label="Pupil Color"
            value={pupilInk}
            onChange={(v) => patch({ ballColor: v })}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {EYE_SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              onClick={() => patch({ ballShape: sh.id })}
              title={sh.label}
              aria-label={`Eye pupil: ${sh.label}`}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl border p-2 transition active:scale-95",
                style.ballShape === sh.id
                  ? "border-accent bg-accent/15 shadow-sm"
                  : "border-border bg-elevated hover:border-border-strong",
              )}
            >
              <EyeIcon
                frame={style.eyeShape as never}
                ball={sh.id}
                ink={eyeInk}
                pupil={pupilInk}
                paper={style.bg}
                size={34}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Honesty note: what the template keeps vs. what your picks override */}
      {Boolean(style.artDirection) && !pictured && (
        <p className="-mt-3 text-[11px] leading-snug text-muted">
          Art templates keep their own eye design — “Square” and “Soft” leave it untouched. Choose
          another eye or pupil shape to restyle the template, and dot size adjusts the module
          weight it prints with.
        </p>
      )}

      {/* Colors — target picker, HSB sliders, swatches, themes */}
      <ColorStudio style={style} patch={patch} />

      {/* Fine tune — every other setting: geometry, frame, effects & output */}
      <section className="grid gap-5 rounded-xl border border-border bg-elevated/60 p-4">
        <div>
          <SectionTitle>Fine tune</SectionTitle>
          <p className="mt-0.5 text-[11px] text-muted">
            All the other settings — geometry, frame, effects &amp; output.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Frame &amp; caption</p>
          <div className="grid grid-cols-3 gap-1.5">
            {frameDefs.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrame(f.id)}
                title={f.hint}
                className={cn(
                  "h-10 rounded-md border text-[11px] font-semibold",
                  frame === f.id
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-elevated text-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={caption}
            placeholder='Optional · "SCAN ME"'
            onChange={(e) => setCaption(e.target.value.slice(0, 24))}
            className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </div>

        <div className="grid gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold tracking-wide text-fg">Geometry &amp; Weight</p>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Dot size</Label>
              <span className="text-xs font-medium tabular-nums text-fg">
                {Math.round(style.dotScale * 100)}%
              </span>
            </div>
            <Slider
              min={pictured ? 0.55 : 0.35}
              max={0.96}
              step={0.01}
              value={[Math.max(style.dotScale, pictured ? 0.55 : 0.35)]}
              onValueChange={([v]) => patch({ dotScale: v ?? 0.9 })}
            />
            <p className="mt-1 text-[11px] text-muted">
              {pictured
                ? "Size of the locked QR centroid. Lower = photograph; higher = plus / 3×3 bit lock."
                : "Adjusts the size of the QR modules."}
            </p>
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
            <p className="mt-1 text-[11px] text-muted">
              {pictured
                ? "Pushes dark modules darker and light modules lighter."
                : "Boosts color separation and camera readability."}
            </p>
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
              <p className="mt-1 text-[11px] text-muted">
                Higher keeps photo hue and softer tones. Lower crushes toward ink so cameras pop.
              </p>
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
              <Label>Quiet zone</Label>
              <span className="text-xs font-medium tabular-nums text-fg">{style.quietZone} cells</span>
            </div>
            <Slider
              min={2}
              max={6}
              step={1}
              value={[style.quietZone]}
              onValueChange={([v]) => patch({ quietZone: v ?? 3 })}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Kernel effect</p>
          <div className="grid grid-cols-3 gap-1.5">
            {QR_EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => patch({ effect: e.id })}
                title="Applies to standard and art-template codes; photo styles add their own depth."
                className={cn(
                  "h-10 rounded-md border text-[11px] font-medium transition active:scale-95",
                  style.effect === e.id
                    ? "border-accent bg-accent text-accent-fg font-semibold"
                    : "border-border bg-elevated text-muted hover:text-fg hover:border-border-strong",
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted">Gradient</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(["none", "linear", "diagonal", "radial", "image"] as GradientType[]).map((g) => (
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
                {g === "none" ? "Solid" : g === "image" ? "Photo" : g}
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

        <div className="grid gap-3 border-t border-border pt-4">
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted">
              Error correction level
            </p>
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
                Photo weaves lock error correction to H. That is about codewords, not “30% of pixels.”
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted">Mask pattern</p>
            <div className="grid grid-cols-5 gap-1.5">
              {([-1, 0, 1, 2, 3, 4, 5, 6, 7] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ maskPattern: m })}
                  className={cn(
                    "h-9 rounded-md border text-[11px] font-medium",
                    (style.maskPattern ?? -1) === m
                      ? "border-accent bg-accent text-accent-fg font-semibold"
                      : "border-border bg-elevated text-muted hover:text-fg",
                  )}
                >
                  {m < 0 ? "Auto" : m}
                </button>
              ))}
            </div>
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
        </div>
      </section>
    </div>
  );
}
