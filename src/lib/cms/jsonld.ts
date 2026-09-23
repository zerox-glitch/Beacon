/** JSON-LD graph for the document head — brand/SEO aware, pure. */
import type { PageMeta } from "./types.ts";

export function buildJsonLd(meta: PageMeta, presetCount: number): string {
  const site = meta.canonical ? safeOrigin(meta.canonical) : "";
  const base = site || "https://qrwho.vercel.app";
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${base}/#webapp`,
        name: meta.siteName,
        url: `${base}/`,
        description: meta.description,
        applicationCategory: "DesignApplication, MultimediaApplication, BusinessApplication",
        operatingSystem: "All modern browsers (iOS, Android, macOS, Windows, Linux)",
        browserRequirements: "Requires JavaScript. Works 100% client-side with Canvas API.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          `${presetCount}+ Curated Artistic Presets (Japanese Ukiyo-e, Cyberpunk, Royal Gold, Sakura, Solarpunk, Retro Vaporwave)`,
          "Photo-to-QR and Image Blending with Mosaic & Halftone filters",
          "Infinitely Scalable Vector SVG and 2048px PNG Export for 300 DPI print",
          "Real-Time Camera Scannability Engine and 1-Click Auto-Fix",
          "Static Zero-Redirect QR Codes that never expire",
          "66 Built-in Center Logos (WhatsApp, Instagram, TikTok, Wi-Fi, PayPal, Visa, work, health, education, and more) plus custom uploads",
          "100% On-Device Privacy — zero cloud uploads or telemetry",
          "ISO/IEC 18004 Error Correction Level H support",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${base}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Is QRWho really free without watermarks or subscriptions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, QRWho is completely free forever. You can generate unlimited custom artistic QR codes and download high-resolution 2048px PNG files with zero watermarks, zero accounts, and zero monthly fees.",
            },
          },
          {
            "@type": "Question",
            name: "Do QR codes created on QRWho ever expire?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. QRWho generates pure static QR codes where the destination URL, text, or credentials are built directly into the barcode matrix. There is no middleman redirect server, meaning your QR codes will work indefinitely.",
            },
          },
          {
            "@type": "Question",
            name: "Are my uploaded photos and links private?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "100% private. All rendering, image processing, and camera verification happens strictly in your local browser memory. No data or images are ever uploaded to any server.",
            },
          },
          {
            "@type": "Question",
            name: "Can I print these QR codes on restaurant menus, business cards, and packaging?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Downloads are exported at 2048x2048 pixels with Error Correction Level H, providing crisp 300 DPI resolution ideal for commercial print packaging, posters, apparel, and signage.",
            },
          },
        ],
      },
    ],
  });
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
