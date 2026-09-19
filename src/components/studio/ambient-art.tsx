import { Cpu, Lock, Palette, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

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
  { top: "12%", left: "6%", size: 14, kind: "sq", color: "#7fd0c4", rot: "8deg", dur: "7s", delay: "0s" },
  { top: "20%", left: "12%", size: 8, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "9s", delay: "1.2s" },
  { top: "8%", left: "22%", size: 16, kind: "ring", color: "#e06298", rot: "-6deg", dur: "8s", delay: "0.6s" },
  { top: "14%", left: "80%", size: 12, kind: "sq", color: "#e08c00", rot: "14deg", dur: "7.5s", delay: "2s" },
  { top: "10%", left: "92%", size: 9, kind: "dot", color: "#7fd0c4", rot: "0deg", dur: "6.5s", delay: "0.9s" },
  { top: "26%", left: "88%", size: 18, kind: "ring", color: "#f3f0e8", rot: "4deg", dur: "10s", delay: "1.6s" },
  { top: "34%", left: "4%", size: 10, kind: "dash", color: "#e06298", rot: "-14deg", dur: "8.5s", delay: "0.3s" },
  { top: "50%", left: "6%", size: 8, kind: "dot", color: "#e08c00", rot: "0deg", dur: "7s", delay: "2.4s" },
  { top: "66%", left: "5%", size: 15, kind: "ring", color: "#7fd0c4", rot: "10deg", dur: "9.5s", delay: "1s" },
  { top: "80%", left: "8%", size: 12, kind: "sq", color: "#f3f0e8", rot: "-8deg", dur: "8s", delay: "0.5s" },
  { top: "90%", left: "18%", size: 8, kind: "dot", color: "#e06298", rot: "0deg", dur: "6s", delay: "1.8s" },
  { top: "92%", left: "52%", size: 12, kind: "dash", color: "#7fd0c4", rot: "6deg", dur: "9s", delay: "0.2s" },
  { top: "86%", left: "76%", size: 9, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "7.5s", delay: "2.8s" },
  { top: "78%", left: "90%", size: 15, kind: "sq", color: "#e08c00", rot: "12deg", dur: "8.5s", delay: "1.4s" },
  { top: "56%", left: "94%", size: 8, kind: "dot", color: "#e06298", rot: "0deg", dur: "6.5s", delay: "0.7s" },
  { top: "38%", left: "92%", size: 11, kind: "dash", color: "#f3f0e8", rot: "-10deg", dur: "9s", delay: "2.2s" },
  { top: "24%", left: "74%", size: 7, kind: "dot", color: "#7fd0c4", rot: "0deg", dur: "7s", delay: "1.1s" },
  { top: "28%", left: "20%", size: 7, kind: "dot", color: "#e08c00", rot: "0deg", dur: "8s", delay: "0.4s" },
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
    base.border = `2px solid ${b.color}`;
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
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* High-definition generative artwork backdrop */}
      <div className="stage-art-canvas" />

      {/* Layered vibrant neon aurora illumination */}
      <div className="stage-art-overlay" />

      {/* Crisp geometric dot matrix grid */}
      <div className="ambient-grid absolute inset-0 opacity-70" />

      {/* Radiant starlight constellation layer */}
      <div className="ambient-constellation absolute inset-0 opacity-60" />

      {/* Elegant architectural blueprint framing lines */}
      <div className="absolute left-4 top-4 size-8 border-l-2 border-t-2 border-border-strong opacity-40 sm:left-8 sm:top-8" />
      <div className="absolute right-4 top-4 size-8 border-r-2 border-t-2 border-border-strong opacity-40 sm:right-8 sm:top-8" />
      <div className="absolute bottom-4 left-4 size-8 border-l-2 border-b-2 border-border-strong opacity-40 sm:bottom-8 sm:left-8" />
      <div className="absolute bottom-4 right-4 size-8 border-r-2 border-b-2 border-border-strong opacity-40 sm:bottom-8 sm:right-8" />

      {/* Floating art accent badges visible in the surrounding canvas space */}
      <div className="absolute left-6 top-10 hidden xl:flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted shadow-lg backdrop-blur">
        <Sparkles className="size-3.5 text-ok" />
        <span>Generative Matrix · 178 Styles</span>
      </div>

      <div className="absolute right-6 top-10 hidden xl:flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted shadow-lg backdrop-blur">
        <ShieldCheck className="size-3.5 text-ok" />
        <span>ISO 18004 Level H Scannable</span>
      </div>

      <div className="absolute bottom-10 left-6 hidden xl:flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted shadow-lg backdrop-blur">
        <Lock className="size-3.5 text-muted" />
        <span>100% Client-Side Privacy</span>
      </div>

      <div className="absolute bottom-10 right-6 hidden xl:flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs text-muted shadow-lg backdrop-blur">
        <Palette className="size-3.5 text-muted" />
        <span>2048px PNG + Vector SVG</span>
      </div>

      {/* Twinkling micro-glyphs */}
      {BITS.map((b, i) => (
        <span key={i} className="ambient-bit" style={bitStyle(b)} />
      ))}
    </div>
  );
}
