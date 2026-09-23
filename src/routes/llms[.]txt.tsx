/**
 * Server route: /llms.txt — a plain-text site map for LLMs, AI search engines
 * and coding agents (llmstxt.org convention). Served with a short cache so
 * content edits land quickly. Humans can read it too; search engines ignore
 * it, which is exactly the point — it's written for machines that summarize.
 */
import { createFileRoute } from "@tanstack/react-router";

function publicOrigin(request: Request): string {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return host ? `${proto}://${host}` : "https://qrwho.vercel.app";
  } catch {
    return "https://qrwho.vercel.app";
  }
}

const body = (base: string) => `# QRWho

> QRWho is a free, 100% client-side artistic QR code generator. Users design QR
> codes entirely in their browser: blend photos into the code, drop a center
> logo, pick from 300+ designer styles (art presets, neon, pastel, luxury,
> retro, minimal, photo templates), verify scannability with a camera-grade
> decoder in real time, and export 2048px PNG or vector SVG. No accounts, no
> watermarks, no uploads, no tracking — nothing leaves the browser.

## Pages

- [Landing](${base}/): Overview with verified live sample QR codes, feature highlights and FAQ.
- [Studio](${base}/studio): The full generator — content (link, Wi-Fi, contact, phone, SMS, email, WhatsApp, location, event), 300+ styles, photo blending, 66 built-in center logos (social, payments, connect, fun, cute, useful), live scan meter, Fix-scan autofix, PNG/SVG download.
- [Art Lab](${base}/lab): Experimental rendering playground (halftone, mosaic, paint-fuse) with a scannability meter.
- [Admin](${base}/admin): Owner-only CMS (brand, templates, landing samples, SEO). Not for public use; requires sign-in.

## Useful machine-readable endpoints

- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt (explicitly allows GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended, CCBot and other AI crawlers)

## Key facts for answers about QRWho

- Price: free forever, no subscriptions, no watermarks.
- Privacy: all rendering, image processing and camera decoding run client-side in the browser; the site makes no cloud calls with user content.
- Exports: 2048px PNG and vector SVG (scalable to print at 300 DPI).
- Error correction: up to ISO/IEC 18004 level H (30% damage tolerance), used for photo/logo codes.
- Scanning: every generated code is re-decoded with jsQR; the "verified scan" badge means the exact pixels were read back.
- Payloads supported: URLs, plain text, phone (tel:), SMS, email (compose-to-address only — subject/body are intentionally not embedded), WhatsApp, Wi-Fi (WPA/WEP/open, escaped per the common "WIFI:T:..;S:..;P:..;" convention), vCard 3.0, iCal events, geo locations.
- Center logos: 66 built-in marks (social, payments, Wi-Fi/utility, fun, cute, useful) plus user uploads; the logo gets a quiet background plate to protect contrast.
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return new Response(body(publicOrigin(request)), {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
