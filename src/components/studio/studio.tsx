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

const HOOK_WORDS = ["picture", "link", "Wi-Fi", "location", "contact", "menu", "event"];

function RotatingHook() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % HOOK_WORDS.length), 2600);
    return () => window.clearInterval(id);
  }, []);
  const word = HOOK_WORDS[i]!;
  return (
    <p className="mt-0.5 truncate text-[11px] text-fg/85 sm:text-xs">
      Turn any{" "}
      <span key={word} className="word-in inline-block font-semibold text-ok">
        {word}
      </span>{" "}
      into a working QR
    </p>
  );
}

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
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    hydrateHistory();
  }, [hydrateHistory]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-bg text-fg">
        <header className="relative z-30 shrink-0 border-b border-white/10 bg-bg/95 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3">
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
                <RotatingHook />
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
                  className="h-7 rounded-full border border-white/20 bg-elevated px-2.5 text-xs font-semibold text-fg/90 transition hover:border-accent hover:bg-white/10 hover:text-fg"
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

          <aside
            className={cn(
              "flex min-h-0 flex-col border-t border-border bg-elevated lg:min-h-[calc(100dvh-57px)] lg:border-t-0",
              sheetOpen ? "max-h-[52dvh] lg:max-h-none" : "lg:max-h-none",
            )}
          >
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 border-b border-border-strong lg:hidden",
                sheetOpen ? "bg-surface text-fg" : "bg-accent text-accent-fg",
              )}
              aria-expanded={sheetOpen}
            >
              <span className={cn("h-1.5 w-11 rounded-full", sheetOpen ? "bg-fg/70" : "bg-accent-fg/80")} />
              <span className="text-xs font-semibold tracking-wide">
                {sheetOpen ? "Close studio" : "Open presets & design"}
              </span>
              {sheetOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </button>

            <div
              className={cn(
                "sticky top-0 z-20 grid grid-cols-4 border-b border-border bg-surface p-1",
                !sheetOpen && "hidden lg:grid",
              )}
            >
              {STUDIO_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSheetOpen(true);
                      setMobileTab(tab.id);
                    }}
                    className={cn(
                      "flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "border border-border-strong bg-elevated font-semibold text-fg shadow-sm"
                        : "text-fg/75 hover:bg-surface-hover hover:text-fg",
                    )}
                  >
                    <Icon className="size-3.5 sm:size-4" />
                    <span className="text-[10px] leading-none sm:text-[11px]">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin sm:p-5",
                !sheetOpen && "hidden lg:block",
              )}
            >
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
