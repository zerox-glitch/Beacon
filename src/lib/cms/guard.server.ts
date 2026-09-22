/**
 * Admin authorization guard — SERVER-ONLY. Every admin server function runs
 * through `requireAdmin()`. The client can send nothing that bypasses it:
 * membership is proven by a Better-Auth session whose user id must appear in
 * the `cms_admin` table (a row only first-run setup can create).
 *
 * Hardening layers (defense in depth):
 *  1. Same-site request check (reused from the platform's isolation module) —
 *     scripted cross-site/sibling requests are rejected before any query.
 *  2. Write requests (POST) must carry an Origin that matches this host
 *     (or x-forwarded-host behind the preview proxy).
 *  3. Session: HttpOnly `__Host-` cookie when deployed / first-party;
 *     `Authorization: Bearer <session-token>` when the app runs inside the
 *     preview iframe with partitioned cookies (the bearer plugin).
 *  4. Membership: session user must be THE admin (single-row claim).
 *  5. Per-IP in-process throttle + per-account DB lockout (admin API).
 */
import { getRequest } from "@tanstack/react-start/server";
import { assertSameSiteRequest } from "../auth/isolation.server";
import { getSql } from "../db";

export interface AdminContext {
  userId: string;
  name: string;
  email: string;
}

/** Stable, matchable message for the client to redirect on. */
export const ADMIN_REQUIRED_MESSAGE = "Admin session required";

export class AdminRequiredError extends Error {
  readonly status = 401;
  constructor(message: string = ADMIN_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AdminRequiredError";
  }
}

export class ForbiddenOriginError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: origin mismatch");
    this.name = "ForbiddenOriginError";
  }
}

/* ----------------------------- per-IP throttling ----------------------------- */

const IP_WINDOW_MS = 60_000;
const IP_MAX_CALLS = 120; // generous for UI traffic, brutal for scripted floods
const ipHits = new Map<string, { count: number; resetAt: number }>();

function clientIp(): string | null {
  const request = getRequest();
  if (!request) return null;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? null;
}

export function throttleIp(): void {
  const ip = clientIp();
  if (!ip) return; // SSR / in-process calls and non-browser clients skip it
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || hit.resetAt <= now) {
    ipHits.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    if (ipHits.size > 5000) {
      for (const [k, v] of ipHits) if (v.resetAt <= now) ipHits.delete(k);
    }
    return;
  }
  hit.count += 1;
  if (hit.count > IP_MAX_CALLS) {
    throw new Error("Too many requests — wait a minute");
  }
}

/* --------------------------------- session ---------------------------------- */

async function sessionUser(bearerToken?: string): Promise<{ id: string; email: string; name: string } | null> {
  const request = getRequest();
  if (!request) return null;
  let headers = request.headers;
  if (bearerToken) {
    headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  const { auth } = await import("../auth/server");
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: (session.user as { email?: string }).email ?? "",
    name: (session.user as { name?: string }).name ?? "",
  };
}

async function membership(userId: string): Promise<{ display_name: string } | null> {
  const sql = await getSql();
  const rows = await sql.query<{ display_name: string }>(
    'select display_name from cms_admin where "user_id" = $1',
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * The chokepoint for every admin call. Returns the verified admin or throws
 * `AdminRequiredError` (401 semantics) — never a partial/anonymous context.
 */
export async function requireAdmin(
  bearerToken?: string,
  opts: { write?: boolean } = {},
): Promise<AdminContext> {
  assertSameSiteRequest(); // 403 for scripted cross-site requests
  if (opts.write !== false) assertWriteOrigin(); // mutations: origin must match
  const user = await sessionUser(bearerToken);
  if (!user) throw new AdminRequiredError();
  const member = await membership(user.id);
  if (!member) throw new AdminRequiredError("Signed in, but this account is not the site admin");
  return { userId: user.id, name: member.display_name || user.name, email: user.email };
}

/** Best-effort read of the current admin (no throw) — for /admin bootstrap. */
export async function peekAdmin(bearerToken?: string): Promise<AdminContext | null> {
  try {
    const user = await sessionUser(bearerToken);
    if (!user) return null;
    const member = await membership(user.id);
    if (!member) return null;
    return { userId: user.id, name: member.display_name || user.name, email: user.email };
  } catch {
    return null;
  }
}

function assertWriteOrigin(): void {
  const request = getRequest();
  if (!request) return; // in-process (build/SSR bootstrap) — no browser origin
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser client (curl/SSR) — same-site check suffices
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ForbiddenOriginError();
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  // Behind the preview proxy Host may differ from the browser's Origin only by
  // the proxy hop — accept either. Anything else is cross-origin.
  if (originHost && host && originHost !== host) throw new ForbiddenOriginError();
}

export function requestIp(): string | null {
  return clientIp();
}

export function requestUserAgent(): string | null {
  return getRequest()?.headers.get("user-agent") ?? null;
}
