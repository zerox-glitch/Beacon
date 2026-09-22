/**
 * Server route: /sitemap.xml — pages maintained from the admin SEO tab.
 * lastmod follows the newest cms_settings write so the file stays honest
 * without tracking every template tweak.
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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { sitemapXml } = await import("../lib/cms/store.server");
        const xml = await sitemapXml(publicOrigin(request));
        return new Response(xml, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "no-cache",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
