import { Lock, Palette, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { useStudio } from "@/lib/store";

interface Bit {
  top: string;
  left: string;
  size: number;
  kind: "sq" | "ring" | "dash" | "dot";
  color: string;
  rot: string;
  dur: string;
  delay: string;
}

/** Scattered QR-flavoured micro-glyphs that delicately twinkle across the canvas. */
const BITS: Bit[] = [
  { top: "14%", left: "7%", size: 10, kind: "sq", color: "#7fd0c4", rot: "8deg", dur: "9s", delay: "0s" },
  { top: "12%", left: "88%", size: 8, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "11s", delay: "1.6s" },
  { top: "48%", left: "5%", size: 9, kind: "ring", color: "#e06298", rot: "-6deg", dur: "10s", delay: "0.8s" },
  { top: "82%", left: "10%", size: 10, kind: "dash", color: "#e08c00", rot: "12deg", dur: "12s", delay: "2.2s" },
  { top: "86%", left: "86%", size: 8, kind: "sq", color: "#7fd0c4", rot: "-8deg", dur: "10s", delay: "0.4s" },
  { top: "42%", left: "93%", size: 7, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "11s", delay: "1.1s" },
];

function bitStyle(b: Bit): CSSProperties {
  const base: CSSProperties = {
    top: b.top,
    left: b.left,
    width: b.kind === "dash" ? b.size * 2.2 : b.size,
    height: b.kind === "dash" ? b.size * 0.8 : b.size,
    animationDuration: b.dur,
    animationDelay: b.delay,
    ["--rot" as never]: b.rot,
  };
  if (b.kind === "ring") {
    base.background = "transparent";
    base.border = `1.5px solid ${b.color}`;
    base.borderRadius = 4;
  } else if (b.kind === "dot") {
    base.background = b.color;
    base.borderRadius = 9999;
  } else {
    base.background = b.color;
    base.borderRadius = 3;
  }
  return base;
}

export function AmbientArt() {
  const stageBg = useStudio((s) => s.stageBg);

  const bgImage =
    stageBg === "waves"
      ? "/bg-waves.jpg"
      : stageBg === "vibrant"
        ? "/bg-vibrant-art.jpg"
        : stageBg === "minimal"
          ? "/bg-studio.jpg"
          : "/bg-art.jpg";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="stage-art-canvas" style={{ backgroundImage: `url(${bgImage})` }} />
        <div className="stage-art-overlay" />
        <div className="ambient-grid absolute inset-0 opacity-20" />
        <div className="ambient-constellation absolute inset-0 opacity-25" />

        <div className="absolute left-3 top-3 size-8 border-l border-t border-white/20 sm:left-6 sm:top-6" />
        <div className="absolute right-3 top-3 size-8 border-r border-t border-white/20 sm:right-6 sm:top-6" />
        <div className="absolute bottom-3 left-3 size-8 border-l border-b border-white/20 sm:bottom-6 sm:left-6" />
        <div className="absolute bottom-3 right-3 size-8 border-r border-b border-white/20 sm:bottom-6 sm:right-6" />

        <div className="absolute left-4 top-4 hidden items-center gap-2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-xs text-fg shadow-xl backdrop-blur sm:flex">
          <Sparkles className="size-3.5 text-ok" />
          <span>178 styles · still a real QR</span>
        </div>

        <div className="absolute right-4 top-4 hidden items-center gap-2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-xs text-fg shadow-xl backdrop-blur sm:flex">
          <ShieldCheck className="size-3.5 text-ok" />
          <span>Level H scannable</span>
        </div>

        <div className="absolute bottom-4 left-4 hidden items-center gap-2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-xs text-fg shadow-xl backdrop-blur sm:flex">
          <Lock className="size-3.5 text-ok" />
          <span>On-device · never uploaded</span>
        </div>

        <div className="absolute bottom-4 right-4 hidden items-center gap-2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-xs text-fg shadow-xl backdrop-blur sm:flex">
          <Palette className="size-3.5 text-ok" />
          <span>2048px PNG + SVG</span>
        </div>

        {BITS.map((b, i) => (
          <span key={i} className="ambient-bit" style={bitStyle(b)} />
        ))}
      </div>
    </div>
  );
}
