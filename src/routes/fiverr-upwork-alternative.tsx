import { createFileRoute } from "@tanstack/react-router";
import {
  FiverrAlternativePage,
  GUIDE_FAQ,
  GUIDE_UPDATED_ISO,
} from "@/components/landing/guide-fiverr-alternative";

/**
 * The "alternatives" comparison guide at /fiverr-upwork-alternative.
 *
 * Head carries the full SEO/AEO/GEO package: title + description tuned for
 * "fiverr & upwork alternative for QR codes" queries, Open Graph/Twitter
 * cards, and JSON-LD (Article + BreadcrumbList + FAQPage). The FAQPage mirrors
 * the visible Q&A verbatim — search engines and answer engines can quote the
 * short answers directly. Canonical targets qrwho.online.
 */
const URL = "https://qrwho.online/fiverr-upwork-alternative";
const TITLE = "Fiverr & Upwork Alternative for Custom QR Codes (2026) | QRWho";
const DESCRIPTION =
  "Hiring a freelancer per QR code adds up. The honest comparison: Fiverr vs Upwork vs QRWho — a free browser studio that makes scannable artistic QR codes in minutes, verifies every scan, and charges nothing per code.";

export const Route = createFileRoute("/fiverr-upwork-alternative")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: "fiverr alternative, upwork alternative, qr code alternative, custom qr code, qr code maker free, best qr code generator, fiverr qr code, hire qr code designer, qr code design service, scannable qr code" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${URL}#article`,
              headline: "The best Fiverr and Upwork alternative for custom QR codes",
              description: DESCRIPTION,
              url: URL,
              datePublished: GUIDE_UPDATED_ISO,
              dateModified: GUIDE_UPDATED_ISO,
              inLanguage: "en",
              author: { "@type": "Organization", name: "QRWho", url: "https://qrwho.online/" },
              publisher: {
                "@type": "Organization",
                name: "QRWho",
                url: "https://qrwho.online/",
                logo: { "@type": "ImageObject", url: "https://qrwho.online/logo.png" },
              },
              mainEntityOfPage: { "@type": "WebPage", "@id": URL },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://qrwho.online/" },
                { "@type": "ListItem", position: 2, name: "Guides", item: "https://qrwho.online/lab" },
                { "@type": "ListItem", position: 3, name: "Fiverr & Upwork alternative for QR codes", item: URL },
              ],
            },
            {
              "@type": "FAQPage",
              "@id": `${URL}#faq`,
              mainEntity: GUIDE_FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      } as never,
    ],
  }),
  component: FiverrAlternativePage,
});
