import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ImagePlus,
  Link2,
  Lock,
  Palette,
  QrCode,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ArtShowcase } from "@/components/studio/art-showcase";
import { PRESETS, getPreset } from "@/lib/qr/presets";
import { renderSamplePreset, type SampleImage } from "@/lib/qr/sample-render";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const HOOK_WORDS = ["picture", "Wi-Fi", "menu", "event", "contact", "link"];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % HOOK_WORDS.length), 2600);
    return () => window.clearInterval(id);
  }, []);
  const word = HOOK_WORDS[i]!;
  return (
    <span key={word} className="word-in inline-block font-semibold text-ok">
      {word}
    </span>
  );
}

function useSamples(ids: string[], px: number) {
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    let live = true;
    ids.forEach((id) => {
      const preset = getPreset(id);
      if (!preset) return;
      renderSamplePreset(preset, px)
        .then((s) => {
          if (live) setSamples((prev) => (prev.some((p) => p.preset.id === s.preset.id) ? prev : [...prev, s]));
        })
        .catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [ids, px]);
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

function SampleCard({ sample, onTry }: { sample?: SampleImage; onTry: (id: string) => void }) {
  const isPlaceholder = !sample;
  return (
    <figure className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-2xl">
      {isPlaceholder ? (
        <div className="aspect-square w-full animate-pulse bg-elevated" />
      ) : (
        <img
          src={sample.url}
          alt={`${sample.preset.name} QR code sample`}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      )}
      {!isPlaceholder && (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{sample.preset.name}</p>
            <p className="text-[10px] text-white/70">{sample.preset.category}</p>
          </div>
          <VerifiedBadge verified={sample.verified} />
        </figcaption>
      )}
      <button
        type="button"
        disabled={isPlaceholder}
        onClick={() => sample && onTry(sample.preset.id)}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/80 disabled:hidden"
      >
        Try it
        <ArrowUpRight className="size-3" />
      </button>
    </figure>
  );
}

const GRID_SAMPLE_IDS = [
  "art-neon-tokyo",
  "art-royal",
  "gal-duo-aurora",
  "art-alpine-summit",
  "gal-peony",
  "art-sakura",
  "gal-mono-lake",
  "art-ukiyo",
] as const;

const HERO_SAMPLE_IDS = ["art-neon-tokyo", "art-royal", "gal-duo-aurora"] as const;

function HeroFan() {
  const samples = useSamples([...HERO_SAMPLE_IDS], 320);
  const tilts = ["-rotate-6 -translate-x-6", "rotate-2 translate-y-2", "rotate-8 translate-x-6"];
  return (
    <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80">
      {HERO_SAMPLE_IDS.map((id, i) => {
        const s = samples.find((p) => p.preset.id === id);
        return (
          <div
            key={id}
            className={cn(
              "art-floating-card absolute size-44 overflow-hidden rounded-2xl sm:size-56",
              tilts[i],
              i === 1 ? "z-10" : "",
            )}
          >
            {s ? (
              <img src={s.url} alt={`${s.preset.name} sample QR`} className="size-full object-cover" />
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

export function Landing() {
  const navigate = useNavigate();
  const applyPreset = useStudio((s) => s.applyPreset);
  const samples = useSamples([...GRID_SAMPLE_IDS], 512);

  function tryInStudio(id: string) {
    applyPreset(id);
    navigate({ to: "/studio" });
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="QRWho" className="size-9 rounded-lg border border-border" />
            <div className="min-w-0">
              <p className="font-display text-lg italic leading-none tracking-tight">
                <span className="wordmark-shimmer">QRWho</span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-fg/80">
                Turn any <RotatingWord /> into a working QR
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-elevated px-3 py-1 text-xs font-semibold text-fg/90 sm:inline-flex">
              <Palette className="size-3.5 text-ok" />
              {PRESETS.length} art styles
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
              Turn any <RotatingWord />
              <br />
              into a QR that
              <br />
              people <span className="text-accent">actually want to scan</span>
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-fg/85 sm:text-base lg:mx-0">
              QRWho weaves your picture, colors or style into a proper QR code — then proves it by
              decoding the exact pixels in your browser. Art you can point a phone camera at and
              trust. 100% on-device, free, no watermark.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/studio"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              >
                Open the studio
                <ArrowRight className="size-4.5" />
              </Link>
              <a
                href="#samples"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
              >
                See the art
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
          <HeroFan />
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {GRID_SAMPLE_IDS.map((id) => (
              <SampleCard key={id} sample={samples.find((s) => s.preset.id === id)} onTry={tryInStudio} />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-subtle">
            …and {PRESETS.length - GRID_SAMPLE_IDS.length} more in the studio — pick any, tune it,
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

      {/* Art direction, promise, use cases, FAQ, footer */}
      <ArtShowcase onTry={tryInStudio} />
    </div>
  );
}
