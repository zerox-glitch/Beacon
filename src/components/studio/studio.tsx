import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Globe,
  ImageIcon,
  LayoutGrid,
  Palette,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { ContentPanel } from "@/components/studio/content-panel";
import { AmbientArt } from "@/components/studio/ambient-art";
import { ArtShowcase } from "@/components/studio/art-showcase";
import { DesignPanel } from "@/components/studio/design-panel";
import { ImagePanel } from "@/components/studio/image-panel";
import { LibraryPanel } from "@/components/studio/library-panel";
import { PresetGallery } from "@/components/studio/preset-gallery";
import { QrStage } from "@/components/studio/qr-stage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPresetMerged, useCms } from "@/lib/cms/runtime";
import { classifyScan } from "@/lib/qr/scan-intent";
import { getPreset } from "@/lib/qr/presets";
import { useStudio } from "@/lib/store";
import { Link } from "@tanstack/react-router";
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
  { id: "content" as const, label: "Create", icon: Type },
  { id: "image" as const, label: "Picture", icon: ImageIcon },
  { id: "presets" as const, label: "Looks", icon: LayoutGrid },
  { id: "design" as const, label: "Tune", icon: Palette },
  { id: "library" as const, label: "Library", icon: FolderOpen },
] as const;

export function Studio() {
  const { catalog, brand, defaultTemplate } = useCms();
  const mobileTab = useStudio((s) => s.mobileTab);
  const setMobileTab = useStudio((s) => s.setMobileTab);
  const hydrateHistory = useStudio((s) => s.hydrateHistory);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  useEffect(() => {
    hydrateHistory();
  }, [hydrateHistory]);

  // Deep link from the landing "remake" flow: /studio?scan=<decoded text>.
  // Applies the payload once on load, over the seeded state.
  useEffect(() => {
    const scan = new URLSearchParams(window.location.search).get("scan");
    if (!scan) return;
    const intent = classifyScan(scan);
    const s = useStudio.getState();
    s.setKind(intent.kind);
    s.patchPayload(intent);
    toast.success("Scanned code loaded — make it yours");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Admin-picked opening look: applied ONCE per session, and only over the
  // seeded default view — a visitor who already started designing is never
  // overwritten. Falls back to the stock seeded preset when no default is set.
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (!defaultTemplate || defaultApplied.current) return;
    defaultApplied.current = true;
    const s = useStudio.getState();
    if (s.presetId !== "art-alpine-summit") return;
    const preset = getPresetMerged(defaultTemplate) ?? getPreset(defaultTemplate);
    if (!preset) return;
    s.applyPreset(defaultTemplate);
    if (preset.category) s.setCategory(preset.category);
  }, [defaultTemplate]);

  function toggleShowcase() {
    const open = !showcaseOpen;
    setShowcaseOpen(open);
    // On phones the sheet and the art panel would fight for the same
    // vertical space — close the sheet so the stage stays visible.
    if (open && !window.matchMedia("(min-width: 1024px)").matches) setSheetOpen(false);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
        <header className="relative z-30 shrink-0 border-b border-white/10 bg-bg/95 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3">
          <div className="hero-glow pointer-events-none absolute inset-0 hidden sm:block" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link to="/" aria-label="QRWho home" className="shrink-0">
                <img
                  src={brand.logoUrl || "/logo.png"}
                  alt={brand.siteName || "QRWho"}
                  className="size-8 rounded-lg border border-border sm:size-10 sm:rounded-xl"
                />
              </Link>
              <div className="min-w-0">
                <h1 className="font-display text-xl italic leading-none tracking-tight sm:text-2xl">
                  <span className="wordmark-shimmer">QRWho</span>
                </h1>
                <RotatingHook />
              </div>
            </div>

            <div className="hidden flex-wrap items-center justify-end gap-1.5 lg:flex">
              {catalog.categories.filter((c) => c !== "All").map((c) => (
                <button
                  key={c}
                  type="button"
                  title={`Surprise me with a ${c} look`}
                  onClick={() => {
                    const pool = catalog.presets.filter((p) => p.category === c);
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

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_430px] xl:grid-cols-[minmax(0,1fr)_470px]">
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
            <AmbientArt />
            <QrStage compact={sheetOpen} />
          </main>

          <aside
            className={cn(
              "z-20 flex min-h-0 flex-col border-t border-border bg-elevated lg:h-full lg:border-t-0",
              sheetOpen
                ? "h-[min(42dvh,420px)] shrink-0 lg:h-auto lg:max-h-none"
                : "h-12 shrink-0 lg:h-auto lg:max-h-none",
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
                "sticky top-0 z-20 grid grid-cols-5 border-b border-border bg-surface p-1",
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
              {mobileTab === "library" && <LibraryPanel />}
            </div>
          </aside>
        </div>

        {/* Art directions & print specs — inline in the studio (never navigates
            away). Always visible, high contrast, mobile + desktop. */}
        {showcaseOpen && (
          <div className="z-30 max-h-[52dvh] shrink-0 overflow-y-auto border-t border-border-strong bg-bg scrollbar-thin lg:max-h-[46dvh]">
            <ArtShowcase
              onTry={(id) => {
                useStudio.getState().applyPreset(id);
                setShowcaseOpen(false);
              }}
            />
          </div>
        )}
        <button
          type="button"
          onClick={toggleShowcase}
          aria-expanded={showcaseOpen}
          className="flex shrink-0 items-center justify-center gap-2 border-t border-border-strong bg-surface px-4 py-2.5 text-xs font-bold text-fg transition hover:bg-surface-hover"
        >
          <Globe className="size-4 text-ok" />
          <span>Art directions &amp; print specs</span>
          {showcaseOpen ? <ChevronUp className="size-4 text-fg/70" /> : <ChevronDown className="size-4 text-fg/70" />}
        </button>

        <Toaster theme="dark" position="bottom-center" richColors={false} />
      </div>
    </TooltipProvider>
  );
}
