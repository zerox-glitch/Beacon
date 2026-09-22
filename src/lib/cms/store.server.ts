/**
 * CMS server store — the ONLY module that touches the cms_* / qr_templates /
 * admin tables. Server-only (`.server.ts`): the bundler refuses client imports.
 *
 * Reads are TTL-cached per process (public bundle) and invalidated on writes,
 * so the pages stay snappy and multi-instance Neon deploys converge within the
 * TTL. Writes are parameterized SQL; every mutating entrypoint takes an actor
 * and appends an audit row.
 */
import { getSql } from "../db";
import {
  brandSchema,
  SEO_FALLBACK_TITLE,
  SEO_FALLBACK_DESCRIPTION,
  SEO_FALLBACK_KEYWORDS,
  contentSchema,
  DEFAULT_BRAND,
  DEFAULT_CONTENT,
  DEFAULT_SEO,
  seoSchema,
  settingsDocSchemas,
  seoKeyForPath,
  type BrandDoc,
  type ContentDoc,
  type SeoDoc,
  categoryDocSchema,
  DEFAULT_CATEGORIES,
} from "./schemas";
import { encodeBase64, MEDIA_KINDS, parseUpload, sanitizeFilename, type MediaKind } from "./media-format";
import type { TemplateRow } from "./catalog-merge";

/* ------------------------------ value plumbing ------------------------------ */

/** jsonb arrives parsed from pg but as text from PGLite — normalize both. */
function parseJsonb<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

/** bytea arrives as Buffer (pg) or Uint8Array (PGLite). */
export function toBytes(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (typeof v === "string" && v.startsWith("\\x")) {
    const hex = v.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  return new Uint8Array();
}

/** Buffer for the pg path (it stringifies raw Uint8Array as an array). */
function toParamBytes(bytes: Uint8Array): Uint8Array {
  if (typeof Buffer !== "undefined" && !Buffer.isBuffer(bytes)) {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) as unknown as Uint8Array;
  }
  return bytes;
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/* -------------------------------- TTL cache -------------------------------- */

const TTL_MS = 4_000;
let bundleCache: { at: number; data: PublicBundle } | null = null;

export function invalidateCmsCache(): void {
  bundleCache = null;
}

async function readSetting<T>(key: string, schema: { parse: (v: unknown) => T }, fallback: T): Promise<T> {
  const sql = await getSql();
  const rows = await sql<{ value: unknown }>`select value from cms_settings where key = ${key}`;
  if (!rows.length) return fallback;
  try {
    return schema.parse(parseJsonb(rows[0]!.value, {}));
  } catch {
    return fallback;
  }
}

async function writeSetting(key: keyof typeof settingsDocSchemas, value: unknown, actor: string): Promise<void> {
  const schema = settingsDocSchemas[key];
  const parsed = schema.parse(value);
  const sql = await getSql();
  await sql.query(
    `insert into cms_settings (key, value, updated_at, updated_by)
     values ($1, $2::jsonb, now(), $3)
     on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [key, JSON.stringify(parsed), actor],
  );
  invalidateCmsCache();
}

export async function getBrand(): Promise<BrandDoc> {
  return readSetting("brand", brandSchema, DEFAULT_BRAND);
}
export async function getContent(): Promise<ContentDoc> {
  return readSetting("content", contentSchema, DEFAULT_CONTENT);
}
export async function getSeo(): Promise<SeoDoc> {
  return readSetting("seo", seoSchema, DEFAULT_SEO);
}
export async function saveBrand(doc: unknown, actor: string): Promise<BrandDoc> {
  await writeSetting("brand", doc, actor);
  return getBrand();
}
export async function saveContent(doc: unknown, actor: string): Promise<ContentDoc> {
  await writeSetting("content", doc, actor);
  return getContent();
}
export async function saveSeo(doc: unknown, actor: string): Promise<SeoDoc> {
  await writeSetting("seo", doc, actor);
  return getSeo();
}

export async function getCategories(): Promise<import("./schemas").CategoryDoc> {
  return readSetting("categories", categoryDocSchema, DEFAULT_CATEGORIES);
}
export async function saveCategories(doc: unknown, actor: string): Promise<import("./schemas").CategoryDoc> {
  await writeSetting("categories", doc, actor);
  invalidateCmsCache();
  return getCategories();
}

/* ------------------------------ templates table ----------------------------- */

function rowFromDb(r: {
  id: string; name: string | null; category: string | null; blurb: string | null;
  art_url: string | null; style: unknown; featured: boolean | null; hidden: boolean;
  sort: number; is_custom: boolean; image_compatible?: boolean | null; is_default?: boolean | null;
}): TemplateRow & { updatedAt: string } {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    blurb: r.blurb,
    artUrl: r.art_url,
    style: parseJsonb<Partial<import("../qr/types").QrStyle> | null>(r.style, null),
    featured: r.featured,
    hidden: r.hidden,
    sort: r.sort,
    isCustom: r.is_custom,
    imageCompatible: r.image_compatible ?? null,
    isDefault: r.is_default === true,
    updatedAt: toIso(r.id), // replaced below when caller selects updated_at
  };
}

export async function listTemplateRows(includeHidden: boolean): Promise<Array<TemplateRow & { updatedAt: string }>> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string; name: string | null; category: string | null; blurb: string | null;
    art_url: string | null; style: unknown; featured: boolean | null; hidden: boolean;
    sort: number; is_custom: boolean; updated_at: unknown;
  }>(includeHidden
    ? `select * from qr_templates order by sort asc, id asc`
    : `select * from qr_templates where hidden = false order by sort asc, id asc`);
  return rows.map((r) => ({
    ...rowFromDb(r),
    updatedAt: toIso(r.updated_at),
  }));
}

export interface TemplateSaveRow {
  id: string;
  isCustom: boolean;
  name?: string;
  category?: string;
  blurb?: string;
  artUrl?: string;
  style?: Record<string, unknown>;
  featured?: boolean;
  hidden?: boolean;
  sort?: number;
  imageCompatible?: boolean | null;
  isDefault?: boolean;
}

export async function upsertTemplate(input: TemplateSaveRow, actor: string): Promise<void> {
  const sql = await getSql();
  if (input.isCustom) {
    await sql.query(
      `insert into qr_templates
         (id, name, category, blurb, art_url, style, featured, hidden, sort, is_custom, image_compatible, is_default, updated_at, updated_by)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,true,$11,$12,now(),$10)
       on conflict (id) do update set
         name=excluded.name, category=excluded.category, blurb=excluded.blurb,
         art_url=excluded.art_url, style=excluded.style, featured=excluded.featured,
         hidden=excluded.hidden, sort=excluded.sort,
         image_compatible=excluded.image_compatible, is_default=excluded.is_default,
         updated_at=now(), updated_by=excluded.updated_by`,
      [
        input.id,
        input.name ?? "Untitled template",
        input.category ?? "Custom",
        input.blurb ?? null,
        input.artUrl || null,
        JSON.stringify(input.style ?? {}),
        input.featured ?? false,
        input.hidden ?? false,
        input.sort ?? 0,
        actor,
        input.imageCompatible ?? null,
        input.isDefault ?? false,
      ],
    );
    invalidateCmsCache();
    return;
  }
  // Override row for a built-in: only the changed flags are stored.
  await sql.query(
    `insert into qr_templates
       (id, name, category, blurb, art_url, style, featured, hidden, sort, is_custom, image_compatible, is_default, updated_at, updated_by)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,false,$11,$12,now(),$10)
     on conflict (id) do update set
       name=excluded.name, category=excluded.category, blurb=excluded.blurb,
       art_url=excluded.art_url, style=excluded.style, featured=excluded.featured,
       hidden=excluded.hidden, sort=excluded.sort,
       image_compatible=excluded.image_compatible, is_default=excluded.is_default,
       updated_at=now(), updated_by=excluded.updated_by`,
    [
      input.id,
      input.name ?? null,
      input.category ?? null,
      input.blurb ?? null,
      input.artUrl || null,
      JSON.stringify(input.style ?? null),
      input.featured ?? null,
      input.hidden ?? false,
      input.sort ?? 0,
      actor,
      input.imageCompatible ?? null,
      input.isDefault ?? false,
    ],
  );
  invalidateCmsCache();
}

/**
 * Studio default: exactly one VISIBLE template may carry is_default. Setting a
 * new default clears the old one atomically; `null` simply removes the default
 * (the studio then opens on the stock style). Built-ins get a minimal override
 * row so the pin survives without restyling anything.
 */
export async function setDefaultTemplate(id: string | null, actor: string): Promise<void> {
  const sql = await getSql();
  await sql`update qr_templates set is_default = false where is_default = true`;
  if (id) {
    const existing = await sql.query<{ id: string; hidden: boolean }>(
      "select id, hidden from qr_templates where id = $1",
      [id],
    );
    if (existing.length) {
      if (existing[0]!.hidden) throw new Error("A hidden template cannot be the studio default — unhide it first");
      await sql.query(
        "update qr_templates set is_default = true, updated_at = now(), updated_by = $2 where id = $1",
        [id, actor],
      );
    } else {
      await sql.query(
        `insert into qr_templates (id, is_custom, is_default, hidden, sort)
         values ($1, false, true, false, 0)
         on conflict (id) do update set is_default = true, updated_at = now(), updated_by = $2`,
        [id, actor],
      );
    }
  }
  invalidateCmsCache();
}

export async function deleteTemplate(id: string, actor: string): Promise<void> {
  const sql = await getSql();
  if (!id.startsWith("cms-")) {
    // Built-in: "delete" means drop the override row (back to stock).
    await sql`delete from qr_templates where id = ${id} and is_custom = false`;
  } else {
    await sql`delete from qr_templates where id = ${id} and is_custom = true`;
  }
  invalidateCmsCache();
  await audit(actor, "template.delete", id);
}

/* ---------------------------------- media ----------------------------------- */

import type { MediaRow } from "./store-contract";
export type { MediaRow };

export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

function newMediaId(): string {
  const rnd =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `med_${rnd}`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Node 22 always has webcrypto; this branch is a hard-to-hit safety net.
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(bytes).digest("hex");
}

export async function uploadMedia(input: {
  dataBase64: string;
  filename: string;
  kind: string;
  alt?: string;
}, actor: string): Promise<MediaRow> {
  const { bytes, detected } = parseUpload(input.dataBase64);
  const kind = (MEDIA_KINDS as readonly string[]).includes(input.kind) ? (input.kind as MediaKind) : "image";
  const id = newMediaId();
  const filename = sanitizeFilename(input.filename, detected.ext);
  const sha = await sha256Hex(bytes);
  const sql = await getSql();
  await sql.query(
    `insert into cms_media (id, kind, filename, content_type, size_bytes, sha256, bytes, alt, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, kind, filename, detected.contentType, bytes.length, sha, toParamBytes(bytes), input.alt ?? null, actor],
  );
  invalidateCmsCache();
  await audit(actor, "media.upload", id, { filename, bytes: bytes.length, kind });
  return {
    id, kind, filename, contentType: detected.contentType, sizeBytes: bytes.length,
    sha256: sha, alt: input.alt ?? null, url: mediaUrl(id), createdAt: new Date().toISOString(),
  };
}

export async function listMedia(): Promise<MediaRow[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string; kind: string; filename: string; content_type: string; size_bytes: number;
    sha256: string; alt: string | null; created_at: unknown;
  }>`select id, kind, filename, content_type, size_bytes, sha256, alt, created_at
      from cms_media order by created_at desc limit 200`;
  return rows.map((r) => ({
    id: r.id,
    kind: (MEDIA_KINDS as readonly string[]).includes(r.kind) ? (r.kind as MediaKind) : "image",
    filename: r.filename,
    contentType: r.content_type,
    sizeBytes: Number(r.size_bytes ?? 0),
    sha256: r.sha256,
    alt: r.alt,
    url: mediaUrl(r.id),
    createdAt: toIso(r.created_at),
  }));
}

export async function getMediaBytes(id: string): Promise<{ bytes: Uint8Array; contentType: string; etag: string } | null> {
  if (!/^med_[a-z0-9_]{8,40}$/i.test(id)) return null;
  const sql = await getSql();
  const rows = await sql.query<{ bytes: unknown; content_type: string; sha256: string }>(
    "select bytes, content_type, sha256 from cms_media where id = $1",
    [id],
  );
  if (!rows.length) return null;
  return { bytes: toBytes(rows[0]!.bytes), contentType: rows[0]!.content_type, etag: rows[0]!.sha256 };
}

/** Find CMS references to a media id so deleting one never leaves a broken logo. */
export async function mediaReferences(id: string): Promise<string[]> {
  const url = mediaUrl(id);
  const refs: string[] = [];
  const sql = await getSql();
  const brand = await getBrand();
  if (brand.logoUrl === url) refs.push("brand logo");
  if (brand.faviconUrl === url) refs.push("favicon");
  const seo = await getSeo();
  const ogRefs = [seo.defaults.ogImageUrl, seo.pages.home.ogImageUrl, seo.pages.studio.ogImageUrl, seo.pages.lab.ogImageUrl];
  if (ogRefs.some((v) => v === url)) refs.push("share image (SEO)");
  const used = await sql.query<{ n: number | string }>(
    "select count(*)::int as n from qr_templates where art_url = $1",
    [url],
  );
  if (Number(used[0]?.n ?? 0) > 0) refs.push("QR template artwork");
  return refs;
}

export async function deleteMedia(id: string, actor: string): Promise<void> {
  const refs = await mediaReferences(id);
  if (refs.length) {
    throw new Error(`Still in use: ${refs.join(", ")}. Reassign it first.`);
  }
  const sql = await getSql();
  await sql`delete from cms_media where id = ${id}`;
  await audit(actor, "media.delete", id);
}

/* ---------------------------------- admin ----------------------------------- */

export interface AdminInfo {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export async function getAdmin(): Promise<AdminInfo | null> {
  const sql = await getSql();
  const rows = await sql.query<{ user_id: string; display_name: string; name: string; email: string; created_at: unknown }>(
    `select a.user_id, a.display_name, u."name", u."email", a.created_at
       from cms_admin a join "user" u on u."id" = a."user_id" limit 1`,
  );
  const r = rows[0];
  if (!r) return null;
  return { userId: r.user_id, name: r.display_name || r.name, email: r.email, createdAt: toIso(r.created_at) };
}

export async function adminExists(): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ n: number | string }>("select count(*)::int as n from cms_admin");
  return Number(rows[0]?.n ?? 0) > 0;
}

export async function findAdminByUserId(userId: string): Promise<AdminInfo | null> {
  const admin = await getAdmin();
  return admin && admin.userId === userId ? admin : null;
}

/**
 * Atomic first-run claim: the insert runs only while cms_admin is empty, so two
 * concurrent setup requests can't both win (primary key + the NOT EXISTS).
 * Throws when the claim raced and lost.
 */
export async function claimAdmin(userId: string, displayName: string): Promise<void> {
  const sql = await getSql();
  const inserted = await sql.query<{ user_id: string }>(
    `with ins as (
       insert into cms_admin (id, user_id, display_name)
       select 'primary', $1, $2
        where not exists (select 1 from cms_admin)
       returning user_id
     )
     select user_id from ins`,
    [userId, displayName],
  );
  if (!inserted.length || inserted[0]!.user_id !== userId) {
    throw new Error("Setup has already been completed");
  }
  invalidateCmsCache();
}

export async function renameAdmin(userId: string, displayName: string, actor: string): Promise<void> {
  const clean = String(displayName ?? "").trim().slice(0, 60);
  if (clean.length < 2) throw new Error("Admin name must be at least 2 characters");
  const sql = await getSql();
  await sql`update "user" set "name" = ${clean} where "id" = ${userId}`;
  await sql`update cms_admin set display_name = ${clean} where "user_id" = ${userId}`;
  await audit(actor, "admin.rename", userId, { name: clean });
}

export async function revokeAllSessions(userId: string, actor: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from "session" where "userId" = ${userId}`;
  invalidateCmsCache();
  await audit(actor, "admin.revoke_sessions", userId);
}

/* ------------------------------ login lockout -------------------------------- */

export async function readGuard(key: string): Promise<{ fails: number; firstFailAt: number; lockedUntil: number | null } | null> {
  const sql = await getSql();
  const rows = await sql.query<{ fails: number; first_fail_at: unknown; locked_until: unknown }>(
    "select fails, first_fail_at, locked_until from admin_login_guard where key = $1",
    [key],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    fails: Number(r.fails ?? 0),
    firstFailAt: new Date(toIso(r.first_fail_at)).getTime(),
    lockedUntil: r.locked_until == null ? null : new Date(toIso(r.locked_until)).getTime(),
  };
}

export async function writeGuard(
  key: string,
  state: { fails: number; firstFailAt: number; lockedUntil: number | null },
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into admin_login_guard (key, fails, first_fail_at, locked_until, updated_at)
     values ($1,$2,$3::timestamptz,$4::timestamptz,now())
     on conflict (key) do update set
       fails=excluded.fails, first_fail_at=excluded.first_fail_at,
       locked_until=excluded.locked_until, updated_at=now()`,
    [
      key,
      state.fails,
      new Date(state.firstFailAt).toISOString(),
      state.lockedUntil === null ? null : new Date(state.lockedUntil).toISOString(),
    ],
  );
}

export async function clearGuard(key: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from admin_login_guard where key = ${key}`;
}

/* -------------------------------- audit log ---------------------------------- */

export async function audit(
  actor: string | null,
  action: string,
  target?: string,
  meta?: Record<string, unknown>,
  req?: { ip?: string | null; userAgent?: string | null },
  actorName?: string,
): Promise<void> {
  try {
    const sql = await getSql();
    await sql.query(
      `insert into cms_audit_log (actor, actor_name, action, target, meta, ip, user_agent)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
      [actor, actorName ?? null, action.slice(0, 80), target?.slice(0, 120) ?? null, JSON.stringify(meta ?? {}), req?.ip?.slice(0, 80) ?? null, req?.userAgent?.slice(0, 240) ?? null],
    );
  } catch (err) {
    // Auditing must never break the mutation it documents.
    console.error("[cms] audit write failed:", (err as Error)?.message);
  }
}

export interface AuditEntry {
  id: number;
  ts: string;
  actor: string | null;
  actorName: string | null;
  action: string;
  target: string | null;
  ip: string | null;
}

export async function recentAudit(limit = 100): Promise<AuditEntry[]> {
  const n = Math.min(Math.max(Math.trunc(limit) || 50, 1), 200);
  const sql = await getSql();
  const rows = await sql.query<{
    id: number | string; ts: unknown; actor: string | null; actor_name: string | null;
    action: string; target: string | null; ip: string | null;
  }>("select id, ts, actor, actor_name, action, target, ip from cms_audit_log order by id desc limit $1", [n]);
  return rows.map((r) => ({
    id: Number(r.id),
    ts: toIso(r.ts),
    actor: r.actor,
    actorName: r.actor_name,
    action: r.action,
    target: r.target,
    ip: r.ip,
  }));
}

/* ------------------------------ public bundle -------------------------------- */

import type { PageMeta, PublicBundle } from "./types";
export type { PageMeta, PublicBundle };

export async function getPublicBundle(): Promise<PublicBundle> {
  const now = Date.now();
  if (bundleCache && now - bundleCache.at < TTL_MS) return bundleCache.data;
  const [brand, content, seo, rows, categories] = await Promise.all([
    getBrand(),
    getContent(),
    getSeo(),
    listTemplateRows(false),
    getCategories(),
  ]);
  const defaultTemplate = rows.find((r) => r.isDefault === true)?.id ?? null;
  const data: PublicBundle = { brand, content, seo, templates: rows, categories, defaultTemplate };
  bundleCache = { at: now, data };
  return data;
}

/* ----------------------------- SEO head helpers ------------------------------ */

export function computePageMeta(seo: SeoDoc, brand: BrandDoc, pathname: string): PageMeta {
  const key = seoKeyForPath(pathname);
  const page = key ? seo.pages[key] : {};
  const base = seo.canonicalBaseUrl || "";
  const d = seo.defaults;
  const siteName = brand.siteName || "QRWho";
  const fallbackTitle = d.title?.trim() || SEO_FALLBACK_TITLE;
  const titled =
    page.title?.trim() ||
    (key && key !== "home" ? `${siteName} — ${fallbackTitle.split(" — ")[0] ?? fallbackTitle}` : fallbackTitle);
  const fallbackDesc = d.description?.trim() || SEO_FALLBACK_DESCRIPTION;
  return {
    title: titled,
    description: page.description?.trim() || fallbackDesc,
    keywords: page.keywords?.trim() || d.keywords?.trim() || SEO_FALLBACK_KEYWORDS,
    robots: page.robots?.trim() || (seo.indexSite ? "index, follow, max-image-preview:large, max-snippet:-1" : "noindex, nofollow"),
    ogTitle: page.ogTitle?.trim() || titled,
    ogDescription: page.ogDescription?.trim() || page.description?.trim() || fallbackDesc,
    ogImage: page.ogImageUrl?.trim() || d.ogImageUrl?.trim() || "/art-hero.jpg",
    canonical: base ? `${base}${pathname === "/" ? "/" : pathname}` : pathname,
    themeColor: brand.themeColor || "#0c0c0b",
    icon: brand.faviconUrl || "/logo.png",
    siteName: brand.siteName || "QRWho",
  };
}

/* ------------------------------- robots/sitemap ------------------------------ */

export async function robotsText(origin: string): Promise<string> {
  const seo = await getSeo();
  if (seo.robotsTxt?.trim()) return seo.robotsTxt.trim();
  const base = seo.canonicalBaseUrl || origin;
  if (!seo.indexSite) return "User-agent: *\nDisallow: /\n";
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${base}/sitemap.xml`].join("\n");
}

export async function sitemapXml(origin: string): Promise<string> {
  const [seo, settingsRows] = await Promise.all([
    getSeo(),
    (async () => {
      const sql = await getSql();
      return sql<{ key: string; updated_at: unknown }>`select key, updated_at from cms_settings`;
    })(),
  ]);
  const base = seo.canonicalBaseUrl || origin;
  const updatedAt = (() => {
    let max = 0;
    for (const r of settingsRows) max = Math.max(max, new Date(toIso(r.updated_at)).getTime());
    return max ? new Date(max).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  })();
  const paths =
    seo.sitemapPaths?.length
      ? seo.sitemapPaths
      : [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/studio", priority: "0.9", changefreq: "weekly" },
          { path: "/lab", priority: "0.6", changefreq: "monthly" },
        ];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const urls = paths
    .map((p) => {
      const loc = `${base}${p.path === "/" ? "/" : p.path}`;
      return [
        "  <url>",
        `    <loc>${esc(loc)}</loc>`,
        `    <lastmod>${updatedAt}</lastmod>`,
        p.changefreq ? `    <changefreq>${esc(p.changefreq)}</changefreq>` : "",
        p.priority ? `    <priority>${esc(p.priority)}</priority>` : "",
        "  </url>",
      ].filter(Boolean).join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/* ------------------------------ env bootstrap -------------------------------- */

/**
 * Optional zero-touch admin seed: if ADMIN_BOOTSTRAP_NAME / _EMAIL / _PASSWORD
 * are set and nobody has claimed the panel yet, claim it from the environment
 * (no HTTP form submission needed, works headlessly). Runs at most once per
 * process; fails safe when anything is missing.
 */
let envSeedAttempted = false;
export async function tryEnvSeedAdmin(): Promise<"exists" | "seeded" | "not-configured" | "failed"> {
  if (envSeedAttempted) return "exists";
  envSeedAttempted = true;
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!name || !email || !password) return "not-configured";
  try {
    if (await adminExists()) return "exists";
    const { auth } = await import("../auth/server");
    const res = await auth.api.signUpEmail({ body: { name, email, password } });
    const userId = (res as { user?: { id?: string } })?.user?.id;
    if (!userId) return "failed";
    await claimAdmin(userId, name);
    await audit(userId, "admin.setup", userId, { via: "env-bootstrap" }, undefined, name);
    return "seeded";
  } catch (err) {
    console.error("[cms] env admin bootstrap failed:", (err as Error)?.message);
    return "failed";
  }
}

export { encodeBase64 };
