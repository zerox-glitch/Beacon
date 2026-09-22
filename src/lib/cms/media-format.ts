/**
 * Upload validation for CMS media — pure and dependency-free so it is
 * unit-testable (and reused server-side by the admin API, which is the only
 * place uploads are handled).
 *
 * Security posture:
 *  - Content type is decided ONLY by magic bytes, never by the client's
 *    claimed MIME or filename extension.
 *  - SVG uploads are rejected outright (embedded script = stored XSS).
 *  - Size is capped; decoders on the site only ever receive raster images.
 */

export const MAX_MEDIA_BYTES = 4 * 1024 * 1024; // 4 MiB
export const MAX_B64_CHARS = Math.ceil((MAX_MEDIA_BYTES * 4) / 3) + 8;

export type DetectedImage = {
  contentType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  ext: string;
};

export const MEDIA_KINDS = ["logo", "og", "art", "image"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Sniff a real image type from magic bytes; null when unsupported. */
export function sniffImage(bytes: Uint8Array): DetectedImage | null {
  const at = (i: number) => bytes[i] ?? 0;
  const str = (i: number, n: number) => String.fromCharCode(...bytes.slice(i, i + n));
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    // Also require the IHDR chunk marker to follow.
    if (str(12, 4) === "IHDR") return { contentType: "image/png", ext: "png" };
    return null;
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    str(0, 4) === "RIFF" && str(8, 4) === "WEBP"
  ) {
    return { contentType: "image/webp", ext: "webp" };
  }
  if (
    bytes.length >= 6 &&
    (str(0, 6) === "GIF87a" || str(0, 6) === "GIF89a")
  ) {
    return { contentType: "image/gif", ext: "gif" };
  }
  return null;
}

/** Strip paths/control chars from an upload name; cap its length. */
export function sanitizeFilename(name: string, ext: string): string {
  const base = String(name ?? "")
    .replace(/[\\/]+/g, "")
    .replace(/[^A-Za-z0-9 ._-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 96);
  const stem = base.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  const out = (stem || "upload").toLowerCase();
  return `${out}.${ext}`;
}

/** Strict base64 (with optional whitespace stripping) -> bytes, or null. */
export function decodeBase64Image(input: string): Uint8Array | null {
  if (typeof input !== "string") return null;
  const b64 = input.trim();
  if (!b64 || b64.length > MAX_B64_CHARS) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** bytes -> base64 (server side: reading DB rows back to the admin UI). */
export function encodeBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Validate an image data URL or bare base64 payload. Returns the raw bytes +
 * detected type, or throws with a user-safe message.
 */
export function parseUpload(input: string): { bytes: Uint8Array; detected: DetectedImage } {
  let payload = (input ?? "").trim();
  if (!payload) throw new Error("Empty upload");
  const m = payload.match(/^data:([a-z/+-]+);base64,(.*)$/is);
  if (m) {
    const declared = m[1]!.toLowerCase();
    if (declared === "image/svg+xml") throw new Error("SVG uploads are not allowed (security)");
    payload = m[2]!;
  }
  if (payload.length > MAX_B64_CHARS) throw new Error("Image too large (max 4 MB)");
  const bytes = decodeBase64Image(payload);
  if (!bytes) throw new Error("Upload is not valid base64 image data");
  if (bytes.length === 0) throw new Error("Empty file");
  if (bytes.length > MAX_MEDIA_BYTES) throw new Error(`Image too large (max ${Math.floor(MAX_MEDIA_BYTES / 1024 / 1024)} MB)`);
  const detected = sniffImage(bytes);
  if (!detected) throw new Error("Unsupported image type — use PNG, JPEG, WebP or GIF (no SVG)");
  return { bytes, detected };
}

/** Only same-site paths or http(s) URLs — never javascript:/data:/vbscript:. */
export function isSafeImageUrl(url: string): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  if (u.startsWith("//")) return false; // protocol-relative
  if (/^\/[A-Za-z0-9._/-]*$/.test(u)) return true; // same-site absolute path
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Hex color guard for style fields coming from the admin. */
export function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);
}
