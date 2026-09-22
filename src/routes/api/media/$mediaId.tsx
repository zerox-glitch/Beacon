/**
 * Server route: raw bytes for CMS-uploaded media (logos, artwork, share cards).
 *
 * Reads are PUBLIC by design (the <img> tags on the public site need them) and
 * contain nothing sensitive — uploads themselves are admin-only server
 * functions. Ids are random and immutable, so responses are `immutable`-cached
 * with a sha256 ETag; the DB never stores paths, so there is no traversal
 * surface and no filesystem dependency (works on Vercel serverless).
 *
 * Only GET/HEAD reach the handler — createServerFn handles all writes.
 */
import { createFileRoute } from "@tanstack/react-router";

const MEDIA_ID_RE = /^med_[a-zA-Z0-9_]{8,40}$/;

async function serve(request: Request, mediaId: string | undefined): Promise<Response> {
  if (!mediaId || !MEDIA_ID_RE.test(mediaId)) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const { getMediaBytes } = await import("../../../lib/cms/store.server");
  const asset = await getMediaBytes(mediaId);
  if (!asset) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }
  const etag = `"${asset.etag}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, "cache-control": "public, max-age=31536000, immutable" },
    });
  }
  // The bytes were magic-byte-validated on upload to PNG/JPEG/WebP/GIF only.
  // Node's Response accepts typed arrays; the DOM lib types lag behind.
  const body = request.method === "HEAD" ? null : (asset.bytes as unknown as BodyInit);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": asset.contentType,
      "content-length": String(asset.bytes.length),
      etag,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'",
    },
  });
}

export const Route = createFileRoute("/api/media/$mediaId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => serve(request, params.mediaId),
      HEAD: async ({ request, params }) => serve(request, params.mediaId),
    },
  },
});
