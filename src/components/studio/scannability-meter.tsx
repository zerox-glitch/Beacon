import { Loader2, Wand2 } from "lucide-react";
import { scanAdvice } from "@/lib/qr/autofix";
import { cn } from "@/lib/utils";
import { type QrStyle } from "@/lib/qr/types";
import { useStudio } from "@/lib/store";

interface PhotoStatus {
  candidate: string;
  robustness: number;
  fidelity: number;
  cameraRobust: boolean;
}

interface ScannabilityMeterProps {
  scanOk: boolean | null;
  style: QrStyle;
  hasImage: boolean;
  onAutoFix: () => void;
  fixing: boolean;
  /** Camera-stress + fidelity verdict from the photo engine (photo mode only). */
  photoStatus?: PhotoStatus | null;
}

type Band = "checking" | "high" | "good" | "fair" | "low" | "unscannable";

const BANDS: { id: Band; label: string; pos: number; color: string }[] = [
  { id: "high", label: "Excellent", pos: 8, color: "#7dba7a" },
  { id: "good", label: "Good", pos: 30, color: "#a3c46a" },
  { id: "fair", label: "Fair — image interference", pos: 52, color: "#c4b45a" },
  { id: "low", label: "Weak", pos: 74, color: "#c47a3a" },
  { id: "unscannable", label: "Not scanning", pos: 94, color: "#c45c4a" },
];

function readBand(scanOk: boolean | null, style: QrStyle, hasImage: boolean): Band {
  if (scanOk === null) return "checking";
  if (scanOk === false) return "unscannable";
  const simple = ["square", "dots", "rounded", "squircle"].includes(style.moduleShape);
  if (!hasImage && simple) return "high";
  if (!hasImage) return "good";
  if ((style.artisticStrength ?? 0.42) <= 0.45 && style.contrast >= 0.7) return "good";
  if ((style.artisticStrength ?? 0.42) > 0.7) return "fair";
  return "good";
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
  photoStatus,
}: ScannabilityMeterProps) {
  const notes = useStudio((s) => s.lastFixNotes);
  const band = readBand(scanOk, style, hasImage);
  const active = BANDS.find((b) => b.id === band) ?? BANDS[2]!;
  const checking = band === "checking";
  const needsTune = band === "low" || band === "unscannable" || band === "fair";
  const hint = needsTune ? adviceText(style, hasImage) : null;

  return (
    <div className="w-full rounded-xl border border-border-strong bg-elevated p-2 sm:p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: checking ? "#6a6760" : active.color }}
          />
          <span className="truncate text-xs font-semibold" style={{ color: checking ? undefined : active.color }}>
            {checking ? "Reading…" : `Scan quality: ${active.label}`}
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
        <span className="text-ok">Excellent</span>
        <span>Good</span>
        <span>Fair</span>
        <span>Weak</span>
        <span className="text-danger">Fail</span>
      </div>
      {photoStatus && (
        <p className="mt-1.5 text-[10px] leading-snug text-fg/75">
          {photoStatus.cameraRobust
            ? `Camera-sim robust · ${photoStatus.candidate} kernels · photo fidelity ${Math.round(
                photoStatus.fidelity * 100,
              )}% — still test on a real phone before print.`
            : `Static decode only — risky on real cameras (${photoStatus.candidate} kernels failed the stress battery). Tap Fix scan.`}
        </p>
      )}
      {notes.length > 0 && (() => {
        const first = notes[0] ?? "";
        const failed = first.startsWith("No look");
        const sentence = failed || first.startsWith("Reads");
        return (
          <p
            className={cn(
              "mt-1.5 text-[10px] leading-snug",
              failed ? "text-danger" : "text-ok",
            )}
          >
            {sentence ? first : `Fixed — ${notes.join(" · ")}`}
          </p>
        );
      })()}
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-snug text-fg/80">{hint} Fix scan tries each knob.</p>
      ) : hasImage ? (
        <p className="mt-1.5 text-[10px] leading-snug text-subtle">
          jsQR read this bitmap. Phone cameras can still differ — test before print.
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] leading-snug text-subtle">
          In-browser checker only. Always test with a real camera before print.
        </p>
      )}
    </div>
  );
}
