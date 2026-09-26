/**
 * Color Studio — pick a color the way a designer does:
 *  • choose WHAT you're painting (modules / background / eye frame / pupil)
 *  • drag Hue / Saturation / Brightness — the QR repaints live
 *  • type or copy the hex, jump to a swatch, or apply a whole theme
 *  • one-tap "Sync eyes to dots" and "Invert colors"
 */
import { useEffect, useState } from "react";
import { Check, Copy, RefreshCcw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import type { QrStyle } from "@/lib/qr/types";
import { cn } from "@/lib/utils";

type TargetKey = "fg" | "bg" | "eyeColor" | "ballColor";

const TARGETS: { key: TargetKey; label: string }[] = [
  { key: "fg", label: "Modules / Dots" },
  { key: "bg", label: "Background" },
  { key: "eyeColor", label: "Eye frame" },
  { key: "ballColor", label: "Pupil" },
];

const SWATCHES = [
  "#111111", "#1c1c1e", "#3a3a3c", "#8e8e93", "#f2f0ea", "#ffffff",
  "#f5f5f7", "#22d3ee", "#06b6d4", "#3b82f6", "#2563eb", "#4f46e5",
  "#7c3aed", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#ef4444",
  "#dc2626", "#f97316", "#ea580c", "#f59e0b", "#eab308",
  "#84cc16", "#10b981", "#059669", "#14b8a6", "#0369a1", "#6b21a8",
  "#9f1239", "#7c2d12",
];

const THEMES: { name: string; fg: string; bg: string; eyeColor: string; ballColor: string }[] = [
  { name: "Neon Cyan", fg: "#22d3ee", bg: "#0a1018", eyeColor: "#67e8f9", ballColor: "#0a1018" },
  { name: "Obsidian Gold", fg: "#d4a437", bg: "#14100a", eyeColor: "#e8c15a", ballColor: "#14100a" },
  { name: "Royal Purple", fg: "#8b5cf6", bg: "#120a1e", eyeColor: "#a78bfa", ballColor: "#120a1e" },
  { name: "Sakura", fg: "#d64f7c", bg: "#faf3f5", eyeColor: "#b0386a", ballColor: "#faf3f5" },
  { name: "Forest", fg: "#2f6b4f", bg: "#f0f4ee", eyeColor: "#1f4d38", ballColor: "#f0f4ee" },
  { name: "Midnight", fg: "#e8e6df", bg: "#101318", eyeColor: "#e8e6df", ballColor: "#101318" },
];

/* ------------------------------ color math ------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [20, 20, 20];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/* ------------------------------ component ------------------------------ */

function Range({
  value,
  max,
  track,
  readout,
  onChange,
  ariaLabel,
}: {
  value: number;
  max: number;
  track: string;
  readout: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{ariaLabel}</span>
        <span className="text-xs font-bold tabular-nums text-fg">{readout}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cs-range w-full"
        style={{ background: track }}
      />
    </div>
  );
}

export function ColorStudio({
  style,
  patch,
}: {
  style: QrStyle;
  patch: (p: Partial<QrStyle>) => void;
}) {
  const [target, setTarget] = useState<TargetKey>("fg");
  const hex = style[target] || (target === "bg" ? "#f4f1ea" : "#141414");
  const [h, s, l] = hexToHsl(hex);
  const [hexDraft, setHexDraft] = useState(hex);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex]);

  const apply = (v: string) => patch({ [target]: v } as Partial<QrStyle>);

  const hueTrack = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
    .map((a) => `hsl(${a} ${s}% ${l}%)`)
    .join(", ")})`;
  const satTrack = `linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`;
  const litTrack = `linear-gradient(to right, #000, hsl(${h} ${s}% 50%), #fff)`;

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`Copied ${hex}`);
    } catch {
      /* clipboard blocked — the value is right there to select */
    }
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-elevated/60 p-4">
      <div className="flex items-center gap-3">
        <span
          className="size-10 shrink-0 rounded-lg border border-white/15 shadow-inner"
          style={{ background: hex }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-fg">Color Studio</p>
          <p className="font-mono text-xs uppercase text-muted">{hex}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => patch({ eyeColor: style.fg, ballColor: style.fg })}
            title="Set both eye frame and pupil to the module color"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg transition hover:bg-surface-hover"
          >
            <RefreshCcw className="size-3.5" />
            Sync eyes to dots
          </button>
          <button
            type="button"
            onClick={() => patch({ fg: style.bg, bg: style.fg })}
            title="Swap foreground and background"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[11px] font-semibold text-fg transition hover:bg-surface-hover"
          >
            <Shuffle className="size-3.5" />
            Invert
          </button>
        </div>
      </div>

      {/* what am I painting */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {TARGETS.map((t) => {
          const val = style[t.key] || (t.key === "bg" ? "#f4f1ea" : "#141414");
          const active = target === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTarget(t.key)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition",
                active
                  ? "border-accent bg-accent/15 text-fg"
                  : "border-border bg-surface text-muted hover:text-fg",
              )}
            >
              <span className="size-3.5 rounded-full border border-white/25" style={{ background: val }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <Range
        ariaLabel="Hue Spectrum"
        value={h}
        max={360}
        track={hueTrack}
        readout={`${h}°`}
        onChange={(v) => apply(hslToHex(v, s, l))}
      />
      <Range
        ariaLabel="Saturation / Vibrancy"
        value={s}
        max={100}
        track={satTrack}
        readout={`${s}%`}
        onChange={(v) => apply(hslToHex(h, v, l))}
      />
      <Range
        ariaLabel="Brightness / Shade"
        value={l}
        max={100}
        track={litTrack}
        readout={`${l}%`}
        onChange={(v) => apply(hslToHex(h, s, v))}
      />

      {/* hex input + copy */}
      <div className="flex items-center gap-1.5">
        <input
          value={hexDraft}
          onChange={(e) => {
            const v = e.target.value;
            setHexDraft(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v.trim())) apply(v.trim().toUpperCase());
          }}
          onBlur={() => setHexDraft(hex)}
          spellCheck={false}
          aria-label="Hex code"
          className="h-11 w-36 rounded-lg border border-border bg-surface px-3 font-mono text-sm uppercase text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <button
          type="button"
          onClick={() => void copyHex()}
          title="Copy hex"
          className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-fg transition hover:bg-surface-hover"
        >
          <Copy className="size-4" />
        </button>
        <input
          type="color"
          value={hex}
          onChange={(e) => apply(e.target.value.toUpperCase())}
          aria-label="System color picker"
          className="size-11 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
        />
      </div>

      {/* preset swatches */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Preset swatches</p>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Use ${c}`}
              onClick={() => apply(c.toUpperCase())}
              className={cn(
                "aspect-square rounded-full border border-white/15 transition active:scale-90",
                hex === c.toUpperCase() && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* whole-look themes */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Preset color themes</p>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => patch(t)}
              title={`Set modules ${t.fg} on ${t.bg}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface pl-1.5 pr-3 text-[11px] font-semibold text-fg transition hover:border-border-strong active:scale-95"
            >
              <span className="flex -space-x-1">
                <span className="size-5 rounded-full border border-white/20" style={{ background: t.fg }} />
                <span className="size-5 rounded-full border border-white/20" style={{ background: t.bg }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1 text-[11px] text-subtle">
        <Check className="size-3" />
        The QR repaints live — the scan meter above tells you if a combo still reads.
      </p>
    </div>
  );
}
