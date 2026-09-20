import {
  ChevronDown,
  ChevronUp,
  Globe,
  ImageIcon,
  LayoutGrid,
  Palette,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ContentPanel } from "@/components/studio/content-panel";
import { AmbientArt } from "@/components/studio/ambient-art";
import { ArtShowcase } from "@/components/studio/art-showcase";
import { DesignPanel } from "@/components/studio/design-panel";
import { ImagePanel } from "@/components/studio/image-panel";
import { PresetGallery } from "@/components/studio/preset-gallery";
import { QrStage } from "@/components/studio/qr-stage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PRESETS, PRESET_CATEGORIES } from "@/lib/qr/presets";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const STUDIO_TABS = [
  { id: "content" as const, label: "Link", icon: Type },
  { id: "presets" as const, label: "Presets", icon: LayoutGrid },
  { id: "design" as const, label: "Design", icon: Palette },
  { id: "image" as const, label: "Picture", icon: ImageIcon },
] as const;

export function Studio() {
  const mobileTab = useStudio((s) => s.mobileTab);
  const setMobileTab = useStudio((s) => s.setMobileTab);
  const hydrateHistory = useStudio((s) => s.hydrateHistory);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  useEffect(() => {
    hydrateHistory();
  }, [hydrateHistory]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-bg text-fg">
        <header className="relative shrink-0 border-b border-border bg-bg/90 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3">
          <div className="hero-glow pointer-events-none absolute inset-0 hidden sm:block" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img
                src="/logo.png"
                alt="QRWho"
                className="size-8 shrink-0 rounded-lg border border-border sm:size-10 sm:rounded-xl"
              />
              <div className="min-w-0">
                <h1 className="font-display text-xl italic leading-none tracking-tight sm:text-2xl">
                  <span className="wordmark-shimmer">QRWho</span>
                </h1>
                <p className="mt-0.5 hidden truncate text-xs text-muted sm:block">
                  Turn any picture into a working QR code · on-device & private
                </p>
              </div>
            </div>

            <div className="hidden flex-wrap items-center justify-end gap-1.5 lg:flex">
              {PRESET_CATEGORIES.filter((c) => c !== "All").map((c) => (
                <button
                  key={c}
                  type="button"
                  title={`Surprise me with a ${c} look`}
                  onClick={() => {
                    const pool = PRESETS.filter((p) => p.category === c);
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    if (!pick) return;
                    useStudio.getState().setCategory(c);
                    useStudio.getState().applyPreset(pick.id);
                  }}
                  className="h-7 rounded-full border border-border bg-elevated/70 px-2.5 text-xs font-medium text-muted transition hover:border-border-strong hover:text-fg"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_430px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <main className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
            <AmbientArt />
            <QrStage />
          </main>

          <aside className="flex max-h-[46dvh] min-h-0 flex-col border-t border-border bg-elevated/40 lg:max-h-none lg:min-h-[calc(100dvh-57px)] lg:border-t-0">
            <div className="sticky top-0 z-20 grid grid-cols-4 border-b border-border bg-surface/90 p-1 backdrop-blur">
              {STUDIO_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={cn(
                      "flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "border border-border/80 bg-elevated font-semibold text-fg shadow-sm"
                        : "text-muted hover:bg-surface/50 hover:text-fg",
                    )}
                  >
                    <Icon className="size-3.5 sm:size-4" />
                    <span className="text-[10px] leading-none sm:text-[11px]">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin sm:p-5">
              {mobileTab === "content" && <ContentPanel />}
              {mobileTab === "presets" && <PresetGallery />}
              {mobileTab === "design" && <DesignPanel />}
              {mobileTab === "image" && <ImagePanel />}
            </div>
          </aside>
        </div>

        <div className="hidden border-t border-border bg-surface/60 sm:block">
          <button
            type="button"
            onClick={() => setShowcaseOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-muted transition hover:text-fg sm:px-6"
          >
            <span className="flex items-center gap-2">
              <Globe className="size-4 text-ok" />
              <span>Art directions & print specs</span>
            </span>
            {showcaseOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {showcaseOpen && <ArtShowcase />}
        </div>

        <Toaster theme="dark" position="bottom-center" richColors={false} />
      </div>
    </TooltipProvider>
  );
}
