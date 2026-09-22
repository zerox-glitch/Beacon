/**
 * Zod schemas + defaults for every CMS document. Shared by the server API
 * (authoritative validation) and the admin forms (type inference + UX), so a
 * payload can never be valid in one place and invalid in the other.
 *
 * Defaults mirror the values that were hardcoded before the CMS existed
 * (brand in the studio header / landing, SEO in __root.tsx), so a fresh
 * install renders byte-for-byte what the public site rendered before.
 */
import { z } from "zod";
import { isSafeImageUrl } from "./media-format.ts";

const short = (max: number) => z.string().trim().max(max);
const urlish = z
  .string()
  .trim()
  .max(400)
  .refine((v) => v === "" || isSafeImageUrl(v), "Must be an http(s) URL or a same-site /path");

/* ---------------------------------- brand --------------------------------- */

export const brandSchema = z.object({
  siteName: short(60).default("QRWho"),
  tagline: short(160).default("Turn any picture into a working QR code."),
  logoUrl: urlish.default("/logo.png"),
  faviconUrl: urlish.default("/logo.png"),
  themeColor: short(16).default("#0c0c0b"),
  announcementEnabled: z.boolean().default(false),
  announcementText: short(200).default(""),
  announcementLink: urlish.default(""),
  footerNote: short(300).default(""),
});
export type BrandDoc = z.infer<typeof brandSchema>;

/* ---------------------------------- content --------------------------------- */

export const contentSchema = z.object({
  heroTitle: short(140).default(""),
  heroSubtitle: short(600).default(
    "Upload a photo, pick a style, download. The whole image becomes the code — every module still scans, nothing is cropped over, and nothing ever leaves your browser.",
  ),
  ctaPrimary: short(60).default("Open the studio"),
  ctaSecondary: short(60).default("See the gallery"),
  privacyLine: short(300).default(
    "100% on-device privacy — zero cloud uploads, zero watermarks, zero accounts.",
  ),
  heroWords: short(400).default("picture, Wi-Fi, menu, event, contact, link"),
});
export type ContentDoc = z.infer<typeof contentSchema>;

/* ------------------------------------ seo ----------------------------------- */

export const pageSeoSchema = z.object({
  title: short(180).optional(),
  description: short(400).optional(),
  keywords: short(600).optional(),
  robots: short(160).optional(),
  ogTitle: short(180).optional(),
  ogDescription: short(400).optional(),
  ogImageUrl: urlish.optional(),
});
export type PageSeo = z.infer<typeof pageSeoSchema>;

export const SEO_FALLBACK_TITLE =
  "QRWho — Free Artistic QR Code Generator | Custom AI QR Art, Logo, Menu, WiFi & vCard Maker (Vector SVG & PNG)";
export const SEO_FALLBACK_DESCRIPTION =
  "Create beautiful, custom artistic QR codes online for free. Photo blending, designer presets, vector SVG & 2048px PNG print export, 100% private and on-device with zero watermarks.";
export const SEO_FALLBACK_KEYWORDS =
  "free qr code generator, custom qr code art, artistic qr code maker, qr code with logo, restaurant menu qr code, wifi qr code generator, vcard qr code, photo qr code";

export const seoSchema = z.object({
  canonicalBaseUrl: z
    .string()
    .trim()
    .max(200)
    .default("https://qrwho.vercel.app")
    .refine(
      (v) => v === "" || /^https?:\/\/[^ ]+[^/]$/.test(v),
      "Must be an absolute http(s) origin without a trailing slash",
    ),
  indexSite: z.boolean().default(true),
  defaults: pageSeoSchema.default({}),
  pages: z
    .object({
      home: pageSeoSchema.default({}),
      studio: pageSeoSchema.default({}),
      lab: pageSeoSchema.default({}),
    })
    .default({ home: {}, studio: {}, lab: {} }),
  robotsTxt: z.string().trim().max(4000).optional(),
  sitemapPaths: z
    .array(z.object({ path: short(200), priority: short(8).optional(), changefreq: short(20).optional() }))
    .max(50)
    .optional(),
});
export type SeoDoc = z.infer<typeof seoSchema>;

/** The public path each SEO page key addresses. */
export const SEO_PAGE_PATHS: Record<keyof SeoDoc["pages"], string> = {
  home: "/",
  studio: "/studio",
  lab: "/lab",
};

/** Map a pathname to a page key, unknown/hidden paths return null. */
export function seoKeyForPath(pathname: string): "home" | "studio" | "lab" | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return "home";
  if (p === "/studio") return "studio";
  if (p === "/lab") return "lab";
  return null;
}

/* -------------------------------- templates --------------------------------- */

/** Hex color fields (`#rgb`, `#rrggbb`, `#rrggbbaa`). */
const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Must be a hex color like #1a2b3c");

const MODULE_SHAPES = [
  "square", "rounded", "dots", "diamond", "star", "plus", "classy", "leaf",
  "fluid", "hex", "heart", "squircle", "confetti", "dash", "cross", "diag",
  "radial", "bubbles", "hbar", "vbar",
] as const;
const EYE_SHAPES = [
  "square", "rounded", "circle", "leaf", "diamond", "extra-rounded", "classy",
  "hex", "target", "ticks",
] as const;
const IMAGE_MODES = [
  "none", "logo", "backdrop", "mosaic", "halftone", "paint", "duotone", "mono",
] as const;
const GRADIENTS = ["none", "linear", "radial", "diagonal", "image"] as const;
const EFFECTS = ["none", "shadow", "glow", "outline", "emboss", "extrude"] as const;
const ECC = ["L", "M", "Q", "H"] as const;

/** Admin-editable subset of QrStyle (everything the design panel exposes). */
export const templateStyleSchema = z
  .object({
    moduleShape: z.enum(MODULE_SHAPES).optional(),
    eyeShape: z.enum(EYE_SHAPES).optional(),
    ballShape: z.enum(EYE_SHAPES).optional(),
    fg: hexColor.optional(),
    bg: hexColor.optional(),
    eyeColor: hexColor.optional(),
    ballColor: hexColor.optional(),
    gradientType: z.enum(GRADIENTS).optional(),
    gradientTo: hexColor.optional(),
    accentColor: hexColor.optional(),
    quietZone: z.number().int().min(0).max(8).optional(),
    moduleGap: z.number().min(0).max(0.5).optional(),
    imageMode: z.enum(IMAGE_MODES).optional(),
    imageOpacity: z.number().min(0).max(1).optional(),
    dotScale: z.number().min(0.2).max(1).optional(),
    contrast: z.number().min(-1).max(1).optional(),
    logoScale: z.number().min(0.1).max(0.6).optional(),
    minVersion: z.number().int().min(1).max(10).optional(),
    ecc: z.enum(ECC).optional(),
    transparentBg: z.boolean().optional(),
    artisticStrength: z.number().min(0).max(1).optional(),
    effect: z.enum(EFFECTS).optional(),
    maskPattern: z.number().int().min(-1).max(7).optional(),
    accentShape: z.enum(MODULE_SHAPES).optional(),
    accentOnLight: z.boolean().optional(),
  })
  .partial();
export type TemplateStyleInput = z.infer<typeof templateStyleSchema>;

export const templateSaveSchema = z.object({
  id: z.string().trim().regex(/^cms-[a-z0-9-]{6,40}$/i).optional(),
  overrideId: short(80).optional(),
  name: short(80).min(1, "Name is required"),
  category: short(40).default("Custom"),
  blurb: short(240).optional(),
  artUrl: urlish.default(""),
  style: templateStyleSchema.default({}),
  featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  sort: z.number().int().min(-1000).max(1000).default(0),
});
export type TemplateSaveInput = z.infer<typeof templateSaveSchema>;

/* ---------------------------------- media ----------------------------------- */

export const mediaUploadSchema = z.object({
  filename: short(160).default("upload"),
  kind: z.enum(["logo", "og", "art", "image"]).default("image"),
  alt: short(200).optional(),
  dataBase64: z.string().min(16).max(6_000_000),
});
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;

/* ------------------------------- admin auth --------------------------------- */

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const setupSchema = z
  .object({
    adminName: short(60).min(2, "Admin name must be at least 2 characters"),
    email: z.string().trim().toLowerCase().email().max(200),
    password: z.string().min(1).max(200),
    confirm: z.string().min(1).max(200),
    setupKey: short(120).optional(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(1).max(200),
    confirm: z.string().min(1).max(200),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

/* -------------------------------- settings docs ------------------------------ */

export const settingsDocSchemas = {
  brand: brandSchema,
  content: contentSchema,
  seo: seoSchema,
} as const;
export type SettingsKey = keyof typeof settingsDocSchemas;

export const DEFAULT_BRAND: BrandDoc = brandSchema.parse({});
export const DEFAULT_CONTENT: ContentDoc = contentSchema.parse({});
export const DEFAULT_SEO: SeoDoc = seoSchema.parse({});
