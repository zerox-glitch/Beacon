/**
 * /lab — "Our story" page.
 *
 * Rebranded from the old "Weaver lab" (an experimental art playground that
 * nobody found). Now it carries the brand's story + its SEO weight:
 * artistic QR code / beautiful QR code / remake your old QR. Three jobs:
 *   1. Main CTA — remake an old QR code (jumps to the scanner on the home page)
 *   2. Open the studio
 *   3. See the landing gallery
 */
import { ArrowRight, Camera, Download, Heart, Palette, ScanSearch, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCms } from "@/lib/cms/runtime";
import { PRESETS } from "@/lib/qr/presets";

const STORY_STEPS = [
  {
    icon: Camera,
    title: "Bring a photo — or scan an old code",
    desc: "Drop in a picture, or point your camera at a QR you already printed. We read what it points to and rebuild it in the studio. Nothing is uploaded; it all happens on your device.",
  },
  {
    icon: Palette,
    title: "Pick a style, make it yours",
    desc: `${PRESETS.length}+ designer looks, photo blending, 66 built-in center logos (WhatsApp, Instagram, Wi-Fi, PayPal and more), your colors and your photo — tuned live with a camera-grade scan meter.`,
  },
  {
    icon: Download,
    title: "Verified, then download",
    desc: "Every code is re-decoded on your phone's own rules before the badge says Scannable. Export 2048px PNG for print or crisp vector SVG. No account, no watermark, no subscription — ever.",
  },
];

export function StoryPage() {
  const { brand } = useCms();
  const name = brand.siteName || "QRWho";

  return (
    <div className="min-h-app bg-bg text-fg">
      {/* Simple bar — this page is the story, not the shop */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Back to home">
            <img
              src={brand.logoUrl || "/logo.png"}
              alt={`${name} logo`}
              className="size-10 shrink-0 rounded-xl border border-border"
            />
            <span className="font-display text-xl italic leading-none tracking-tight">{name}</span>
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-accent-fg shadow-md transition hover:brightness-110 active:scale-[0.97]"
          >
            Open the studio
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <Heart className="size-3.5 text-accent" />
            Our story
          </span>
          <h1 className="mt-5 font-display text-4xl italic leading-tight tracking-tight sm:text-5xl">
            We want <span className="text-accent">color</span> in this grey world
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-fg/85 sm:text-base">
            Every day, millions of black squares get printed on menus, doors,
            business cards and posters — the same shape, the same grey, the
            same "utility" nothing. We think the code you scan is also the
            thing people notice, so we make <strong className="text-fg">artistic QR
            codes</strong> that people actually want to point a camera at —
            free, beautiful, and always scannable.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/#remake"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              <ScanSearch className="size-4.5" />
              Remake your old QR code
            </a>
            <Link
              to="/studio"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
            >
              <Wand2 className="size-4.5" />
              Go to the studio
            </Link>
            <a
              href="/#samples"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
            >
              <Sparkles className="size-4.5" />
              See the gallery
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-b border-border bg-elevated/30">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div className="space-y-4">
            <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
              Why we make <span className="text-accent">beautiful QR codes</span>
            </h2>
            <p className="text-sm leading-relaxed text-fg/85 sm:text-base">
              A QR code is a promise: scan me and something good happens. But
              the code itself is one of the last places on the internet that
              still ships in factory grey. A menu deserves more than a barcode.
              A café's Wi-Fi deserves more than a sticker. A business card
              deserves to be worth keeping.
            </p>
            <p className="text-sm leading-relaxed text-fg/85 sm:text-base">
              So we built {name}: a free, online studio where a photograph
              becomes the code itself — your picture woven through the dots,
              your logo in the middle, your colors everywhere — while every
              single module stays exactly where a camera expects it.
            </p>
          </div>
          <ul className="space-y-3 self-center">
            {[
              `${PRESETS.length}+ designer styles — ukiyo-e, neon, royal, sakura, retro, minimal`,
              "Photo blending that keeps the picture you actually chose",
              "Camera-grade verification on every save — art that always scans",
              "100% in your browser: no uploads, no accounts, no tracking",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg/90">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
              From grey square to <span className="text-accent">scannable art</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
              Three steps, no sign-up. Your codes are static and never expire.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {STORY_STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-surface p-5">
                <span className="absolute right-4 top-4 font-display text-3xl italic text-fg/15">{i + 1}</span>
                <s.icon className="size-6 text-accent" />
                <h3 className="mt-3 text-sm font-bold text-fg">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-[13px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free + private promise */}
      <section className="border-b border-border bg-elevated/30">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:py-20">
          <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
            Free means <span className="text-accent">free</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-fg/85 sm:text-base">
            No subscriptions, no watermark, no "pro" paywall, no email gate.
            The colors belong to you — and to the world. The only thing we
            keep is the promise: every QR code you make here keeps working,
            forever, on any phone.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="ambient-constellation pointer-events-none absolute inset-0 opacity-15" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
            Your old QR code could be <span className="text-accent">beautiful</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
            Scan the one you already printed — we'll rebuild it in color, same
            destination, better art.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/#remake"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              <ScanSearch className="size-4.5" />
              Remake your old QR code
            </a>
            <a
              href="/#samples"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-fg transition hover:bg-white/10"
            >
              <Sparkles className="size-4.5" />
              See the gallery
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-[11px] text-muted">
        © {new Date().getFullYear()} {name} — free artistic QR codes, made on-device
      </footer>
    </div>
  );
}
