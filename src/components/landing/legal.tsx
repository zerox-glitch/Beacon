/**
 * /privacy and /terms — public legal pages.
 *
 * Built to match the /lab page shell (sticky brand bar → narrow reading column
 * → small footer) and the site's design tokens. The copy is written strictly
 * against what the code actually does: on-device QR generation (uqr), photo
 * weaving, jsQR scan-checking and the camera "remake" scanner, PNG/SVG export,
 * the `qrwho-session-v1` cookie, `qrwho-history-v1` localStorage and the
 * sessionStorage sample cache — plus Google Fonts and Vercel hosting. No
 * accounts, analytics, ads, payments or server-side uploads exist, so the
 * text says exactly that instead of boilerplate.
 */
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCms } from "@/lib/cms/runtime";

const LAST_UPDATED = "September 30, 2026";

/** Clearly-marked placeholder — there is no official contact email in the project yet. */
const CONTACT_PLACEHOLDER = "[insert official QRWho contact email before launch]";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { brand } = useCms();
  const name = brand.siteName || "QRWho";

  return (
    <div className="min-h-app bg-bg text-fg">
      {/* Simple bar — same pattern as /lab, so visitors can always get back */}
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

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-wide text-muted">Last Updated: {LAST_UPDATED}</p>
        <h1 className="mt-2 font-display text-4xl italic leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        <div className="mt-10 space-y-10">{children}</div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg/80 sm:text-base">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-accent/60">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-base leading-relaxed text-fg/85 sm:text-lg">
        The short version: QRWho runs in your browser. Your photos, your QR content and your
        designs stay on your device — we don&apos;t need (or want) your personal data.
      </p>

      <Section title="About QRWho">
        <p>
          QRWho (qrwho.online) is a free QR code generator and customization studio. You can
          build QR codes for website links, text messages, Wi-Fi access, contact cards, email,
          phone and SMS, WhatsApp chats, map locations, calendar events and more; blend a photo
          or a center logo into artistic codes; pick from designer presets and frames; check
          that a code scans; and download the result as a PNG or vector SVG — with no account
          and no watermark.
        </p>
      </Section>

      <Section title="Information We Collect">
        <p>
          We do not ask for — and do not collect — personal information. There is no sign-up,
          no user profile, no newsletter and no payment form on QRWho.
        </p>
        <p>The only information involved in running the site is:</p>
        <Bullets
          items={[
            <>
              <strong className="font-medium text-fg">Technical request data.</strong> Like any
              website, our web host processes standard technical information when your browser
              requests a page (for example IP address, browser type and the time of the request)
              in order to deliver the site to you.
            </>,
            <>
              <strong className="font-medium text-fg">Your design data, kept in your own browser.</strong>{" "}
              A small cookie and your browser&apos;s local storage remember the QR you are working
              on and your recent designs. This data stays on your device — see{" "}
              <em>Cookies and Similar Technologies</em> below.
            </>,
          ]}
        />
      </Section>

      <Section title="Information We Do Not Collect">
        <Bullets
          items={[
            "No names, email addresses or phone numbers — there is no account system.",
            "No payment or billing information — QRWho has no paid features.",
            "No analytics, advertising, tracking pixels or cross-site identifiers.",
            "No copies of the photos you upload or the QR content you type — they are never sent to us.",
            "No camera footage — the optional scanner reads codes locally and video never leaves your device.",
            "No precise location — map coordinates only exist if you type them into a QR yourself.",
          ]}
        />
      </Section>

      <Section title="How QRWho Processes Images and QR Content">
        <p>
          Everything you put into the studio — photos, logos, Wi-Fi credentials, contact details,
          links, captions — is processed <strong className="font-medium text-fg">inside your
          browser</strong> by the site&apos;s rendering code. Photos are woven into the QR on your
          device; they are not uploaded to QRWho, and we have no server-side copy of them.
        </p>
        <p>
          The content you encode is embedded in the QR image you download — that is what a QR
          code is for. Anyone you show the code to can scan and see that content. Uploaded
          pictures are referenced only by temporary in-memory browser links that disappear when
          you close the tab, and they are deliberately never written to the session cookie or
          your design history.
        </p>
      </Section>

      <Section title="How We Use Information">
        <p>
          The limited technical request data described above is used only to serve QRWho
          securely and reliably (delivering pages, keeping the service stable and safe). The
          design data stored in your browser is used only to make the studio work for you —
          restoring your current design when you come back and showing your recent designs.
        </p>
        <p>
          We do not build visitor profiles, do not personalize advertising, do not send
          marketing messages, and do not sell or share information about you.
        </p>
      </Section>

      <Section title="Local/Browser Processing">
        <p>These features run entirely on your device, in your browser:</p>
        <Bullets
          items={[
            "QR code generation and all styling (colors, shapes, presets, frames).",
            "Photo and logo blending, including the artistic/photo QR treatments.",
            "Scan checking (re-decoding the code with an on-device decoder) and the optional camera / picture scanner used to load an existing code's destination.",
            "PNG (2048px) and SVG export — the files are produced in your browser and downloaded straight to you.",
          ]}
        />
        <p>
          Our server only delivers the website itself: the app code, page content, and the
          built-in template artwork and logos shown in the pickers.
        </p>
      </Section>

      <Section title="Cookies and Similar Technologies">
        <p>
          <strong className="font-medium text-fg">Cookie (<code className="text-[13px]">qrwho-session-v1</code>).</strong>{" "}
          This first-party cookie remembers your current studio design — the destination you
          typed, your style choices, the chosen built-in logo, caption and frame — so a
          returning visitor lands back on their work. Uploaded pictures are never stored in it.
          It lasts up to one year and you can delete it any time from your browser settings;
          doing so simply forgets your current design.
        </p>
        <p>
          <strong className="font-medium text-fg">Local storage
          (<code className="text-[13px]"> qrwho-history-v1</code>).</strong> Your browser keeps
          your recent designs (up to 12) so the studio&apos;s history works. Clearing your
          browser storage removes them.
        </p>
        <p>
          <strong className="font-medium text-fg">Session storage.</strong> The landing page
          briefly caches its rendered showcase codes to load faster; the private admin area
          keeps an admin sign-in token there — relevant only to the site&apos;s operators.
        </p>
        <p>
          There are no third-party advertising or tracking cookies.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <Bullets
          items={[
            <>
              <strong className="font-medium text-fg">Web fonts (Google Fonts).</strong> The
              site loads its typefaces from fonts.googleapis.com and fonts.gstatic.com. Your
              browser requests those files directly from Google, which processes standard
              request data (such as your IP address) under its own privacy policy.
            </>,
            <>
              <strong className="font-medium text-fg">Hosting (Vercel).</strong> QRWho is served
              from Vercel&apos;s platform, which processes standard technical request data to
              deliver the pages (see <em>Information We Collect</em>).
            </>,
            <>
              <strong className="font-medium text-fg">Support / tip links (optional).</strong> If
              the site shows a &ldquo;support QRWho&rdquo; link after a download, it points to
              an external tipping platform (for example Ko-fi). Nothing is sent there unless
              you click the link, and that platform&apos;s own privacy policy then applies.
            </>,
            <>
              <strong className="font-medium text-fg">Where your QR codes point.</strong> When
              someone scans a QR you made, they reach the website, contact, network or content
              you chose to encode. Those destinations are third parties of your choosing, not
              ours.
            </>,
          ]}
        />
        <p>QRWho uses no analytics, advertising or marketing SDKs.</p>
      </Section>

      <Section title="Data Storage and Retention">
        <p>
          Because personal design data lives only in your browser, there is no user database on
          our side holding it. The session cookie persists for up to one year (or until you
          clear it); your recent-designs history stays until you delete entries or clear your
          browser storage. Uploaded photos are never retained anywhere. Technical request data
          handled by our hosting provider is retained under that provider&apos;s operational
          policies.
        </p>
      </Section>

      <Section title="Security">
        <p>
          QRWho is served over HTTPS, and processing your photos and QR content on your own
          device is itself a privacy safeguard: that data is never transmitted to us. The
          session cookie is a convenience memory, not an authentication token — it grants no
          access to any account, because accounts don&apos;t exist. No method of transmission or
          storage is perfectly secure, but the design keeps almost nothing at risk: we hold no
          personal data about visitors.
        </p>
      </Section>

      <Section title="Children's Privacy">
        <p>
          QRWho does not knowingly collect personal information from anyone, including children
          under 13 (or the applicable minimum age in your country). The service requires no
          personal data to use. If you believe a child has somehow provided personal
          information to us, contact us and we will address it promptly.
        </p>
      </Section>

      <Section title="Your Privacy Rights">
        <p>
          Depending on where you live (for example under the GDPR or the CCPA), you may have
          rights to access, correct, delete or object to the processing of your personal
          information. Because QRWho does not collect or store personal information on its
          servers, there is typically nothing held by us to access or delete. The data that
          does exist — your current design cookie and recent-designs history — is under your
          control: clear it any time in your browser settings. If you have questions or a
          request, contact us (see <em>Contact Us</em> below).
        </p>
      </Section>

      <Section title="Changes to This Privacy Policy">
        <p>
          We may update this policy as the product evolves. When we do, we will post the new
          version on this page and revise the &ldquo;Last Updated&rdquo; date. Continuing to use
          QRWho after changes means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact Us">
        <p>
          Questions about this policy or your privacy on QRWho? Email us at{" "}
          <strong className="font-medium text-fg">{CONTACT_PLACEHOLDER}</strong>. (QRWho does not
          yet publish an official contact email — this placeholder will be replaced with the
          official address before launch.)
        </p>
      </Section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use">
      <p className="text-base leading-relaxed text-fg/85 sm:text-lg">
        QRWho is a free tool for making QR codes. These terms keep things clear: your QR
        content is yours, you use the tool lawfully, and the service is provided as-is.
      </p>

      <Section title="Acceptance of These Terms">
        <p>
          By visiting qrwho.online or using the QRWho studio (collectively, the
          &ldquo;Service&rdquo;), you agree to these Terms of Use and to our Privacy Policy. If
          you do not agree, please do not use the Service.
        </p>
      </Section>

      <Section title="Description of QRWho">
        <p>
          QRWho is a free, browser-based QR code generator and customization tool. It lets you
          create QR codes for links, text, Wi-Fi access, contact cards and more; customize them
          with photos, logos, colors, presets and frames; check that they scan; and export them
          as PNG or vector SVG. The Service requires no account and is free to use. Core
          generation, image processing and export happen on your device.
        </p>
      </Section>

      <Section title="Use of the Service">
        <p>
          You may use QRWho for any lawful purpose, personal or commercial. You are responsible
          for your use of the Service and for the content and destinations you encode into your
          QR codes. You need a modern web browser to use the Service; some features (such as
          the camera scanner) need your browser&apos;s permission and can be declined.
        </p>
      </Section>

      <Section title="User-Generated Content and QR Codes">
        <p>
          Everything you encode — links, text, photos, logos, Wi-Fi credentials, contact
          details — is your content. <strong className="font-medium text-fg">We claim no
          ownership of it</strong>, and we do not store it on our servers (it is processed in
          your browser). The QR codes you generate are yours to use however you like, subject to
          these Terms.
        </p>
        <p>
          You are solely responsible for what your QR codes contain and where they lead. When
          someone scans your code, they see and reach the exact content you encoded — a website,
          a message, a Wi-Fi network, a contact card. Make sure you have the right to use that
          content and that pointing people to it is lawful and accurate.
        </p>
      </Section>

      <Section title="Prohibited Uses">
        <p>You agree not to use the Service to:</p>
        <Bullets
          items={[
            "create or distribute QR codes for any unlawful, fraudulent or malicious purpose — including phishing, scams, malware, or impersonating real people, brands or organizations;",
            "encode content that infringes anyone's intellectual property, privacy or other rights (including other people's personal data, such as phone numbers or Wi-Fi passwords, without permission);",
            "distribute abusive, threatening or harassing content;",
            "interfere with, disrupt, or place unreasonable load on the Service, or attempt to gain unauthorized access to it;",
            "use the Service in violation of any applicable law or regulation.",
          ]}
        />
      </Section>

      <Section title="Intellectual Property">
        <p>
          The QRWho name, logo, website design and software are protected by intellectual
          property laws and remain the property of their owners. These Terms give you no rights
          to them beyond using the Service as intended.
        </p>
        <p>
          The QR code itself is an international standard (ISO/IEC 18004) that anyone may use.
          The QR codes you generate with QRWho are yours — we place no watermark on them and
          claim no rights in them. We simply ask that you not imply that QRWho endorses or is
          responsible for the content your codes carry.
        </p>
      </Section>

      <Section title="Third-Party Links and Content">
        <p>
          QR codes made with QRWho can point anywhere — the destinations are chosen by you and
          by the people who make codes. We do not control, endorse or take responsibility for
          third-party websites, services or content, whether linked from a QR code, from an
          optional support/tip link, or elsewhere on the site. External sites have their own
          terms and policies.
        </p>
      </Section>

      <Section title="Service Availability">
        <p>
          QRWho is provided free of charge, on an &ldquo;as available&rdquo; basis. We do not
          guarantee that the Service will be uninterrupted, error-free or available at any
          particular time. We may add, change or remove features — or pause or discontinue the
          Service — at any time.
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          To the maximum extent permitted by law, the Service is provided &ldquo;as is&rdquo;
          and &ldquo;as available&rdquo; without warranties of any kind, whether express or
          implied, including warranties of merchantability, fitness for a particular purpose and
          non-infringement.
        </p>
        <p>
          In particular: QR code scannability depends on how the code is displayed and used —
          print size, screen brightness, contrast, lighting, distance and the scanning device.
          The studio verifies codes with an on-device decoder and will warn you when a design
          is risky, but we cannot guarantee that every code scans in every situation. Test your
          codes before printing or publishing them widely.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, QRWho and its operators will not be liable
          for any indirect, incidental, special, consequential or punitive damages — including
          lost data, lost profits or business interruption — arising from your use of (or
          inability to use) the Service, from any QR code created with the Service, or from any
          third-party content or destination. Where liability cannot be excluded, it is limited
          to the minimum extent permitted by applicable law.
        </p>
      </Section>

      <Section title="Changes to the Service">
        <p>
          QRWho is under active development. Features, presets and templates may be added,
          modified or removed over time, and the look of the site may change. We may also
          impose reasonable technical limits (for example, on automated or bulk use) to keep
          the free Service stable for everyone.
        </p>
      </Section>

      <Section title="Changes to These Terms">
        <p>
          We may update these Terms as the Service evolves. When we do, we will post the new
          version on this page and revise the &ldquo;Last Updated&rdquo; date. Your continued
          use of the Service after changes means you accept the updated Terms.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You may stop using the Service at any time, and clear your locally stored designs
          whenever you wish. We may restrict, suspend or terminate access to the Service for
          anyone who violates these Terms or uses the Service in a way that could harm QRWho,
          its users or third parties.
        </p>
      </Section>

      <Section title="Governing Law / Jurisdiction">
        <p>
          These Terms are governed by the laws of{" "}
          <strong className="font-medium text-fg">[insert applicable jurisdiction before launch]</strong>,
          without regard to its conflict-of-law principles. (QRWho has not yet designated a
          governing jurisdiction — this placeholder will be replaced before launch.)
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <strong className="font-medium text-fg">{CONTACT_PLACEHOLDER}</strong>. (QRWho does not
          yet publish an official contact email — this placeholder will be replaced with the
          official address before launch.)
        </p>
      </Section>
    </LegalLayout>
  );
}
