import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { getPageSeo } from "@/lib/cms/public-api";
import { ensureCms, useCms } from "@/lib/cms/runtime";
import type { PageMeta } from "@/lib/cms/types";
import { buildJsonLd } from "@/lib/cms/jsonld";
import { PRESETS } from "@/lib/qr/presets";
import appCss from "../styles.css?url";

/**
 * The root document. Everything SEO-visible comes from the CMS loader so
 * crawlers and social unfurlers see exactly what the admin panel configured
 * (title / description / keywords / robots / og / canonical / favicon). The
 * constants below are only the fallback used before the loader resolves or if
 * the database is unreachable — they match the pre-CMS hardcoded head.
 */
const FALLBACK_TITLE =
  "QRWho — Free Artistic QR Code Generator | Custom AI QR Art, Logo, Menu, WiFi & vCard Maker (Vector SVG & PNG)";
const FALLBACK_DESC = `Create beautiful, custom artistic QR codes online for free. Transform any URL, WiFi, vCard, photo, restaurant menu or social link into a scannable work of art. ${PRESETS.length}+ designer presets, photo blending, vector SVG & 2048px PNG print export, 100% private & on-device with zero watermarks.`;

const FALLBACK_META: PageMeta = {
  title: FALLBACK_TITLE,
  description: FALLBACK_DESC,
  keywords: "free qr code generator, custom qr code art, artistic qr code maker, qr code with logo, restaurant menu qr code, business card vcard qr code, wifi qr code generator, vector svg qr code, scannable photo qr code",
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  ogTitle: FALLBACK_TITLE,
  ogDescription: FALLBACK_DESC,
  ogImage: "/art-hero.jpg",
  canonical: "",
  themeColor: "#0c0c0b",
  icon: "/logo.png",
  siteName: "QRWho",
};

/** Server runs the real SEO lookup; clients reuse the dehydrated loader data. */
function AnnouncementBar() {
  const { brand, status } = useCms();
  if (status !== "ready" || !brand.announcementEnabled || !brand.announcementText) return null;
  const text = <span>{brand.announcementText}</span>;
  return (
    <div className="border-b border-border bg-elevated/80 px-4 py-1.5 text-center text-[13px] text-muted">
      {brand.announcementLink ? (
        <a href={brand.announcementLink} className="font-medium text-fg underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
          {brand.announcementText}
        </a>
      ) : (
        text
      )}
    </div>
  );
}

export const Route = createRootRoute({
  // Runs on the server for every document request (and is dehydrated to the
  // client), so SSR HTML carries the CMS-configured head. Also hydrates the
  // client-side catalog store for the public pages.
  loader: async ({ location }) => {
    const path = location.pathname;
    const [seo] = await Promise.all([
      getPageSeo({ data: path }).catch(() => null),
      // Server-side: prime the merged catalog so SSR galleries never render a
      // hidden template. Client: the store's own hook refetches when mounted.
      typeof window === "undefined" ? ensureCms() : Promise.resolve(),
    ]);
    return { seo: seo as PageMeta | null };
  },
  head: ({ loaderData }) => {
    const m = loaderData?.seo ?? FALLBACK_META;
    const isAbs = (u: string) => /^https?:\/\//i.test(u);
    const origin = m.canonical && isAbs(m.canonical) ? new URL(m.canonical).origin : "";
    const abs = (u: string) => (u && !isAbs(u) && origin ? `${origin}${u.startsWith("/") ? "" : "/"}${u}` : u);
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: m.title },
        { name: "description", content: m.description },
        { name: "keywords", content: m.keywords },
        { name: "theme-color", content: m.themeColor },
        { name: "robots", content: m.robots },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: m.siteName },
        { property: "og:title", content: m.ogTitle },
        { property: "og:description", content: m.ogDescription },
        { property: "og:image", content: abs(m.ogImage) },
        { property: "og:image:alt", content: `${m.siteName} Artistic QR Code Studio` },
        { property: "og:url", content: m.canonical || undefined },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: m.ogTitle },
        { name: "twitter:description", content: m.ogDescription },
        { name: "twitter:image", content: abs(m.ogImage) },
      ].filter((t) => !("content" in t) || t.content !== undefined),
      links: [
        { rel: "icon", type: "image/png", href: m.icon },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
        },
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
        ...(m.canonical ? [{ rel: "canonical", href: m.canonical }] : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: buildJsonLd(m, PRESETS.length),
        } as never,
      ],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <AnnouncementBar />
          <Outlet />
        </AuthProvider>
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}
