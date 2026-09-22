/**
 * Where the admin panel keeps its bearer session token (client-only).
 *
 * The live preview runs the app in a partitioned iframe where SameSite=Lax
 * cookies are not attached to in-app requests, so admin calls authenticate
 * with `Authorization: Bearer <better-auth session token>` — the exact pattern
 * the platform's own gate client uses (see src/lib/auth/client.ts). Deployed
 * first-party visits rely on the HttpOnly cookie and never store a bearer; the
 * server prefers the cookie whenever no bearer is present.
 *
 * sessionStorage (not localStorage): the token dies with the tab.
 *
 * Naming note: this module must NOT be named `admin-bearer.client.ts` — Start's
 * import-protection forbids files matching `*.client.*` from any module that is
 * reachable from the server graph, and the admin server functions import it
 * (dynamically, inside `.client()` middleware). The `typeof window` guards keep
 * it SSR-safe.
 */
const BEARER_KEY = "qrwho-admin.bearer";

export function getAdminBearer(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

export function setAdminBearer(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable — cookie flow still works */
  }
}
