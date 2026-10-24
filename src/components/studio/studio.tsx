import {
  ChevronDown,
  ChevronUp,
  Check,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  Palette,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { ContentPanel } from "@/components/studio/content-panel";
import { SupportButton } from "@/components/support-button";
import { AmbientArt } from "@/components/studio/ambient-art";
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
  { id: "content" as const, label: "Content", shortLabel: "1. Content", hint: "Choose what your QR opens", icon: Type, primary: true },
  { id: "presets" as const, label: "Templates", shortLabel: "2. Templates", hint: "Pick a ready-made QR style", icon: LayoutGrid, primary: true },
  { id: "design" as const, label: "Customize", shortLabel: "3. Customize", hint: "Fine-tune colors, shapes, and frames", icon: Palette, primary: true },
  { id: "image" as const, label: "Photo Art", shortLabel: "Photo Art", hint: "Use a photo inside your QR", icon: ImageIcon, primary: false },
  { id: "library" as const, label: "My QRs", shortLabel: "My QRs", hint: "Open your saved designs", icon: FolderOpen, primary: false },
] as const;

const STUDIO_HELP: Record<(typeof STUDIO_TABS)[number]["id"], { title: string; description: string }> = {
  content: { title: "What should your QR open?", description: "Start with a link, Wi-Fi, contact, or any other QR type." },
  presets: { title: "Choose a starting design", description: "Select a template, then customize it as much as you like." },
  design: { title: "Make it yours", description: "Adjust shapes, colors, frames, and advanced QR settings." },
  image: { title: "Create with a photo", description: "Explore photo-based QR styles and image controls." },
  library: { title: "Your saved QR codes", description: "Find and reuse your saved creations." },
};

export function Studio() {
  const { brand, defaultTemplate } = useCms();
  const mobileTab = useStudio((s) => s.mobileTab);
  const setMobileTab = useStudio((s) => s.setMobileTab);
  const hydrateHistory = useStudio((s) => s.hydrateHistory);
  const [sheetOpen, setSheetOpen] = useState(true);

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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-app flex-col overflow-hidden bg-bg text-fg">
        <header className="relative z-30 shrink-0 border-b border-white/10 bg-bg/95 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3">
          <div className="hero-glow pointer-events-none absolute inset-0 hidden sm:block" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link to="/" aria-label="QRWho home" className="shrink-0">
                <img
                  src={brand.logoUrl || "/logo.png"}
                  alt={brand.siteName || "QRWho"}
                  className="size-[52px] rounded-xl border border-border sm:size-[62px] sm:rounded-2xl"
                />
              </Link>
              <div className="min-w-0">
                <h1 className="font-display text-2xl italic leading-none tracking-tight sm:text-3xl">
                  <span className="wordmark-shimmer">QRWho</span>
                </h1>
                <RotatingHook />
              </div>
            </div>

            <SupportButton />
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
                ? "h-[min(42vh,420px)] shrink-0 lg:h-auto lg:max-h-none"
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
                {sheetOpen ? "Close studio" : "Open Studio tools"}
              </span>
              {sheetOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </button>

            <nav
              aria-label="QR Studio tools"
              className={cn(
                "sticky top-0 z-20 border-b border-border bg-surface px-2 pb-2 pt-3 sm:px-3",
                !sheetOpen && "hidden lg:block",
              )}
            >
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Create your QR in 3 steps
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {STUDIO_TABS.filter((tab) => tab.primary).map((tab) => {
                  const Icon = tab.icon;
                  const active = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={active ? "step" : undefined}
                      title={tab.hint}
                      onClick={() => { setSheetOpen(true); setMobileTab(tab.id); }}
                      className={cn(
                        "flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-[11px] font-semibold transition-colors sm:text-xs",
                        active
                          ? "border-[#22d3ee] bg-[#22d3ee] text-[#04181d]"
                          : "border-border bg-elevated text-fg/85 hover:border-border-strong hover:bg-surface-hover",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                {STUDIO_TABS.filter((tab) => !tab.primary).map((tab) => {
                  const Icon = tab.icon;
                  const active = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      title={tab.hint}
                      aria-current={active ? "page" : undefined}
                      onClick={() => { setSheetOpen(true); setMobileTab(tab.id); }}
                      className={cn(
                        "flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium transition-colors",
                        active
                          ? "border-accent bg-accent/15 text-fg"
                          : "border-border bg-transparent text-muted hover:bg-surface-hover hover:text-fg",
                      )}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin sm:p-5",
                !sheetOpen && "hidden lg:block",
              )}
            >
              <div className="mb-4 rounded-xl border border-border bg-surface/70 p-3">
                <h2 className="text-sm font-semibold text-fg">{STUDIO_HELP[mobileTab].title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">{STUDIO_HELP[mobileTab].description}</p>
              </div>
              {mobileTab === "content" && <ContentPanel />}
              {mobileTab === "presets" && <PresetGallery />}
              {mobileTab === "design" && <DesignPanel />}
              {mobileTab === "image" && <ImagePanel />}
              {mobileTab === "library" && <LibraryPanel />}
              {STUDIO_TABS.some((t) => t.id === mobileTab && t.primary) && (
                <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
                  <span className="flex items-center gap-1 text-[11px] text-muted"><Check className="size-3.5" /> Changes appear in the live preview</span>
                  {mobileTab !== "design" && (
                    <button type="button" onClick={() => setMobileTab(mobileTab === "content" ? "presets" : "design")} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-fg">
                      Next: {mobileTab === "content" ? "Templates" : "Customize"} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <Toaster theme="dark" position="bottom-center" richColors={false} />
      </div>
    </TooltipProvider>
  );
}
