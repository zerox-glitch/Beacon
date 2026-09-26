import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  X,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ImagePlus,
  Link2,
  Lock,
  Palette,
  QrCode,
  ScanLine,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ScanDecode } from "@/components/qr/scan-decode";
import { SupportButton } from "@/components/support-button";
import { ArtShowcase } from "@/components/studio/art-showcase";
import { PRESETS, getPreset } from "@/lib/qr/presets";
import { getPresetMerged } from "@/lib/cms/runtime";
import { useCms } from "@/lib/cms/runtime";
import { renderSamplePreset, type SampleImage } from "@/lib/qr/sample-render";
import { resolveSamples, type SampleRef } from "@/lib/cms/catalog-merge";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const HOOK_WORDS = ["picture", "Wi-Fi", "menu", "event", "contact", "link"];

function RotatingWord({ words = HOOK_WORDS }: { words?: string[] }) {
  const list = words.length ? words : HOOK_WORDS;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % list.length), 2600);
    return () => window.clearInterval(id);
  }, [list.length]);
  const word = list[i % list.length] ?? list[0]!;
  return (
    <span key={word} className="word-in inline-block font-semibold text-ok">
      {word}
    </span>
  );
}

function useSamples(entries: { id: string; url?: string }[], px: number) {
  const [samples, setSamples] = useState<SampleImage[]>([]);
  // Per-id start tracking (not a one-shot latch): the admin's samples doc
  // arrives AFTER the first paint with the curated fallback, and the new
  // entries must still render — while double-effect re-runs stay no-ops.
  const started = useRef<Set<string>>(new Set());
  useEffect(() => {
    entries.forEach(({ id, url }) => {
      if (started.current.has(id)) return;
      started.current.add(id);
      const preset = getPresetMerged(id) ?? getPreset(id);
      if (!preset) return;
      renderSamplePreset(preset, px, url)
        .then((s) => {
          setSamples((prev) => (prev.some((p) => p.preset.id === s.preset.id) ? prev : [...prev, s]));
        })
        .catch(() => {});
    });
  }, [entries, px]);
  return samples;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-bg/90 px-2 py-0.5 text-[10px] font-semibold text-ok">
      <CheckCircle2 className="size-3" />
      verified scan
    </span>
  );
}

function SampleCard({
  sample,
  label,
  onTry,
  onZoom,
}: {
  sample?: SampleImage;
  label?: string;
  onTry: (id: string) => void;
  onZoom: () => void;
}) {
  const isPlaceholder = !sample;
  return (
    <figure
      role="button"
      tabIndex={isPlaceholder ? -1 : 0}
      aria-label={isPlaceholder ? undefined : `Enlarge ${label ?? sample.preset.name}`}
      onClick={() => !isPlaceholder && onZoom()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isPlaceholder) {
          e.preventDefault();
          onZoom();
        }
      }}
      className={
        "group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-2xl" +
        (isPlaceholder ? "" : " cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent")
      }
    >
      {isPlaceholder ? (
        <div className="aspect-square w-full animate-pulse bg-elevated" />
      ) : (
        <img
          src={sample.url}
          alt={`${label ?? sample.preset.name} QR code sample`}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      )}
      {!isPlaceholder && (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{label ?? sample.preset.name}</p>
            <p className="text-[10px] text-white/70">{sample.preset.category}</p>
          </div>
          <VerifiedBadge verified={sample.verified} />
        </figcaption>
      )}
      <button
        type="button"
        disabled={isPlaceholder}
        onClick={(e) => {
          e.stopPropagation();
          if (sample) onTry(sample.preset.id);
        }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/80 disabled:hidden"
      >
        Try it
        <ArrowUpRight className="size-3" />
      </button>
    </figure>
  );
}

// Curated landing grid — 30 of the 335, mixed across every category so the
// wall shows the full range. (An owner-saved samples list in admin overrides.)
/**
 * Click-to-enlarge lightbox for the samples wall: the code zooms to the
 * middle of the screen with a "Try it" button over it; X, backdrop click or
 * Escape sends it back to its place.
 */
function SampleLightbox({
  image,
  label,
  onTry,
  onClose,
}: {
  image: SampleImage;
  label: string;
  onTry: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — enlarged`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition hover:bg-black/85"
      >
        <X className="size-5" />
      </button>
      <div className="relative w-full max-w-[min(86vw,560px)]">
        <img
          src={image.url}
          alt={`${label} QR code — enlarged`}
          className="w-full rounded-2xl border border-border-strong shadow-2xl"
        />
        <button
          type="button"
          onClick={onTry}
          className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-fg shadow-[0_0_30px_-6px_var(--color-accent)] transition hover:brightness-110 active:scale-[0.97]"
        >
          <Wand2 className="size-4" />
          Try it
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-between px-2">
          <div className="min-w-0 rounded-xl bg-black/70 px-3 py-1.5 backdrop-blur">
            <p className="truncate text-xs font-bold text-white">{label}</p>
            <p className="text-[10px] text-white/70">{image.preset.category}</p>
          </div>
          <VerifiedBadge verified={image.verified} />
        </div>
      </div>
    </div>
  );
}

const GRID_SAMPLE_IDS = [
  "art-neon-tokyo",
  "art-royal",
  "gal-duo-aurora",
  "art-alpine-summit",
  "gal-peony",
  "art-sakura-bloom",
  "gal-mono-lake",
  "art-ukiyo",
  "art-stained-glass",
  "art-synthwave",
  "art-matrix",
  "art-candy",
  "art-galaxy-burst",
  "art-solarpunk",
  "art-bauhaus-primary",
  "art-dragon-fire",
  "gal-marble",
  "gal-blossom",
  "gal-duo-dusk",
  "gal-mono-mountain",
  "bubble-gum",
  "circuit-teal",
  "gold-foil",
  "emerald-velvet",
  "porcelain",
  "neon-pulse",
  "blush-bloom",
  "Miami-grid",
  "photo-duotone-film",
  "scene-cafe",
] as const;

const HERO_SAMPLE_IDS = ["art-neon-tokyo", "art-royal", "gal-duo-aurora"] as const;

function HeroFan({ entries }: { entries: SampleRef[] }) {
  const samples = useSamples(entries.map((e) => ({ id: e.preset.id, url: e.url })), 320);
  const tilts = [
    "z-0 -rotate-10 -translate-x-[46%] translate-y-6",
    "z-10 -translate-y-1",
    "z-0 rotate-10 translate-x-[46%] translate-y-6",
  ];
  return (
    <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80">
      {entries.slice(0, 3).map((entry, i) => {
        const s = samples.find((p) => p.preset.id === entry.preset.id);
        return (
          <div
            key={entry.preset.id}
            className={cn(
              "art-floating-card absolute size-40 overflow-hidden rounded-2xl sm:size-56",
              tilts[i],
            )}
          >
            {s ? (
              <img src={s.url} alt={`${entry.label} sample QR`} className="size-full object-cover" />
            ) : (
              <div className="size-full animate-pulse bg-elevated" />
            )}
          </div>
        );
      })}
      <span className="absolute -bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-ok/40 bg-bg/95 px-3 py-1 text-[11px] font-semibold text-ok shadow-lg">
        <ScanSearch className="size-3.5" />
        rendered &amp; decoded live, in your browser
      </span>
    </div>
  );
}

const STEPS = [
  {
    icon: Link2,
    title: "Paste what it opens",
    desc: "A link, Wi-Fi, vCard, menu, event or payment. The destination is etched straight into the pixels — no redirect server, no expiry.",
  },
  {
    icon: ImagePlus,
    title: "Pick a look or drop a photo",
    desc: `${PRESETS.length} art styles and 12 sample photos, or your own upload. The whole picture is woven into the code — nothing cropped, nothing hidden.`,
  },
  {
    icon: ScanSearch,
    title: "Watch it stay real",
    desc: "Every tweak is decoded with a camera-grade engine as you go. The badge flips to Scannable only when the pixels actually read back.",
  },
  {
    icon: Wand2,
    title: "Fix it in one tap",
    desc: "If it wobbles, Fix scan walks a ladder of real changes — ink, dot weight, gaps, weave — until a version survives two full decodes.",
  },
] as const;

const TRUST = [
  { icon: Lock, label: "On-device — never uploaded" },
  { icon: ShieldCheck, label: "Level H error correction" },
  { icon: Download, label: "2048px PNG + vector SVG" },
  { icon: QrCode, label: "Static — never expires" },
  { icon: Sparkles, label: "Free, no watermark" },
] as const;

function wordsList(csv: string): string[] {
  return (csv ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function Landing() {
  const navigate = useNavigate();
  const [zoomed, setZoomed] = useState<{ image: SampleImage; label: string; url: string } | null>(null);
  const applyPreset = useStudio((s) => s.applyPreset);
  const { catalog, presetCount, brand, content, samplesDoc } = useCms();
  // Curated fallback = the original hardcoded ids plus any custom art
  // template the admin has published; the samples doc overrides when set.
  const customArtIds = catalog.presets
    .filter((p) => p.id.startsWith("cms-") && p.artUrl)
    .map((p) => p.id);
  const sampleRefs = resolveSamples(samplesDoc, catalog.presets, catalog.hiddenIds, {
    grid: [...GRID_SAMPLE_IDS, ...customArtIds],
    hero: [...HERO_SAMPLE_IDS],
  });
  const samples = useSamples(sampleRefs.grid.map((r) => ({ id: r.preset.id, url: r.url })), 640);

  function tryInStudio(id: string, url?: string) {
    applyPreset(id);
    if (url) useStudio.getState().patchPayload({ kind: "url", url });
    navigate({ to: "/studio" });
  }

  return (
    <div className="min-h-app bg-bg text-fg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src={brand.logoUrl || "/logo.png"}
              alt={brand.siteName || "QRWho"}
              className="size-10 shrink-0 rounded-xl border border-border sm:size-12 sm:rounded-2xl"
            />
            <div className="min-w-0">
              <p className="font-display text-xl italic leading-none tracking-tight sm:text-2xl">
                <span className="wordmark-shimmer">{brand.siteName || "QRWho"}</span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-fg/80">
                Turn any <RotatingWord words={wordsList(content.heroWords)} /> into a working QR
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <SupportButton />
            <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-elevated px-3 py-1 text-xs font-semibold text-fg/90 sm:inline-flex">
              <Palette className="size-3.5 text-ok" />
              {presetCount} art styles
            </span>
            <Link
              to="/studio"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-accent-fg shadow-md transition hover:brightness-110 active:scale-[0.97]"
            >
              Open the studio
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "url(/bg-stage.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.55,
            filter: "saturate(1.05) brightness(0.6)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(12,12,11,0.55) 0%, rgba(12,12,11,0.25) 45%, rgba(12,12,11,0.94) 100%)",
          }}
        />
        <div className="ambient-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:py-24">
          <div className="space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-xs font-semibold text-ok">
              <CheckCircle2 className="size-3.5" />
              Every sample on this page is a real, decoded QR
            </span>
            <h1 className="font-display text-4xl italic leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {content.heroTitle ? (
                content.heroTitle
              ) : (
                <>
                  Turn any <RotatingWord words={wordsList(content.heroWords)} />
                  <br />
                  into a QR that
                  <br />
                  people <span className="text-accent">actually want to scan</span>
                </>
              )}
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-fg/85 sm:text-base lg:mx-0">
              {content.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/studio"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              >
                {content.ctaPrimary || "Open the studio"}
                <ArrowRight className="size-4.5" />
              </Link>
              <a
                href="#samples"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
              >
                {content.ctaSecondary || "See the art"}
              </a>
              <a
                href="#remake"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
              >
                <ScanLine className="size-4.5" />
                Remake your old QR code
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {TRUST.map((t) => {
                const Icon = t.icon;
                return (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-bg/70 px-2.5 py-1 text-[11px] font-medium text-fg/85 backdrop-blur"
                  >
                    <Icon className="size-3 text-ok" />
                    {t.label}
                  </span>
                );
              })}
            </div>
          </div>
          <HeroFan entries={sampleRefs.hero} />
        </div>
      </section>

      {/* Remake an existing code */}
      <section id="remake" className="relative border-t border-border bg-elevated/30">
        <div className="ambient-constellation pointer-events-none absolute inset-0 opacity-15" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <ScanSearch className="size-3.5 text-ok" />
              Already printed one?
            </span>
            <h2 className="font-display text-3xl italic leading-tight tracking-tight sm:text-4xl">
              Remake your old
              <br />
              <span className="text-accent">QR code</span> — same link, better art
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-fg/85 sm:text-base">
              Scan or upload any QR you already have — a menu, a Wi-Fi code, a
              business card, a sticker on a door. We read exactly what it
              points to, then rebuild it in the studio as a scannable,
              beautiful one with the same destination. Nothing is uploaded;
              decoding happens on your device.
            </p>
            <ul className="space-y-2 text-sm text-fg/85">
              {[
                "Links, Wi-Fi, contacts, phone & SMS, locations, events — all recognized",
                "The extracted fields land in the right forms, ready to tweak",
                "One click takes the result into the studio to make it beautiful",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xl sm:p-6">
            <ScanDecode
              primary={(result) => (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/studio",
                      search: { scan: result },
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
                >
                  <Wand2 className="size-3.5" />
                  Remake it in the studio
                </button>
              )}
            />
          </div>
        </div>
      </section>

      {/* Samples */}
      <section id="samples" className="relative border-t border-border">
        <div className="ambient-constellation pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 space-y-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="size-3.5 text-ok" />
              The gallery, decoded
            </span>
            <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
              Really beautiful ones. All of them scan.
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted">
              Each card below was rendered by the same engine you get in the studio, then read back
              with jsQR at export size. If the badge is there, a camera can read it too.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {sampleRefs.grid.map((ref) => (
              <SampleCard
                key={ref.preset.id}
                sample={samples.find((s) => s.preset.id === ref.preset.id)}
                label={ref.label}
                onTry={() => tryInStudio(ref.preset.id, ref.url)}
                onZoom={() => {
                  const image = samples.find((x) => x.preset.id === ref.preset.id);
                  if (image) setZoomed({ image, label: ref.label, url: ref.url });
                }}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-subtle">
            …and {Math.max(0, presetCount - sampleRefs.grid.length)} more in the studio — pick any, tune it,
            and hit <span className="font-semibold text-fg">Fix scan</span> if it wobbles.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-border bg-elevated/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 space-y-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <QrCode className="size-3.5 text-ok" />
              How it works
            </span>
            <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
              From paste to print in four moves
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="art-floating-card relative space-y-3 rounded-2xl p-5"
                >
                  <span className="absolute right-4 top-4 font-display text-3xl italic text-white/10">
                    {i + 1}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-elevated">
                    <Icon className="size-4.5 text-ok" />
                  </div>
                  <h3 className="text-sm font-bold text-fg">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-muted">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {zoomed && (
        <SampleLightbox
          image={zoomed.image}
          label={zoomed.label}
          onTry={() => {
            const id = zoomed.image.preset.id;
            const url = zoomed.url;
            setZoomed(null);
            tryInStudio(id, url);
          }}
          onClose={() => setZoomed(null)}
        />
      )}

      {/* Art direction, promise, use cases, FAQ, footer */}
      <ArtShowcase onTry={tryInStudio} />
    </div>
  );
}
