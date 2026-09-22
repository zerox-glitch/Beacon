import {
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  Heart,
  HelpCircle,
  Lock,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wifi,
  Zap,
} from "lucide-react";
import { useCms } from "@/lib/cms/runtime";
import { useStudio } from "@/lib/store";

const SHOWCASE_CARDS = [
  {
    id: "art-ukiyo",
    title: "Ukiyo Wave",
    category: "Japanese Woodblock",
    tagline: "Ocean indigo on handmade washi texture with leaf finders",
    accent: "from-cyan-900/40 via-teal-900/20 to-transparent",
    border: "border-teal-500/30",
    badge: "Edo Aesthetic",
  },
  {
    id: "art-cyberpunk",
    title: "Cyberpunk 2099",
    category: "Sci-Fi & Tech",
    tagline: "Electric magenta to cyan neon data stream on dark onyx",
    accent: "from-pink-900/40 via-purple-900/20 to-transparent",
    border: "border-pink-500/30",
    badge: "High Voltage",
  },
  {
    id: "art-vaporwave",
    title: "Vaporwave 1995",
    category: "Retro & Synth",
    tagline: "Pastel lilac, mint green and electric blue dreamscape",
    accent: "from-fuchsia-900/40 via-cyan-900/20 to-transparent",
    border: "border-fuchsia-500/30",
    badge: "Retro Aesthetic",
  },
  {
    id: "art-royal",
    title: "Royal Gold",
    category: "Luxury & Fashion",
    tagline: "Obsidian black with polished gold gradient & classy finders",
    accent: "from-amber-900/40 via-yellow-900/20 to-transparent",
    border: "border-amber-500/30",
    badge: "Editorial Luxe",
  },
  {
    id: "art-sakura",
    title: "Sakura Bloom",
    category: "Weddings & Florals",
    tagline: "Two-lobe heart modules with emerald leaf eyes",
    accent: "from-rose-900/40 via-pink-900/20 to-transparent",
    border: "border-rose-500/30",
    badge: "Romantic",
  },
  {
    id: "art-matcha",
    title: "Matcha Latte",
    category: "Café & Organic",
    tagline: "Earthy matcha green leaf modules on steamed cream",
    accent: "from-emerald-900/40 via-lime-900/20 to-transparent",
    border: "border-emerald-500/30",
    badge: "Organic",
  },
  {
    id: "art-solarpunk",
    title: "Solarpunk Dawn",
    category: "Green Tech & Nature",
    tagline: "Radiant lime & golden solar amber on forest night",
    accent: "from-lime-900/40 via-amber-900/20 to-transparent",
    border: "border-lime-500/30",
    badge: "Solarpunk",
  },
  {
    id: "art-neon-fungi",
    title: "Neon Fungi",
    category: "Creative & Music",
    tagline: "Bioluminescent emerald bubbles on pitch obsidian",
    accent: "from-emerald-900/40 via-teal-900/20 to-transparent",
    border: "border-emerald-500/30",
    badge: "Bioluminescent",
  },
  {
    id: "art-mono",
    title: "Mono Luxe",
    category: "Swiss Minimalist",
    tagline: "Ultra-crisp geometric precision for architecture & design",
    accent: "from-stone-900/40 via-zinc-900/20 to-transparent",
    border: "border-stone-500/30",
    badge: "Architectural",
  },
];

const USE_CASES = [
  {
    icon: Utensils,
    title: "Restaurant & Bar Menus",
    desc: "Replace grimy plastic menus with scannable table art that matches your interior aesthetic. Zero lag, zero downloads.",
  },
  {
    icon: Sparkles,
    title: "Weddings & Luxury Events",
    desc: "Aesthetic QR codes that look gorgeous on linen cardstock, foil invitations, and wedding table settings.",
  },
  {
    icon: Lock,
    title: "Instant WiFi Sign-In",
    desc: "Let guests and customers join encrypted WPA2/WPA3 networks in 1 second without typing complex passwords.",
  },
  {
    icon: Cpu,
    title: "Creative Portfolios & vCards",
    desc: "Teleport people straight to your Behance, GitHub, LinkedIn, or digital contact card directly from your business card.",
  },
  {
    icon: Palette,
    title: "Product Packaging & Merch",
    desc: "Print-ready high-density marks with Error Correction Level H that scan flawlessly across curved bottles and textured fabric.",
  },
  {
    icon: Zap,
    title: "Social Links & Bio Pages",
    desc: "Drive viral traffic to your Instagram, TikTok, YouTube, or Spotify releases with high-contrast custom designs.",
  },
];

const FAQS = [
  {
    q: "Is QRWho really 100% free with no watermarks?",
    a: "Yes. QRWho is completely free forever. We generate full-resolution 2048px PNG and print-ready files with zero watermarks, zero accounts, and zero paywalls.",
  },
  {
    q: "Do QR codes created on QRWho ever expire?",
    a: "Never. QRWho creates standard static QR codes where your URL, text, or WiFi credentials are encoded directly into the pixel matrix. There is no middleman redirect server, so your codes will work for decades even if offline.",
  },
  {
    q: "Are my uploaded photos and links private?",
    a: "100% private. All rendering, image processing, encoding, and camera verification happens entirely inside your web browser's local memory using client-side Canvas and Web APIs. Your files never touch any external server.",
  },
  {
    q: "How does the active scannability checker and Auto-Fix work?",
    a: "As you tweak colors, shapes, and images, our background engine decodes the exact raster bitmap using camera-grade computer vision algorithms. If contrast or geometry drops below reliable scan thresholds, the Wand 'Fix Scan' button instantly calculates the nearest high-contrast scannable parameter set.",
  },
  {
    q: "Can I print these QR codes on large posters and billboards?",
    a: "Absolutely. When you hit 'Download PNG', QRWho renders a high-density 2048x2048 pixel canvas at maximum crispness, suitable for 300 DPI offset printing on business cards, menus, apparel, and massive outdoor banners.",
  },
  {
    q: "What is Error Correction Level H and why does QRWho use it?",
    a: "Level H (High) is the highest standard in ISO/IEC 18004 QR specifications. It restores up to 30% of damaged or obscured code data, allowing us to embed photos, custom shapes, and logos while guaranteeing instant camera read rates.",
  },
];

export function ArtShowcase({ onTry }: { onTry?: (id: string) => void } = {}) {
  const { catalog, brand, presetCount } = useCms();
  const applyPreset = useStudio((s) => s.applyPreset);

  const handleApply = (id: string) => {
    if (onTry) {
      onTry(id);
      return;
    }
    applyPreset(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="relative border-t border-border bg-elevated/40 px-4 py-16 sm:px-8 lg:px-12">
      {/* Background artwork constellation overlay */}
      <div className="ambient-constellation pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="relative mx-auto max-w-6xl space-y-20">
        {/* Showcase Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <Sparkles className="size-3.5 text-ok" />
            Curated Art Direction · {presetCount} Free Styles & Vector SVG Export
          </div>
          <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl lg:text-5xl">
            QR codes that refuse to look like medical barcodes.
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Every preset is mathematically balanced for optical camera decoding, then hand-tuned
            with fine gradients, organic module shapes, and editorial typography.
          </p>
        </div>

        {/* Interactive Gallery Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE_CARDS.map((card) => {
            const preset = catalog.presets.find((p) => p.id === card.id);
            if (!preset) return null; // hidden from the public site by the admin
            return (
              <div
                key={card.id}
                className={`group relative overflow-hidden rounded-2xl border ${card.border} bg-surface/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-2xl`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${card.accent} opacity-40 transition-opacity group-hover:opacity-70`}
                  aria-hidden
                />
                <div className="relative flex h-full flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-elevated/80 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                        {card.badge}
                      </span>
                      <span className="text-xs text-subtle">{card.category}</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl italic text-fg">{card.title}</h3>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{card.tagline}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <ShieldCheck className="size-3.5 text-ok" />
                      <span>Level H Scannable</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApply(card.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-fg transition hover:text-ok"
                    >
                      <span>Try Style</span>
                      <ArrowUpRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Why QRWho is Different vs Subscription Generators */}
        <div className="rounded-3xl border border-border bg-surface/90 p-8 sm:p-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                The Anti-Subscription Promise
              </span>
              <h3 className="font-display text-2xl italic sm:text-3xl text-fg">
                Never hold your printed QR codes hostage.
              </h3>
              <p className="text-xs leading-relaxed text-muted sm:text-sm">
                Most commercial QR generators trick you with "dynamic" links that redirect through
                their paid servers. Stop paying $15/month, and your restaurant menus and marketing
                flyers instantly stop working.
              </p>
              <p className="text-xs leading-relaxed text-muted sm:text-sm">
                <strong className="text-fg">QRWho is 100% static and serverless.</strong> Your data
                is etched directly into the pixels. Once downloaded or printed, it works forever
                with zero expiration date and zero third-party dependencies.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-elevated/70 p-4">
                <CheckCircle2 className="size-5 text-ok mb-2" />
                <h4 className="text-sm font-semibold text-fg">100% On-Device</h4>
                <p className="mt-1 text-xs text-muted">
                  Images and links are processed locally. Zero privacy leaks.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-elevated/70 p-4">
                <CheckCircle2 className="size-5 text-ok mb-2" />
                <h4 className="text-sm font-semibold text-fg">2048px PNG</h4>
                <p className="mt-1 text-xs text-muted">
                  Razor-sharp resolution for billboards and 300 DPI print.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-elevated/70 p-4">
                <CheckCircle2 className="size-5 text-ok mb-2" />
                <h4 className="text-sm font-semibold text-fg">No Account Needed</h4>
                <p className="mt-1 text-xs text-muted">
                  Open the page, make your code, download it. No signup walls.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-elevated/70 p-4">
                <CheckCircle2 className="size-5 text-ok mb-2" />
                <h4 className="text-sm font-semibold text-fg">Auto-Fix Engine</h4>
                <p className="mt-1 text-xs text-muted">
                  Computer vision verifies scannability on every single tweak.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Use Cases Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-display text-2xl italic sm:text-3xl">
              Engineered for print, packaging, and digital interaction.
            </h3>
            <p className="text-xs text-muted sm:text-sm">
              From enterprise packaging to intimate wedding stationery.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div key={i} className="rounded-xl border border-border bg-surface/50 p-5 space-y-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-elevated text-fg border border-border">
                    <Icon className="size-4 text-ok" />
                  </div>
                  <h4 className="text-sm font-semibold text-fg">{uc.title}</h4>
                  <p className="text-xs text-muted leading-relaxed">{uc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion Section for SEO */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-display text-2xl italic sm:text-3xl">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-muted sm:text-sm">
              Everything you need to know about custom artistic QR codes and print scannability.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface/60 p-5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="size-4 shrink-0 text-muted mt-0.5" />
                  <h4 className="text-sm font-semibold text-fg">{faq.q}</h4>
                </div>
                <p className="text-xs leading-relaxed text-muted pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic SEO Keywords & Footer */}
        <footer className="border-t border-border pt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src={brand.logoUrl || "/logo.png"} alt={`${brand.siteName || "QRWho"} Logo`} className="size-8 rounded-lg border border-border" />
            <span className="font-display text-xl italic text-fg">{brand.siteName || "QRWho"}</span>
          </div>
          <p className="text-xs text-subtle max-w-xl mx-auto leading-relaxed">
            {brand.footerNote ||
              "QRWho is the premier free online artistic QR code generator. Generate scannable custom QR art with logos, photos, WiFi profiles, vCards, restaurant menus, and Instagram links. Static, private, on-device, and print-ready."}
          </p>
          <div className="text-[11px] text-muted space-x-3">
            <span>© {new Date().getFullYear()} QRWho Studio</span>
            <span>·</span>
            <span>100% Free & Open</span>
            <span>·</span>
            <span>Error Correction ISO/IEC 18004</span>
            <span>·</span>
            <a href="/lab" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
              Weaver lab
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}