/**
 * Admin middleware for server functions — mirrors the pattern of
 * `src/lib/auth/middleware.ts` but adds cms_admin membership.
 *
 * Client hook: forwards the preview bearer token (no-op when deployed with a
 * first-party cookie session). Server hook: resolves the Better-Auth session,
 * checks admin membership, enforces same-site + origin on writes — then every
 * handler downstream can trust `context.admin`.
 *
 * IMPORTANT: import server-only modules ONLY inside `.server()` below — this
 * file is bundled to the client as well (the bearer hook).
 */
import { createMiddleware } from "@tanstack/react-start";
import type { AdminContext } from "./guard.server";

export const adminMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getAdminBearer } = await import("./admin-bearer");
    return next({ sendContext: { bearerToken: getAdminBearer() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { requireAdmin, throttleIp } = await import("./guard.server");
    throttleIp();
    const admin = await requireAdmin((context as { bearerToken?: string } | undefined)?.bearerToken);
    return next({ context: { admin, bearerToken: (context as { bearerToken?: string } | undefined)?.bearerToken } });
  });

export type AdminFnContext = { admin: AdminContext; bearerToken?: string };
