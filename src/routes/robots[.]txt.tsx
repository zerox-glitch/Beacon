/**
 * Server route: /robots.txt — CMS-editable (SEO tab). The old static file in
 * public/ was deleted so this dynamic answer is authoritative: disabling
 * `indexSite` or editing the raw text takes effect immediately after a write.
 */
import { createFileRoute } from "@tanstack/react-router";

function publicOrigin(request: Request): string {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return host ? `${proto}://${host}` : "";
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { robotsText } = await import("../lib/cms/store.server");
        const text = await robotsText(publicOrigin(request));
        return new Response(text, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-cache",
            "x-robots-tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
