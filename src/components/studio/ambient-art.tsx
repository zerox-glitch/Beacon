import { Lock, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { useCms } from "@/lib/cms/runtime";

export function AmbientArt() {
  const { presetCount } = useCms();
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="stage-art-canvas" />
        <div className="stage-art-overlay" />

        <div className="absolute left-3 top-3 size-8 border-l border-t border-white/20 sm:left-6 sm:top-6" />
        <div className="absolute right-3 top-3 size-8 border-r border-t border-white/20 sm:right-6 sm:top-6" />
        <div className="absolute bottom-3 left-3 size-8 border-l border-b border-white/20 sm:bottom-6 sm:left-6" />
        <div className="absolute bottom-3 right-3 size-8 border-r border-b border-white/20 sm:bottom-6 sm:right-6" />

        <div className="absolute left-4 top-4 hidden items-center gap-2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-xs text-fg shadow-xl backdrop-blur sm:flex">
          <Sparkles className="size-3.5 text-ok" />
          <span>{presetCount} styles · still a real QR</span>
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
      </div>
    </div>
  );
}
