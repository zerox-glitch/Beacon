/**
 * Cookie-based session memory: the studio's current destination + look are
 * written to a plain cookie (1 year) so a visitor who returns lands back on
 * their code — no account, no server. Kept under the ~4KB cookie ceiling by
 * design: the logo is stored as its built-in id (not the data URL), pictures
 * as media URLs only (blob: URLs die with the tab), and oversized payloads
 * are dropped gracefully.
 */
import { emptyPayload, type Payload, type QrStyle, DEFAULT_STYLE } from "./qr/types.ts";
import type { FrameId } from "./qr/frames";

export const SESSION_COOKIE = "qrwho-session-v1";
const COOKIE_BUDGET = 3800; // stay under the de-facto 4KB per-cookie limit

export interface SessionSlice {
  payload: Payload;
  style: QrStyle;
  /** Built-in logo id (data URLs are too big for a cookie). */
  logoId: string | null;
  /** Media URL only — blob: uploads are never persisted. */
  imageUrl: string | null;
  caption: string;
  frame: FrameId;
}

interface Encoded {
  v: 1;
  at: number;
  p: Payload;
  s: QrStyle;
  l: string | null;
  i: string | null;
  c: string;
  f: FrameId;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function encodeSession(s: SessionSlice): string | null {
  const build = (p: Partial<Encoded>): string | null => {
    const doc: Encoded = {
      v: 1,
      at: Date.now(),
      p: s.payload,
      s: s.style,
      l: s.logoId,
      i: s.imageUrl,
      c: s.caption,
      f: s.frame,
      ...p,
    };
    const value = encodeURIComponent(JSON.stringify(doc));
    return value.length <= COOKIE_BUDGET ? value : null;
  };
  // Degradation ladder: drop the picture, then the logo, then give up.
  return (
    build({}) ??
    build({ i: null }) ??
    build({ i: null, l: null }) ??
    null
  );
}

export function decodeSession(raw: string | null | undefined): SessionSlice | null {
  if (!raw) return null;
  let doc: unknown;
  try {
    doc = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!isObj(doc) || doc.v !== 1 || !isObj(doc.p) || !isObj(doc.s)) return null;
  const doc2 = doc as unknown as Encoded;
  return {
    payload: { ...emptyPayload(), ...(doc2.p as Payload) },
    style: { ...DEFAULT_STYLE, ...(doc2.s as QrStyle) },
    logoId: typeof doc2.l === "string" ? doc2.l : null,
    imageUrl: typeof doc2.i === "string" && !doc2.i.startsWith("blob:") ? doc2.i : null,
    caption: typeof doc2.c === "string" ? doc2.c : "",
    frame: (doc2.f as FrameId) ?? "none",
  };
}

export function readSessionCookie(): SessionSlice | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  return decodeSession(entry.slice(SESSION_COOKIE.length + 1));
}

export function writeSessionCookie(s: SessionSlice): void {
  if (typeof document === "undefined") return;
  const value = encodeSession(s);
  if (!value) return; // over budget — better no memory than a truncated cookie
  const oneYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; expires=${oneYear}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}
