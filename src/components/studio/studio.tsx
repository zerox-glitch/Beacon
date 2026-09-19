import { ImageIcon, LayoutGrid, Palette, Sparkles, Type } from "lucide-react";
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

const MOBILE_TABS = [
  { id: "content", label: "Link", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "presets", label: "Presets", icon: LayoutGrid },
  { id: "design", label: "Design", icon: Palette },
] as const;

const ROTATING_WORDS = ["picture", "menu", "link", "Wi-Fi", "event", "contact"];

/** A little life: the tagline cycles through what you can turn into a QR. */
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % ROTATING_WORDS.length), 2100);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span key={i} className="word-in inline-block min-w-[3.6em] text-left text-fg">
      {ROTATING_WORDS[i]}
    </span>
  );
}

export function Studio() {
  const mobileTab = useStudio((s) => s.mobileTab);
  const setMobileTab = useStudio((s) => s.setMobileTab);
  const hydrateHistory = useStudio((s) => s.hydrateHistory);

  useEffect(() => {
    hydrateHistory();
  }, [hydrateHistory]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-bg text-fg">
        <header className="relative shrink-0 overflow-hidden border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="QRWho logo"
                className="logo-float size-11 shrink-0 rounded-xl border border-border shadow-[0_0_28px_rgb(127_208_196/0.18)]"
              />
              <div>
                <h1 className="font-display text-2xl italic leading-none tracking-tight">
                  <span className="wordmark-shimmer">QRWho</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted">
                  Turn any <RotatingWord /> into a working QR — pick a vibe, watch it change
                </p>
              </div>
            </div>
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
                  className="chip-vibe h-8 rounded-full border border-border bg-elevated/70 px-3 text-xs font-medium text-muted backdrop-blur transition hover:-translate-y-0.5 hover:border-border-strong hover:text-fg active:scale-95"
                >
                  <Sparkles className="mr-1 inline size-3" aria-hidden />
                  {c}
                </button>
              ))}
              <span className="ml-1 text-xs tabular-nums text-subtle">{PRESETS.length} presets</span>
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100dvh-65px)] flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className="hidden min-h-0 min-w-0 border-r border-border lg:flex lg:flex-col">
            <div className="border-b border-border px-4 py-3">
              <p className="font-display text-lg italic">Destination</p>
              <p className="text-xs text-muted">What the code opens</p>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-4">
                <ContentPanel />
              </div>
            </ScrollArea>
          </aside>

          <main className="relative min-h-0 min-w-0 overflow-x-hidden">
            <AmbientArt />
            <QrStage />
          </main>

          <aside className="hidden min-h-0 min-w-0 border-l border-border lg:flex lg:flex-col">
            <RightDesktop />
          </aside>
        </div>

        <div className="border-t border-border lg:hidden">
          <div className="max-h-[42dvh] overflow-y-auto px-4 py-4 scrollbar-thin">
            {mobileTab === "content" && <ContentPanel />}
            {mobileTab === "image" && <ImagePanel />}
            {mobileTab === "presets" && <PresetGallery />}
            {mobileTab === "design" && <DesignPanel />}
          </div>
          <nav className="grid grid-cols-4 border-t border-border">
            {MOBILE_TABS.map((t) => {
              const Icon = t.icon;
              const on = mobileTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMobileTab(t.id)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    on ? "text-fg" : "text-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rich Art Gallery Showcase & In-Depth SEO Section */}
        <ArtShowcase />

        <Toaster theme="dark" position="bottom-center" richColors={false} />
      </div>
    </TooltipProvider>
  );
}

function RightDesktop() {
  const tab = useStudio((s) => s.mobileTab);
  const setTab = useStudio((s) => s.setMobileTab);
  const desktopTabs = [
    { id: "presets" as const, label: "Presets" },
    { id: "design" as const, label: "Design" },
    { id: "image" as const, label: "Image" },
  ];
  const current = desktopTabs.some((t) => t.id === tab) ? tab : "presets";

  return (
    <>
      <div className="flex gap-1 border-b border-border p-2">
        {desktopTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 flex-1 rounded-md text-sm font-medium",
              current === t.id ? "bg-surface text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4">
          {current === "presets" && <PresetGallery />}
          {current === "design" && <DesignPanel />}
          {current === "image" && <ImagePanel />}
        </div>
      </ScrollArea>
    </>
  );
}
