import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Wand2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { type QrStyle } from "@/lib/qr/types";

interface ScannabilityMeterProps {
  scanOk: boolean | null;
  style: QrStyle;
  hasImage: boolean;
  onAutoFix: () => void;
  fixing: boolean;
}

export function ScannabilityMeter({
  scanOk,
  style,
  hasImage,
  onAutoFix,
  fixing,
}: ScannabilityMeterProps) {
  let score = 70;
  let statusText = "Checking…";
  let colorClass = "text-muted";
  let barGradient = "from-muted/40 to-muted";

  if (scanOk === true) {
    score = hasImage ? (style.contrast >= 0.7 ? 96 : 90) : 98;
    statusText = `${score}% ready`;
    colorClass = "text-ok";
    barGradient = "from-ok/80 to-ok";
  } else if (scanOk === false) {
    score = 38;
    statusText = "Needs tune";
    colorClass = "text-warn";
    barGradient = "from-warn/80 to-warn";
  }

  return (
    <div className="w-full max-w-[210px] rounded-xl border border-border/80 bg-surface/80 p-2 sm:max-w-[300px] sm:p-2.5 md:max-w-[380px] lg:max-w-[420px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {scanOk === true ? (
            <CheckCircle2 className="size-4 shrink-0 text-ok" />
          ) : scanOk === false ? (
            <AlertTriangle className="size-4 shrink-0 animate-pulse text-warn" />
          ) : (
            <Zap className="size-4 shrink-0 text-muted" />
          )}
          <span className={cn("truncate text-xs font-semibold tabular-nums", colorClass)}>{statusText}</span>
        </div>
        <button
          type="button"
          onClick={onAutoFix}
          disabled={fixing}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50",
            scanOk === false
              ? "bg-warn text-bg hover:bg-warn/90"
              : "border border-border bg-elevated text-fg hover:bg-surface",
          )}
        >
          {fixing ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
          <span>Fix scan</span>
        </button>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-border/50 bg-elevated">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", barGradient)}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-1 hidden items-center justify-between font-mono text-[10px] text-muted sm:flex">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-ok" />
          ECC {style.ecc}
        </span>
        <span>Raises contrast, keeps your picture</span>
      </div>
    </div>
  );
}
