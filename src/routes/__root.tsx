import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_TITLE =
  "QRWho — Free Artistic QR Code Generator | Custom AI QR Art, Logo, Menu & vCard Maker";
const APP_DESC =
  "Create beautiful, custom artistic QR codes online for free. Transform any URL, WiFi, vCard, image, restaurant menu or Instagram link into a scannable work of art. 170+ designer presets, photo blending, 2048px print export, 100% private & on-device with zero watermarks.";
const APP_KEYWORDS = [
  "free qr code generator",
  "custom qr code art",
  "artistic qr code maker",
  "ai qr code generator",
  "qr code with logo",
  "restaurant menu qr code",
  "business card vcard qr code",
  "wifi qr code generator",
  "instagram qr code maker",
  "vector svg qr code",
  "high resolution qr code for print",
  "aesthetic qr codes",
  "scannable photo qr code",
  "static qr code generator no expiry",
  "free qr code maker no watermark",
  "dynamic vs static qr code",
  "high error correction qr code level H",
  "wedding invitation qr code",
  "real estate qr code",
  "product packaging qr code",
  "spotify qr code generator",
  "app store qr code",
  "offline qr code generator",
  "private on device qr code creator",
  "custom qr code designer",
  "branded qr codes",
  "bar menu qr code",
  "contactless dining qr code",
  "qr code generator no signup",
].join(", ");

const SCHEMA_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://qrwho.vercel.app/#webapp",
      "name": "QRWho",
      "url": "https://qrwho.vercel.app",
      "description": APP_DESC,
      "applicationCategory": "DesignApplication, MultimediaApplication, BusinessApplication",
      "operatingSystem": "All modern browsers (iOS, Android, macOS, Windows, Linux)",
      "browserRequirements": "Requires JavaScript. Works 100% client-side with Canvas API.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "170+ Curated Artistic Presets (Japanese Ukiyo-e, Cyberpunk, Royal Gold, Sakura, Minimal Luxe)",
        "Photo-to-QR and Image Blending with Mosaic & Halftone filters",
        "Real-Time Camera Scannability Engine and 1-Click Auto-Fix",
        "High-Density 2048px PNG Export suitable for 300 DPI print",
        "Static Zero-Redirect QR Codes that never expire",
        "100% On-Device Privacy — zero cloud uploads or telemetry",
        "ISO/IEC 18004 Error Correction Level H support",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://qrwho.vercel.app/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is QRWho really free without watermarks or subscriptions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, QRWho is completely free forever. You can generate unlimited custom artistic QR codes and download high-resolution 2048px PNG files with zero watermarks, zero accounts, and zero monthly fees.",
          },
        },
        {
          "@type": "Question",
          "name": "Do QR codes created on QRWho ever expire?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. QRWho generates pure static QR codes where the destination URL, text, or credentials are built directly into the barcode matrix. There is no middleman redirect server, meaning your QR codes will work indefinitely.",
          },
        },
        {
          "@type": "Question",
          "name": "Are my uploaded photos and links private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "100% private. All rendering, image processing, and camera verification happens strictly in your local browser memory. No data or images are ever uploaded to any server.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I print these QR codes on restaurant menus, business cards, and packaging?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Downloads are exported at 2048x2048 pixels with Error Correction Level H, providing crisp 300 DPI resolution ideal for commercial print packaging, posters, apparel, and signage.",
          },
        },
      ],
    },
  ],
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_TITLE },
      { name: "description", content: APP_DESC },
      { name: "keywords", content: APP_KEYWORDS },
      { name: "theme-color", content: "#0c0c0b" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "QRWho" },
      { property: "og:title", content: APP_TITLE },
      { property: "og:description", content: APP_DESC },
      { property: "og:image", content: "/art-hero.jpg" },
      { property: "og:image:alt", content: "QRWho Artistic QR Code Studio" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_TITLE },
      { name: "twitter:description", content: APP_DESC },
      { name: "twitter:image", content: "/art-hero.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/logo.png" },
      { rel: "canonical", href: "https://qrwho.vercel.app/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: SCHEMA_JSON_LD }}
        />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
