import { Loader2, Wand2 } from "lucide-react";
import { scanAdvice } from "@/lib/qr/autofix";
import { cn } from "@/lib/utils";
import { type QrStyle } from "@/lib/qr/types";

interface ScannabilityMeterProps {
  scanOk: boolean | null;
  style: QrStyle;
  hasImage: boolean;
  onAutoFix: () => void;
  fixing: boolean;
}

type Band = "checking" | "high" | "good" | "fair" | "low" | "unscannable";

const BANDS: { id: Band; label: string; pos: number; color: string }[] = [
  { id: "high", label: "High", pos: 8, color: "#7dba7a" },
  { id: "good", label: "Good", pos: 30, color: "#a3c46a" },
  { id: "fair", label: "Fair", pos: 52, color: "#c4b45a" },
  { id: "low", label: "Low", pos: 74, color: "#c47a3a" },
  { id: "unscannable", label: "Unscannable", pos: 94, color: "#c45c4a" },
];

function readBand(scanOk: boolean | null, style: QrStyle, hasImage: boolean): Band {
  if (scanOk === null) return "checking";
  if (scanOk === false) {
    if (hasImage && style.contrast >= 0.78 && style.dotScale >= 0.7) return "fair";
    if (hasImage && style.contrast < 0.5) return "unscannable";
    return "low";
  }
  const simple = ["square", "dots", "rounded", "squircle"].includes(style.moduleShape);
  if (!hasImage && simple) return "high";
  if (!hasImage) return "good";
  if (style.contrast >= 0.78 && style.imageOpacity <= 0.88) return "good";
  if (style.contrast >= 0.62) return "fair";
  return "low";
}

function adviceText(style: QrStyle, hasImage: boolean): string | null {
  const { raise, lower } = scanAdvice(style, hasImage);
  const bits: string[] = [];
  if (raise.length) bits.push(`increase ${raise.join(", ")}`);
  if (lower.length) bits.push(`decrease ${lower.join(", ")}`);
  if (!bits.length) return null;
  return `To lock: ${bits.join("; ")}.`;
}

export function ScannabilityMeter({
  scanOk,
  style,
  hasImage,
  onAutoFix,
  fixing,
}: ScannabilityMeterProps) {
  const band = readBand(scanOk, style, hasImage);
  const active = BANDS.find((b) => b.id === band) ?? BANDS[2]!;
  const checking = band === "checking";
  const needsTune = band === "low" || band === "unscannable";
  const hint = needsTune ? adviceText(style, hasImage) : null;

  return (
    <div className="w-full max-w-[210px] rounded-xl border border-border-strong bg-elevated p-2 sm:max-w-[300px] sm:p-2.5 md:max-w-[380px] lg:max-w-[420px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: checking ? "#6a6760" : active.color }}
          />
          <span className="truncate text-xs font-semibold" style={{ color: checking ? undefined : active.color }}>
            {checking ? "Reading…" : active.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onAutoFix}
          disabled={fixing}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50",
            needsTune
              ? "bg-warn text-bg hover:bg-warn/90"
              : "border border-border-strong bg-surface text-fg hover:bg-surface-hover",
          )}
        >
          {fixing ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
          <span>Fix scan</span>
        </button>
      </div>

      <div className="relative h-2 w-full rounded-full scan-hue-track">
        <span
          className="scan-hue-mark"
          style={{
            left: `${checking ? 50 : active.pos}%`,
            background: checking ? "#8c8880" : active.color,
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-semibold tracking-wide text-fg/70 sm:text-[10px]">
        <span className="text-ok">High</span>
        <span>Good</span>
        <span>Fair</span>
        <span>Low</span>
        <span className="text-danger">Unscannable</span>
      </div>
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-snug text-fg/80">{hint} Fix scan tries each knob.</p>
      ) : hasImage ? (
        <p className="mt-1.5 text-[10px] leading-snug text-subtle">
          Photo sits only in the dots. Phone cameras beat this checker — no hidden decoder.
        </p>
      ) : null}
    </div>
  );
}
