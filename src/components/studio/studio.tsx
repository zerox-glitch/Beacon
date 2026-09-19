import {
  ChevronDown,
  ChevronUp,
  Globe,
  ImageIcon,
  LayoutGrid,
  Palette,
  Sparkles,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PRESETS, PRESET_CATEGORIES } from "@/lib/qr/presets";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const STUDIO_TABS = [
  { id: "content" as const, label: "Destination", icon: Type, hint: "Link, WiFi, vCard" },
  { id: "presets" as const, label: "Presets", icon: LayoutGrid, hint: "178 styles" },
  { id: "design" as const, label: "Design", icon: Palette, hint: "Colors & Shapes" },
  { id: "image" as const, label: "Picture", icon: ImageIcon, hint: "Photo & Logo" },
] as const;

const ROTATING_WORDS = ["picture", "menu", "link", "Wi-Fi", "event", "contact", "vCard"];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % ROTATING_WORDS.length), 2100);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span key={i} className="word-in inline-block min-w-[3.6em] text-left text-fg font-medium">
      {ROTATING_WORDS[i]}
    </span>
  );
}

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
        {/* Top Header */}
        <header className="relative shrink-0 overflow-hidden border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="QRWho logo"
                className="logo-float size-10 shrink-0 rounded-xl border border-border shadow-[0_0_24px_rgb(127_208_196/0.2)]"
              />
              <div>
                <h1 className="font-display text-2xl italic leading-none tracking-tight">
                  <span className="wordmark-shimmer">QRWho</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                  Turn any <RotatingWord /> into a working QR code · 100% on-device & private
                </p>
              </div>
            </div>

            {/* Category Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                  className="chip-vibe h-7.5 rounded-full border border-border bg-elevated/70 px-2.5 text-xs font-medium text-muted backdrop-blur transition hover:-translate-y-0.5 hover:border-border-strong hover:text-fg active:scale-95"
                >
                  <Sparkles className="mr-1 inline size-3 text-ok" aria-hidden />
                  {c}
                </button>
              ))}
              <span className="ml-1 text-xs tabular-nums text-subtle font-mono">
                {PRESETS.length} presets
              </span>
            </div>
          </div>
        </header>

        {/* Main 2-Column Professional Studio Workspace */}
        <div className="relative flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px]">
          {/* Left Hero Canvas: Sticky QR Stage on Radiant Background Art */}
          <main className="relative flex min-h-[580px] flex-1 flex-col items-center justify-center overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
            <AmbientArt />
            <QrStage />
          </main>

          {/* Right Column: Unified Studio Control Dock */}
          <aside className="flex flex-col bg-elevated/40 lg:min-h-[calc(100dvh-65px)]">
            {/* Control Tabs Header */}
            <div className="grid grid-cols-4 border-b border-border bg-surface/80 p-1.5 backdrop-blur">
              {STUDIO_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "bg-elevated text-fg shadow-sm border border-border/80 font-semibold"
                        : "text-muted hover:text-fg hover:bg-surface/50",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="text-[11px] leading-none">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Control Panel Content */}
            <ScrollArea className="flex-1">
              <div className="p-5">
                {mobileTab === "content" && <ContentPanel />}
                {mobileTab === "presets" && <PresetGallery />}
                {mobileTab === "design" && <DesignPanel />}
                {mobileTab === "image" && <ImagePanel />}
              </div>
            </ScrollArea>
          </aside>
        </div>

        {/* Expandable SEO & Art Gallery Showcase Footer */}
        <div className="border-t border-border bg-surface/60">
          <button
            type="button"
            onClick={() => setShowcaseOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-xs font-medium text-muted hover:text-fg transition"
          >
            <span className="flex items-center gap-2">
              <Globe className="size-4 text-ok" />
              <span>Explore Art Directions, Business Use Cases & Enterprise Specs</span>
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
