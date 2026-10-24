/**
 * /hall-of-fame — the supporters' circles.
 *
 * People who support QRWho (the coffee / tip link) are added by hand in the
 * admin panel, each in one of four exclusive circles. The circle is the title
 * they keep: shown as a badge next to every name. Names are permanent until
 * the admin removes them — that permanence is the whole point of the page.
 */
import { ArrowRight, Coffee, Crown, Flame, Gem, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCms } from "@/lib/cms/runtime";
import { HALL_OF_FAME_CIRCLES, type HallOfFameCircle, type HallOfFameMember } from "@/lib/cms/schemas";

const CIRCLES: Record<
  HallOfFameCircle,
  {
    name: string;
    short: string;
    title: string;
    tagline: string;
    Icon: typeof Crown;
    chip: string;
    orb: string;
    ring: string;
    glow: string;
  }
> = {
  chromatic: {
    name: "The Chromatic Circle",
    short: "Chromatic",
    title: "Member of the Chromatic Circle",
    tagline: "The innermost circle. They carry the entire spectrum — our grandest patrons, named here permanently.",
    Icon: Crown,
    chip: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    orb: "from-amber-300 via-fuchsia-400 to-sky-400",
    ring: "border-amber-300/40",
    glow: "from-amber-300/15 via-fuchsia-400/10 to-transparent",
  },
  prism: {
    name: "The Prism Circle",
    short: "Prism",
    title: "Member of the Prism Circle",
    tagline: "They split the grey light into color. Generous souls who made the whole thing shine brighter.",
    Icon: Gem,
    chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
    orb: "from-violet-400 to-fuchsia-400",
    ring: "border-violet-300/40",
    glow: "from-violet-400/15 to-transparent",
  },
  aurora: {
    name: "The Aurora Circle",
    short: "Aurora",
    title: "Member of the Aurora Circle",
    tagline: "They lit up the sky so the world could see color. Kindness with a permanent glow.",
    Icon: Sparkles,
    chip: "border-teal-300/40 bg-teal-300/10 text-teal-200",
    orb: "from-teal-300 to-emerald-400",
    ring: "border-teal-300/40",
    glow: "from-teal-300/15 to-transparent",
  },
  spark: {
    name: "The Spark Circle",
    short: "Spark",
    title: "Member of the Spark Circle",
    tagline: "Every colorful world begins with one spark. The first step into the circle — and a title to keep.",
    Icon: Flame,
    chip: "border-orange-300/40 bg-orange-300/10 text-orange-200",
    orb: "from-orange-400 to-amber-400",
    ring: "border-orange-300/40",
    glow: "from-orange-400/15 to-transparent",
  },
};

function MemberCard({ member, circle }: { member: HallOfFameMember; circle: (typeof CIRCLES)[HallOfFameCircle] }) {
  const name = <p className="font-semibold tracking-tight text-fg">{member.name}</p>;
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${circle.ring} bg-elevated/60 p-5`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60"
        style={{ backgroundImage: `linear-gradient(to bottom right, transparent 40%, rgba(255,255,255,0.06))` }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          {member.link ? (
            <a href={member.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition">
              {name}
            </a>
          ) : (
            name
          )}
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${circle.chip}`}>
            <circle.Icon className="size-3" />
            {circle.short}
          </span>
        </div>
        {member.note ? <p className="mt-2 text-sm italic leading-relaxed text-subtle">{member.note}</p> : null}
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-subtle/70">{circle.title}</p>
      </div>
    </div>
  );
}

export function HallOfFamePage({ members }: { members: HallOfFameMember[] }) {
  const { brand } = useCms();
  const name = brand.siteName || "QRWho";
  const byCircle = new Map<HallOfFameCircle, HallOfFameMember[]>(HALL_OF_FAME_CIRCLES.map((c) => [c, []]));
  for (const m of members) (byCircle.get(m.circle) ?? byCircle.get("spark")!).push(m);

  return (
    <div className="min-h-app bg-bg text-fg">
      {/* Simple bar — same pattern as /lab and the legal pages */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface px-3 py-1 text-xs font-semibold text-muted">
            <Crown className="size-3.5 text-accent" />
            {name} Hall of Fame
          </span>
          <h1 className="mt-5 font-display text-4xl italic leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            The circles of our{" "}
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
              colorful world
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-fg/85">
            {name} is free, fast and watermark-free — kept that way by people who bought us a
            coffee. Every supporter takes a <strong className="font-semibold text-fg">permanent place</strong> in
            one of the circles below. This isn&apos;t a donor list; it&apos;s a title you keep.
          </p>
        </div>
      </section>

      {/* The circles */}
      <main className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
        {HALL_OF_FAME_CIRCLES.map((id) => {
          const circle = CIRCLES[id];
          const list = byCircle.get(id) ?? [];
          const Icon = circle.Icon;
          return (
            <section key={id} aria-labelledby={`circle-${id}`}>
              <div className={`relative overflow-hidden rounded-3xl border ${circle.ring}`}>
                <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${circle.glow}`} />
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${circle.orb} text-bg shadow-lg`}>
                      <Icon className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 id={`circle-${id}`} className="font-display text-2xl italic tracking-tight sm:text-3xl">
                        {circle.name}
                      </h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-subtle">
                        {circle.title} · {list.length} {list.length === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fg/80 sm:text-base">{circle.tagline}</p>

                  {list.length === 0 ? (
                    <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-subtle">
                      This circle is ready for its first name — maybe yours.
                    </p>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((m) => (
                        <MemberCard key={m.id} member={m} circle={circle} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* Join the circle */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/[0.04] to-transparent p-8 text-center sm:p-10">
          <Coffee className="mx-auto size-8 text-accent" />
          <h2 className="mt-4 font-display text-3xl italic tracking-tight sm:text-4xl">Take your place in a circle</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-fg/85 sm:text-base">
            If {name} made your day — your menu, your poster, your business card — buy it a coffee.
            Your name goes up here permanently, with a title to keep.
          </p>
          {brand.kofiUrl ? (
            <a
              href={brand.kofiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-accent-fg shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              <Coffee className="size-4.5" />
              Buy {name} a coffee
            </a>
          ) : (
            <p className="mt-6 text-sm text-subtle">The support link is coming soon.</p>
          )}
          <p className="mt-3 text-xs text-subtle">
            Names are added personally after each coffee — permanent, and yours to keep.
          </p>
        </section>
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
