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

/** Scattered QR-flavoured micro-glyphs that delicately twinkle behind the stage. */
const BITS: Bit[] = [
  { top: "10%", left: "8%", size: 12, kind: "sq", color: "#7fd0c4", rot: "8deg", dur: "7s", delay: "0s" },
  { top: "18%", left: "15%", size: 6, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "9s", delay: "1.2s" },
  { top: "8%", left: "28%", size: 14, kind: "ring", color: "#e06298", rot: "-6deg", dur: "8s", delay: "0.6s" },
  { top: "14%", left: "76%", size: 10, kind: "sq", color: "#e08c00", rot: "14deg", dur: "7.5s", delay: "2s" },
  { top: "9%", left: "88%", size: 7, kind: "dot", color: "#7fd0c4", rot: "0deg", dur: "6.5s", delay: "0.9s" },
  { top: "24%", left: "84%", size: 16, kind: "ring", color: "#f3f0e8", rot: "4deg", dur: "10s", delay: "1.6s" },
  { top: "32%", left: "5%", size: 8, kind: "dash", color: "#e06298", rot: "-14deg", dur: "8.5s", delay: "0.3s" },
  { top: "48%", left: "7%", size: 6, kind: "dot", color: "#e08c00", rot: "0deg", dur: "7s", delay: "2.4s" },
  { top: "62%", left: "6%", size: 13, kind: "ring", color: "#7fd0c4", rot: "10deg", dur: "9.5s", delay: "1s" },
  { top: "78%", left: "9%", size: 10, kind: "sq", color: "#f3f0e8", rot: "-8deg", dur: "8s", delay: "0.5s" },
  { top: "88%", left: "20%", size: 7, kind: "dot", color: "#e06298", rot: "0deg", dur: "6s", delay: "1.8s" },
  { top: "92%", left: "48%", size: 11, kind: "dash", color: "#7fd0c4", rot: "6deg", dur: "9s", delay: "0.2s" },
  { top: "86%", left: "72%", size: 8, kind: "dot", color: "#f3f0e8", rot: "0deg", dur: "7.5s", delay: "2.8s" },
  { top: "78%", left: "86%", size: 13, kind: "sq", color: "#e08c00", rot: "12deg", dur: "8.5s", delay: "1.4s" },
  { top: "58%", left: "90%", size: 7, kind: "dot", color: "#e06298", rot: "0deg", dur: "6.5s", delay: "0.7s" },
  { top: "38%", left: "88%", size: 9, kind: "dash", color: "#f3f0e8", rot: "-10deg", dur: "9s", delay: "2.2s" },
  { top: "26%", left: "68%", size: 6, kind: "dot", color: "#7fd0c4", rot: "0deg", dur: "7s", delay: "1.1s" },
  { top: "28%", left: "22%", size: 6, kind: "dot", color: "#e08c00", rot: "0deg", dur: "8s", delay: "0.4s" },
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
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Delicate geometric dot matrix grid */}
      <div className="ambient-grid absolute inset-0 opacity-80" />
      
      {/* Subtle starlight constellation texture */}
      <div className="ambient-constellation absolute inset-0 opacity-40" />

      {/* Elegant corner guide marks like an architectural blueprint */}
      <div className="absolute left-6 top-6 size-4 border-l border-t border-border opacity-30" />
      <div className="absolute right-6 top-6 size-4 border-r border-t border-border opacity-30" />
      <div className="absolute bottom-6 left-6 size-4 border-l border-b border-border opacity-30" />
      <div className="absolute bottom-6 right-6 size-4 border-r border-b border-border opacity-30" />

      {/* Floating micro-bits */}
      {BITS.map((b, i) => (
        <span key={i} className="ambient-bit" style={bitStyle(b)} />
      ))}
    </div>
  );
}
