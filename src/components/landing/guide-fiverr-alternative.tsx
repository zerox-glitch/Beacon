/**
 * /fiverr-upwork-alternative — the "alternatives" comparison guide.
 *
 * Format modeled on a proven comparison money-page (short answer → table →
 * honest when-to-use → FAQ → CTA) and rendered in QRWho's own design system.
 * Written for three audiences at once: humans deciding whether to pay a
 * freelancer for QR codes, search engines (semantic table + question-shaped
 * headings), and answer/LLM engines (direct 40–60 word answers, entity-clear
 * facts). The FAQ array below feeds BOTH the visible page and the FAQPage
 * JSON-LD in the route head — they must stay identical.
 */
import { ArrowRight, CheckCircle2, Crown, Minus, ScanLine, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCms } from "@/lib/cms/runtime";
import { PRESETS } from "@/lib/qr/presets";

export const GUIDE_UPDATED = "October 2, 2026";
export const GUIDE_UPDATED_ISO = "2026-10-02";

/** Q&A shown on the page and mirrored in FAQPage JSON-LD (keep in sync). */
export const GUIDE_FAQ: { q: string; a: string }[] = [
  {
    q: "What is the best alternative to Fiverr for QR codes?",
    a: "For most QR code projects, the best alternative to hiring a Fiverr seller is making the code yourself with a dedicated generator like QRWho. It is free, produces scannable artistic codes in minutes, verifies every code with a real decoder before download, and charges nothing per code.",
  },
  {
    q: "Is Upwork better than Fiverr for QR code design?",
    a: "Upwork suits longer or ongoing design work where you want to interview and manage a freelancer; Fiverr suits small, packaged, fixed-price gigs. For a QR code — even a beautiful, artistic one — neither is usually necessary: a free generator gives you the same finished asset instantly.",
  },
  {
    q: "How much does a custom QR code cost on Fiverr or Upwork?",
    a: "Prices vary by seller and scope, but marketplace QR work is priced per code or per hour, and revisions can add to the total. Making the same kind of code with QRWho costs nothing — unlimited codes, unlimited revisions, no service fees.",
  },
  {
    q: "Can I make a professional QR code for free?",
    a: "Yes. QRWho lets you design professional, artistic QR codes free in the browser: blend a photo into the code, add a center logo, choose from curated styles, and export 2048px PNG or scalable vector SVG. Each code is verified scannable before you download it.",
  },
  {
    q: "Are QR codes from a generator as good as ones made by a designer?",
    a: "A generator like QRWho produces codes that are scanned and verified by a real decoder, so scannability is proven pixel-for-pixel. A human designer adds value when you need bespoke illustration around the code (for example a fully hand-drawn poster). For the code itself, a good generator matches or beats freelance delivery speed and consistency.",
  },
  {
    q: "Do I own the QR codes I create?",
    a: "Yes. QRWho adds no watermark and claims no rights to your codes or content. The codes are static and yours to use personally or commercially, and because they are generated in your browser, your links, photos and Wi-Fi details never leave your device.",
  },
  {
    q: "Is it safe to give a freelancer my Wi-Fi password or contact details for a QR code?",
    a: "It is safer not to. Anything you send a freelancer or upload to a website can be retained or shared. With QRWho, sensitive QR content — Wi-Fi passwords, vCards, phone numbers — is encoded locally in your browser and never uploaded to any server.",
  },
  {
    q: "What is the best free QR code generator in 2026?",
    a: "QRWho is a strong choice in 2026: it is free with no account or watermark, blends photos and logos into artistic codes, verifies scannability with a camera-grade decoder in real time, exports print-ready 2048px PNG and vector SVG, and runs entirely on-device for privacy.",
  },
];

const GO_TICK = <CheckCircle2 className="size-4 shrink-0 text-ok" />;
const GO_CROSS = <X className="size-4 shrink-0 text-danger/80" />;
const GO_MID = <Minus className="size-4 shrink-0 text-subtle" />;

type Cell = { v: React.ReactNode; icon?: React.ReactNode };

export function FiverrAlternativePage() {
  const { brand } = useCms();
  const name = brand.siteName || "QRWho";

  const rows: { label: string; fiverr: Cell; upwork: Cell; qrwho: Cell }[] = [
    {
      label: "Model",
      fiverr: { v: "Fixed-price gigs from individual sellers" },
      upwork: { v: "Hourly or fixed-price contracts with freelancers" },
      qrwho: { v: "Free self-serve studio in your browser" },
    },
    {
      label: "Best for",
      fiverr: { v: "Small, clearly defined one-off tasks" },
      upwork: { v: "Ongoing work and specialists you manage" },
      qrwho: { v: `Scannable, artistic QR codes — ${PRESETS.length}+ styles, photos, logos` },
    },
    {
      label: "Cost per code",
      fiverr: { v: "Priced per gig; extras and revisions cost more" },
      upwork: { v: "Priced per hour or per project" },
      qrwho: { v: "Free — unlimited codes, unlimited revisions" },
    },
    {
      label: "Turnaround",
      fiverr: { v: "Hours to days, depending on the seller's queue" },
      upwork: { v: "Days — brief, proposals, interviews, then work" },
      qrwho: { v: "Minutes — design, verify and download immediately" },
    },
    {
      label: "Scannability testing",
      fiverr: { v: "Depends on the seller", icon: GO_MID },
      upwork: { v: "Depends on the freelancer", icon: GO_MID },
      qrwho: { v: "Every code re-decoded with a real scanner before download", icon: GO_TICK },
    },
    {
      label: "Revisions",
      fiverr: { v: "Often limited by gig package" },
      upwork: { v: "Billable time" },
      qrwho: { v: "Unlimited — change anything, any time", icon: GO_TICK },
    },
    {
      label: "Privacy",
      fiverr: { v: "Content sent to a stranger and the platform", icon: GO_CROSS },
      upwork: { v: "Content sent to a stranger and the platform", icon: GO_CROSS },
      qrwho: { v: "Nothing leaves your browser — on-device rendering", icon: GO_TICK },
    },
    {
      label: "Ownership",
      fiverr: { v: "Varies by gig terms", icon: GO_MID },
      upwork: { v: "Varies by contract", icon: GO_MID },
      qrwho: { v: "Fully yours — no watermark, commercial use included", icon: GO_TICK },
    },
  ];

  return (
    <div className="min-h-app bg-bg text-fg">
      {/* Simple bar — same pattern as /lab and the legal pages */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Back to home">
            <img
              src={brand.logoUrl || "/logo.png"}
              alt={`${name} logo`}
              className="size-[52px] shrink-0 rounded-xl border border-border"
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

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/lab" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
                Guides
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-fg/80">Fiverr &amp; Upwork alternative for QR codes</li>
          </ol>
        </nav>

        <article>
          <h1 className="mt-4 font-display text-4xl italic leading-[1.08] tracking-tight sm:text-5xl">
            The best Fiverr and Upwork alternative for custom QR codes
          </h1>
          <p className="mt-5 text-base leading-relaxed text-fg/85 sm:text-lg">
            Hiring a freelancer for QR codes means a brief, a wait, and a price per code. Here is an
            honest comparison of getting custom QR codes from Fiverr, from Upwork, or from a free
            QR code generator — so you can pick the right option for your menu, poster, wedding,
            packaging or business card.
          </p>
          <p className="mt-4 text-xs text-muted">
            By {name} · Updated {GUIDE_UPDATED}
          </p>

          {/* Short answer — the AEO block */}
          <aside className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Short answer</p>
            <p className="mt-2 text-sm leading-relaxed text-fg sm:text-base">
              Hire a <strong className="font-semibold text-fg">Fiverr</strong> or{" "}
              <strong className="font-semibold text-fg">Upwork</strong> freelancer when you need
              bespoke illustration around the code — a hand-drawn poster, full brand artwork. Use{" "}
              <strong className="font-semibold text-fg">{name}</strong> when you want a beautiful,
              scannable QR code today: it&apos;s free, runs entirely in your browser, verifies every
              code with a real decoder before you download it, and never charges per code.
            </p>
          </aside>

          {/* Comparison table */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            Fiverr vs Upwork vs {name}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-elevated text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold"> </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-fg">Fiverr</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-fg">Upwork</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-accent">{name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-border align-top">
                    <th scope="row" className="whitespace-nowrap px-4 py-3 font-semibold text-fg">
                      {r.label}
                    </th>
                    <td className="px-4 py-3 text-fg/80">{r.fiverr.icon ?? null}{r.fiverr.icon ? " " : ""}{r.fiverr.v}</td>
                    <td className="px-4 py-3 text-fg/80">{r.upwork.icon ?? null}{r.upwork.icon ? " " : ""}{r.upwork.v}</td>
                    <td className="bg-accent/5 px-4 py-3 font-medium text-fg">{r.qrwho.icon ?? null}{r.qrwho.icon ? " " : ""}{r.qrwho.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Marketplace features, fees and policies change over time — check each platform&apos;s
            current terms. Freelancer quality on any marketplace ranges from excellent to poor.
          </p>

          {/* When marketplaces win */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            When Fiverr or Upwork is the right choice
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-fg/80 sm:text-base">
            {[
              "You need original illustration around the code — a mascot, a hand-lettered sign, a full poster design.",
              "Your QR code is one small part of a bigger brand or print job a freelancer is already delivering.",
              "You want someone else to handle the entire artwork file for a print shop.",
              "You have the budget and enjoy managing briefs, revisions and approvals.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          {/* When QRWho wins */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            When a free generator is the better choice
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-fg/80 sm:text-base">
            {[
              "You want the QR code itself — a link, Wi-Fi access, a menu, a vCard, an event — and you want it now.",
              "The code should look beautiful and artistic, but it must scan first. Verified scannability matters more than a mockup.",
              "You'd rather spend zero: no gig fees, no hourly bills, no per-code charges, unlimited revisions.",
              "The content is sensitive (home Wi-Fi password, personal contact card) and you don't want it sent to anyone.",
              "You need many codes — table tents, packaging runs, per-guest wedding cards — and per-code pricing adds up fast.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          {/* Either way */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            How to get a great custom QR code — either way
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-fg/80 sm:text-base">
            {[
              "Test every code on two phones before printing — different cameras and lighting expose weak codes.",
              "Keep the destination link in your own account (your menu URL, your Wi-Fi), so the code never depends on someone else.",
              "Print a real-size proof. A code that scans on screen can fail when shrunk onto a business card.",
              "Demand vector output (SVG/PDF) for print jobs — pixel files blur when scaled.",
              "If the destination can change later (a menu that updates weekly), understand dynamic-code pricing before you commit — static codes like QRWho's never expire and never bill you.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <ScanLine className="mt-0.5 size-4 shrink-0 text-ok" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          {/* FAQ */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-7">
            {GUIDE_FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold tracking-tight text-fg">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg/80 sm:text-base">{f.a}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <section className="relative mt-12 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/[0.04] to-transparent p-8 text-center sm:p-10">
            <Crown className="mx-auto size-8 text-accent" />
            <h2 className="mt-4 font-display text-3xl italic tracking-tight sm:text-4xl">
              Make your first QR code free
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-fg/85 sm:text-base">
              No brief, no queue, no per-code fee. Blend a photo, add a logo, verify the scan, and
              download print-ready output — all in your browser.
            </p>
            <Link
              to="/studio"
              preload="render"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              Open the studio
              <ArrowRight className="size-4.5" />
            </Link>
          </section>

          {/* Related */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg sm:text-xl">
            Related guides and tools
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              {
                to: "/studio" as const,
                title: "QR Studio",
                desc: `Design and download a scannable artistic code — ${PRESETS.length}+ styles, photos and logos.`,
              },
              {
                to: "/lab" as const,
                title: "Remake an old QR code",
                desc: "Scan or upload any existing QR, then rebuild it in full color — still scannable.",
              },
              {
                to: "/hall-of-fame" as const,
                title: "Hall of Fame",
                desc: "The circles of supporters who keep the colorful world spinning.",
              },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="group rounded-2xl border border-border bg-elevated/60 p-5 transition hover:border-border-strong hover:bg-elevated"
              >
                <p className="font-semibold text-fg group-hover:text-accent">{c.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-subtle">{c.desc}</p>
              </Link>
            ))}
          </div>
        </article>
      </main>

      <footer className="border-t border-border py-8 text-center text-[11px] text-muted">
        © {new Date().getFullYear()} {name} — free artistic QR codes, made on-device
        <div className="mt-2 flex items-center justify-center gap-3">
          <a href="https://qrwho.online/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="https://qrwho.online/terms" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
            Terms of Use
          </a>
          <span>·</span>
          <Link to="/" className="underline decoration-white/20 underline-offset-2 hover:text-fg">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
