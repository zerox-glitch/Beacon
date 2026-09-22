/**
 * Admin panel API — every mutation in the CMS goes through here.
 *
 * Security model:
 *  - There is NO public /api/auth/* surface in this app; Better Auth is only
 *    reachable through these server functions, so the panel's sign-in/setup can
 *    never be hit directly by strangers. Account creation is additionally
 *    gated on `cms_admin` being EMPTY — an atomic first-come claim.
 *  - Everything except getSetupStatus / adminSignIn / adminSetup / adminMe is
 *    wrapped in `adminMiddleware` (session + membership + same-site + origin +
 *    per-IP throttle).
 *  - Password policy enforced server-side (src/lib/cms/policy.ts).
 *  - Failed sign-ins: per-IP throttle (in-process) + per-account lockout
 *    (admin_login_guard — survives restarts when a real DB is configured).
 *  - Every mutation writes an audit row (actor, action, target, ip, UA).
 *
 * Session transport: HttpOnly `__Host-` cookie first-party; sign-in also
 * returns the raw Better-Auth session token so the preview-iframe client can
 * replay it as `Authorization: Bearer` (partitioned cookies — the same pattern
 * as src/lib/auth/client.ts).
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminMiddleware } from "./admin-middleware";
import { assertStrongPassword, guardCheck, guardOnFail } from "./policy";
import {
  brandSchema,
  changePasswordSchema,
  contentSchema,
  mediaUploadSchema,
  seoSchema,
  setupSchema,
  signInSchema,
  templateSaveSchema,
  categoryDocSchema,
} from "./schemas";

/* ------------------------------ shared plumbing ----------------------------- */

/** Passthrough validator for whole-document endpoints (docs are zod-parsed
 *  again inside the store — the single authoritative validation point). */
const anyDoc = (v: unknown): unknown => v;

const idSchema = z.object({ id: z.string().trim().min(1).max(80) });

/** better-auth >= 1.6 returns the session token at the TOP level of the
 *  sign-in / sign-up API response (`{ token, user, redirect, url }`). */
type SignInResult = { token?: string; user?: { id?: string; email?: string } } | null;

async function reqHeadersFor(bearer?: string): Promise<Headers> {
  const request = getRequest();
  const headers = new Headers(request?.headers ?? undefined);
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return headers;
}

function reqMeta(): { ip: string | null; userAgent: string | null } {
  const request = getRequest();
  return {
    ip: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request?.headers.get("user-agent") ?? null,
  };
}

function adminOf(context: unknown): { userId: string; name: string; email: string } {
  const c = context as { admin?: { userId: string; name: string; email: string } };
  if (!c?.admin) throw new Error("Admin session required");
  return c.admin;
}

/* -------------------------------- bootstrap --------------------------------- */

export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const store = await import("./store.server");
  await store.tryEnvSeedAdmin();
  const exists = await store.adminExists();
  return { setupAvailable: !exists };
});

/** Attaches the preview bearer token on the client without requiring a
 *  session server-side — used by `adminMe` so a signed-out probe still works. */
const bearerOnly = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getAdminBearer } = await import("./admin-bearer");
    return next({ sendContext: { bearerToken: getAdminBearer() ?? undefined } });
  })
  .server(async ({ next }) => next());

/** Lightweight "who am I" — never throws; null when signed out / not admin. */
export const adminMe = createServerFn({ method: "GET" })
  .middleware([bearerOnly])
  .handler(async ({ context }) => {
    const { peekAdmin } = await import("./guard.server");
    const admin = await peekAdmin((context as { bearerToken?: string } | undefined)?.bearerToken);
    if (!admin) return null;
    const store = await import("./store.server");
    const info = await store.getAdmin();
    return {
      userId: admin.userId,
      name: admin.name,
      email: info?.email ?? admin.email,
      createdAt: info?.createdAt ?? null,
    };
  });

/* ------------------------------- sign-in flow ------------------------------- */

const GENERIC_SIGNIN_FAILURE = "Invalid email or password";
export const LOCKOUT_MESSAGE_PREFIX = "TOO_MANY_ATTEMPTS:";

async function signInFailure(guardKey: string, message: string): Promise<never> {
  const store = await import("./store.server");
  const row = await store.readGuard(guardKey);
  const next = guardOnFail(row, Date.now());
  await store.writeGuard(guardKey, next);
  await store.audit(null, "admin.signin.failed", guardKey, undefined, reqMeta());
  if (next.lockedUntil) {
    throw new Error(`${LOCKOUT_MESSAGE_PREFIX}${Math.ceil((next.lockedUntil - Date.now()) / 1000)}`);
  }
  throw new Error(message);
}

export const adminSignIn = createServerFn({ method: "POST" })
  .validator(signInSchema)
  .handler(async ({ data }) => {
    const store = await import("./store.server");
    const { throttleIp } = await import("./guard.server");
    throttleIp();

    const guardKey = `acct:${data.email}`;
    const guard = await store.readGuard(guardKey);
    const check = guardCheck(guard, Date.now());
    if (check.verdict === "lockout") {
      throw new Error(`${LOCKOUT_MESSAGE_PREFIX}${check.retryAfterSec}`);
    }

    const { auth } = await import("../auth/server");
    let result: SignInResult;
    try {
      result = (await auth.api.signInEmail({
        body: { email: data.email, password: data.password },
        headers: await reqHeadersFor(),
      })) as unknown as SignInResult;
    } catch {
      return signInFailure(guardKey, GENERIC_SIGNIN_FAILURE);
    }
    const userId = result?.user?.id;
    if (!userId) return signInFailure(guardKey, GENERIC_SIGNIN_FAILURE);

    // Password was right — but the account must ALSO be the claimed admin.
    const admin = await store.findAdminByUserId(userId);
    if (!admin) {
      try {
        await auth.api.signOut({ headers: await reqHeadersFor() });
      } catch {
        /* best effort */
      }
      throw new Error("This account is not an admin of this site");
    }

    await store.clearGuard(guardKey);
    await store.audit(userId, "admin.signin", userId, undefined, reqMeta(), admin.name);
    return { token: result?.token ?? null, name: admin.name, email: admin.email };
  });

export const adminSignOut = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const admin = adminOf(context);
    const { auth } = await import("../auth/server");
    try {
      await auth.api.signOut({ headers: await reqHeadersFor((context as { bearerToken?: string }).bearerToken) });
    } finally {
      const store = await import("./store.server");
      await store.audit(admin.userId, "admin.signout", admin.userId, undefined, reqMeta(), admin.name);
    }
    return { ok: true as const };
  });

/* ------------------------------- first-run setup ------------------------------ */

async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export const adminSetup = createServerFn({ method: "POST" })
  .validator(setupSchema)
  .handler(async ({ data }) => {
    const store = await import("./store.server");
    const { throttleIp } = await import("./guard.server");
    const { assertSameSiteRequest } = await import("../auth/isolation.server");
    assertSameSiteRequest();
    throttleIp();

    const requiredKey = process.env.ADMIN_SETUP_KEY?.trim();
    if (requiredKey) {
      const ok = await timingSafeCompare(String(data.setupKey ?? ""), requiredKey);
      if (!ok) throw new Error("Setup key does not match the ADMIN_SETUP_KEY environment variable");
    }
    if (await store.adminExists()) {
      throw new Error("The admin panel has already been set up — sign in instead");
    }
    assertStrongPassword(data.password, [data.adminName, data.email.split("@")[0] ?? ""]);

    const { auth } = await import("../auth/server");
    let result: SignInResult;
    try {
      result = (await auth.api.signUpEmail({
        body: { name: data.adminName, email: data.email, password: data.password },
        headers: await reqHeadersFor(),
      })) as unknown as SignInResult;
    } catch (err) {
      throw new Error(`Could not create the admin account: ${(err as Error)?.message ?? "unknown error"}`);
    }
    const userId = result?.user?.id;
    if (!userId) throw new Error("Could not create the admin account");

    try {
      await store.claimAdmin(userId, data.adminName);
    } catch (err) {
      // Lost the race — do not leave a session for a non-admin account around.
      try {
        await auth.api.signOut({ headers: await reqHeadersFor() });
      } catch {
        /* best effort */
      }
      throw err;
    }
    await store.audit(userId, "admin.setup", userId, { email: data.email }, reqMeta(), data.adminName);
    store.invalidateCmsCache();
    return { token: result?.token ?? null, name: data.adminName };
  });

/* --------------------------------- settings --------------------------------- */

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const store = await import("./store.server");
    const [brand, content, seo, templates, categories, admin, media] = await Promise.all([
      store.getBrand(),
      store.getContent(),
      store.getSeo(),
      store.listTemplateRows(true),
      store.getCategories(),
      store.getAdmin(),
      store.listMedia(),
    ]);
    const { dbSource } = await import("../db");
    return { brand, content, seo, templates, categories, admin, media, meta: { dbSource } };
  });

export const saveBrandDoc = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(brandSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const brand = await store.saveBrand(data, admin.userId);
    await store.audit(admin.userId, "settings.brand", "brand", undefined, reqMeta(), admin.name);
    return brand;
  });

export const saveContentDoc = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(contentSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const content = await store.saveContent(data, admin.userId);
    await store.audit(admin.userId, "settings.content", "content", undefined, reqMeta(), admin.name);
    return content;
  });

export const saveSeoDoc = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(seoSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const seo = await store.saveSeo(data, admin.userId);
    await store.audit(admin.userId, "settings.seo", "seo", undefined, reqMeta(), admin.name);
    return seo;
  });

/* ------------------------------ category layer ------------------------------- */

/** Persist gallery category renames/order. No template rows are touched: the
 * map is applied at merge time, so built-ins participate and every change is
 * undoable by clearing its mapping. */
export const saveCategories = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(categoryDocSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const saved = await store.saveCategories(data, admin.userId);
    await store.audit(
      admin.userId,
      "settings.categories",
      "categories",
      { renames: Object.keys(data.renames ?? {}).length, order: (data.order ?? []).length },
      reqMeta(),
      admin.name,
    );
    return saved;
  });

/* -------------------------------- templates ---------------------------------- */

const templateFlagsSchema = z.object({
  id: z.string().trim().min(1).max(80),
  hidden: z.boolean().optional(),
  featured: z.boolean().optional(),
  sort: z.number().int().min(-1000).max(1000).optional(),
  /** Studio default (singleton — setting one clears the rest; false clears). */
  defaultTemplate: z.boolean().optional(),
});

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(templateSaveSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const id = data.id ?? data.overrideId;
    if (!id) throw new Error("Template id required");
    const isCustom = id.startsWith("cms-");
    if (isCustom && !data.name?.trim()) throw new Error("Custom templates need a name");
    // The editor saves the whole row — carry over the default pin so styling
    // changes never silently un-set it.
    const before = await store.listTemplateRows(true);
    const existing = before.find((r) => r.id === id);
    if (data.hidden && existing?.isDefault) throw new Error("Unpin it as studio default before hiding — or hide it from the list");
    await store.upsertTemplate(
      {
        id,
        isCustom,
        name: data.name,
        category: data.category,
        blurb: data.blurb,
        artUrl: data.artUrl || undefined,
        style: data.style as Record<string, unknown>,
        featured: data.featured,
        hidden: data.hidden,
        sort: data.sort,
        imageCompatible: data.imageCompatible ?? null,
        isDefault: existing?.isDefault ?? false,
      },
      admin.userId,
    );
    await store.audit(
      admin.userId,
      isCustom ? "template.save" : "template.override",
      id,
      { name: data.name, hidden: data.hidden },
      reqMeta(),
      admin.name,
    );
    store.invalidateCmsCache();
    return { ok: true as const, id };
  });

export const setTemplateFlags = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(templateFlagsSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const rows = await store.listTemplateRows(true);
    const existing = rows.find((r) => r.id === data.id);
    await store.upsertTemplate(
      {
        id: data.id,
        isCustom: existing?.isCustom ?? data.id.startsWith("cms-"),
        name: existing?.name ?? undefined,
        category: existing?.category ?? undefined,
        blurb: existing?.blurb ?? undefined,
        artUrl: existing?.artUrl ?? undefined,
        style: (existing?.style ?? undefined) as Record<string, unknown> | undefined,
        featured: data.featured ?? existing?.featured ?? undefined,
        hidden: data.hidden ?? existing?.hidden ?? false,
        sort: data.sort ?? existing?.sort ?? 0,
        imageCompatible: existing?.imageCompatible ?? null,
        isDefault: existing?.isDefault ?? false,
      },
      admin.userId,
    );
    if (data.defaultTemplate !== undefined) {
      // Runs after the flag upsert: validates visibility and keeps the
      // is_default singleton intact.
      await store.setDefaultTemplate(data.defaultTemplate ? data.id : null, admin.userId);
    }
    await store.audit(admin.userId, "template.flags", data.id, { hidden: data.hidden, featured: data.featured, sort: data.sort, defaultTemplate: data.defaultTemplate }, reqMeta(), admin.name);
    store.invalidateCmsCache();
    return { ok: true as const };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(idSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    await store.deleteTemplate(data.id, admin.userId);
    await store.audit(admin.userId, "template.deleted", data.id, undefined, reqMeta(), admin.name);
    store.invalidateCmsCache();
    return { ok: true as const };
  });

/* ---------------------------------- media ----------------------------------- */

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(mediaUploadSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const row = await store.uploadMedia(
      { dataBase64: data.dataBase64, filename: data.filename, kind: data.kind, alt: data.alt },
      admin.userId,
    );
    store.invalidateCmsCache();
    return row;
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(idSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    await store.deleteMedia(data.id, admin.userId);
    store.invalidateCmsCache();
    return { ok: true as const };
  });

/* -------------------------------- security ----------------------------------- */

export const adminChangePassword = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(changePasswordSchema)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    assertStrongPassword(data.newPassword, [admin.name, admin.email.split("@")[0] ?? ""]);
    const { auth } = await import("../auth/server");
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
        headers: await reqHeadersFor((context as { bearerToken?: string }).bearerToken),
      });
    } catch {
      throw new Error("Password change failed — check the current password");
    }
    await store.clearGuard(`acct:${admin.email.toLowerCase()}`);
    await store.audit(admin.userId, "admin.password_change", admin.userId, undefined, reqMeta(), admin.name);
    return { ok: true as const };
  });

export const adminRename = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ name: z.string().trim().min(2).max(60) }))
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    await store.renameAdmin(admin.userId, data.name, admin.userId);
    return { ok: true as const, name: data.name };
  });

export const adminRevokeSessions = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    await store.revokeAllSessions(admin.userId, admin.userId);
    return { ok: true as const };
  });

export const adminResetLoginGuard = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    await store.clearGuard(`acct:${admin.email.toLowerCase()}`);
    await store.audit(admin.userId, "admin.guard_reset", admin.email, undefined, reqMeta());
    return { ok: true as const };
  });

export const adminAuditList = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const store = await import("./store.server");
    return store.recentAudit(100);
  });

/* ----------------------------- export / import ------------------------------- */

export const adminExportData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const store = await import("./store.server");
    const [brand, content, seo, templates] = await Promise.all([
      store.getBrand(),
      store.getContent(),
      store.getSeo(),
      store.listTemplateRows(true),
    ]);
    return {
      kind: "qrwho-cms-export" as const,
      version: 1,
      exportedAt: new Date().toISOString(),
      brand,
      content,
      seo,
      templates,
    };
  });

export const adminImportData = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(anyDoc)
  .handler(async ({ data, context }) => {
    const store = await import("./store.server");
    const admin = adminOf(context);
    const doc = data as {
      kind?: string;
      brand?: unknown;
      content?: unknown;
      seo?: unknown;
      templates?: unknown;
    };
    if (doc?.kind !== "qrwho-cms-export") throw new Error("Not a QRWho CMS export file");
    let applied = 0;
    if (doc.brand) {
      await store.saveBrand(doc.brand, admin.userId);
      applied += 1;
    }
    if (doc.content) {
      await store.saveContent(doc.content, admin.userId);
      applied += 1;
    }
    if (doc.seo) {
      await store.saveSeo(doc.seo, admin.userId);
      applied += 1;
    }
    if (Array.isArray(doc.templates)) {
      for (const row of doc.templates.slice(0, 500)) {
        const parsed = row as Record<string, unknown>;
        const id = typeof parsed.id === "string" ? parsed.id : "";
        if (!id) continue;
        const isCustom = id.startsWith("cms-");
        await store.upsertTemplate(
          {
            id,
            isCustom,
            name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : undefined,
            category: typeof parsed.category === "string" ? parsed.category.slice(0, 40) : undefined,
            blurb: typeof parsed.blurb === "string" ? parsed.blurb.slice(0, 240) : undefined,
            artUrl: typeof parsed.artUrl === "string" ? parsed.artUrl.slice(0, 400) : undefined,
            style: (parsed.style ?? undefined) as Record<string, unknown> | undefined,
            featured: typeof parsed.featured === "boolean" ? parsed.featured : undefined,
            hidden: typeof parsed.hidden === "boolean" ? parsed.hidden : false,
            sort: typeof parsed.sort === "number" ? Math.max(-1000, Math.min(1000, Math.trunc(parsed.sort))) : 0,
          },
          admin.userId,
        );
        applied += 1;
      }
    }
    await store.audit(admin.userId, "cms.import", undefined, { applied }, reqMeta(), admin.name);
    store.invalidateCmsCache();
    return { ok: true as const, applied };
  });
