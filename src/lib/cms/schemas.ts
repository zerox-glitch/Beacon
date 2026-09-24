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
import { FRAME_IDS } from "../qr/frames.ts";
import { isSafeImageUrl } from "./media-format.ts";
import { DEFAULT_SAMPLE_URL, EYE_SHAPES, IMAGE_MODES, MODULE_SHAPES, QR_EFFECTS } from "../qr/types.ts";

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
  /** Tip/support link (Ko-fi, Buy Me a Coffee, GitHub Sponsors…). Empty = the
   * post-download support popup is disabled entirely. */
  kofiUrl: urlish.default(""),
  /** One-liner shown in the post-download support popup (editable in admin). */
  kofiMessage: short(200).default(
    "Enjoying QRWho? A coffee keeps it free, fast and watermark-free for everyone.",
  ),
  /**
   * The look every photo QR starts with the moment a picture is uploaded.
   * Editable in Admin → Branding → Photo defaults. Defaults = the owner's
   * house style: clean overlay, 60% dots, 71% photo color, full contrast.
   */
  /** Frames visitors may pick (Admin → Branding → Frames). "none" is always available. */
  enabledFrames: z.array(z.enum(FRAME_IDS)).default(FRAME_IDS.filter((f) => f !== "none")),
  photoDefaults: z
    .object({
      imageMode: z.enum(["paint", "clean", "mosaic", "halftone", "duotone", "mono"]).default("clean"),
      dotScale: z.number().min(0.5).max(1).default(0.6),
      imageOpacity: z.number().min(0.1).max(1).default(0.71),
      contrast: z.number().min(0.3).max(1).default(1),
      quietZone: z.number().int().min(2).max(6).default(2),
      minVersion: z.number().int().min(5).max(12).default(6),
      photoZoom: z.number().min(0.5).max(2).default(1),
    })
    .default({
      imageMode: "clean",
      dotScale: 0.6,
      imageOpacity: 0.71,
      contrast: 1,
      quietZone: 2,
      minVersion: 6,
      photoZoom: 1,
    }),
  /** "Surprise me" destinations (Admin → Branding). The studio's Surprise
   *  button picks one at random and loads it as the code. Empty list = the
   *  button falls back to drawing a random style preset. */
  surpriseCodes: z
    .array(
      z.object({
        kind: z.enum(["url", "phone", "sms", "whatsapp", "email", "text"]).default("url"),
        value: z.string().max(500).default(""),
        label: z.string().max(40).default(""),
      }),
    )
    .default([]),
});
export type BrandDoc = z.infer<typeof brandSchema>;
export type SurpriseCode = NonNullable<BrandDoc["surpriseCodes"]>[number];

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
  /** Shared fallbacks — every page inherits these unless it overrides. */
  defaults: pageSeoSchema.default({
    title: SEO_FALLBACK_TITLE,
    description: SEO_FALLBACK_DESCRIPTION,
    keywords: SEO_FALLBACK_KEYWORDS,
    ogTitle: "QRWho — Turn Anything Into a Beautiful, Scannable QR",
    ogDescription:
      "Free artistic QR code generator. Blend photos, drop 66 built-in center logos, pick from 300+ designer styles, verify scannability live, and export 2048px PNG + vector SVG — 100% in your browser.",
    ogImageUrl: "/og.jpg",
  }),
  pages: z
    .object({
      home: pageSeoSchema.default({
        title: SEO_FALLBACK_TITLE,
        description: SEO_FALLBACK_DESCRIPTION,
        keywords: SEO_FALLBACK_KEYWORDS,
        ogTitle: "QRWho — Free Artistic QR Code Generator (Photo, Logo, Wi-Fi, Menu, vCard)",
        ogDescription:
          "Every sample is a real, decoded QR. Photo blending, 66 center logos, 300+ styles, verified scan — free forever, zero watermarks, zero uploads.",
      }),
      studio: pageSeoSchema.default({
        title: "QR Studio — Design, Tune & Download Artistic QR Codes | QRWho",
        description:
          "Design custom QR codes online: 300+ artistic styles, photo QR blending, 66 built-in center logos (WhatsApp, Instagram, Wi-Fi, PayPal and more), real-time camera-grade scan verification, and 2048px PNG / vector SVG export. Free, private, 100% on-device.",
        keywords:
          "qr code studio, custom qr code maker, artistic qr code generator, qr code with logo, photo qr code, wifi qr code generator, restaurant menu qr, vcard qr code, free qr maker no watermark",
        ogTitle: "QR Studio — Design & Download Artistic QR Codes",
        ogDescription:
          "300+ designer styles, photo blending, 50 brand logos, live scan verification and print-ready PNG + SVG export — free and private.",
      }),
      lab: pageSeoSchema.default({
        title: "QR Art Lab — Experimental QR Art with a Scannability Meter | QRWho",
        description:
          "Push the pixels: the QR Art Lab explores halftone, mosaic and paint-fuse QR rendering with a live scannability meter, so even experimental art still reads on a phone camera.",
        keywords: "qr art, experimental qr code, halftone qr code, artistic barcode, qr art generator",
        ogTitle: "QR Art Lab — Experimental QR Art That Still Scans",
        ogDescription:
          "Halftone, mosaic and paint-fuse QR rendering with a live scannability meter — art first, camera-verified.",
      }),
    })
    .default({
      home: {
        title: SEO_FALLBACK_TITLE,
        description: SEO_FALLBACK_DESCRIPTION,
        keywords: SEO_FALLBACK_KEYWORDS,
        ogTitle: "QRWho — Free Artistic QR Code Generator (Photo, Logo, Wi-Fi, Menu, vCard)",
        ogDescription:
          "Every sample is a real, decoded QR. Photo blending, 66 center logos, 300+ styles, verified scan — free forever, zero watermarks, zero uploads.",
      },
      studio: {
        title: "QR Studio — Design, Tune & Download Artistic QR Codes | QRWho",
        description:
          "Design custom QR codes online: 300+ artistic styles, photo QR blending, 66 built-in center logos (WhatsApp, Instagram, Wi-Fi, PayPal and more), real-time camera-grade scan verification, and 2048px PNG / vector SVG export. Free, private, 100% on-device.",
        keywords:
          "qr code studio, custom qr code maker, artistic qr code generator, qr code with logo, photo qr code, wifi qr code generator, restaurant menu qr, vcard qr code, free qr maker no watermark",
        ogTitle: "QR Studio — Design & Download Artistic QR Codes",
        ogDescription:
          "300+ designer styles, photo blending, 50 brand logos, live scan verification and print-ready PNG + SVG export — free and private.",
      },
      lab: {
        title: "QR Art Lab — Experimental QR Art with a Scannability Meter | QRWho",
        description:
          "Push the pixels: the QR Art Lab explores halftone, mosaic and paint-fuse QR rendering with a live scannability meter, so even experimental art still reads on a phone camera.",
        keywords: "qr art, experimental qr code, halftone qr code, artistic barcode, qr art generator",
        ogTitle: "QR Art Lab — Experimental QR Art That Still Scans",
        ogDescription:
          "Halftone, mosaic and paint-fuse QR rendering with a live scannability meter — art first, camera-verified.",
      },
    }),
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

/** Enums are derived from the studio's own option tables (src/lib/qr/types.ts)
 * so the admin can never offer — or reject — a value the engine disagrees
 * with. The cast only proves non-emptiness to zod. */
const moduleShapeIds = MODULE_SHAPES.map((m) => m.id) as unknown as [string, ...string[]];
const eyeShapeIds = EYE_SHAPES.map((m) => m.id) as unknown as [string, ...string[]];
const imageModeIds = IMAGE_MODES.map((m) => m.id) as unknown as [string, ...string[]];
const effectIds = QR_EFFECTS.map((m) => m.id) as unknown as [string, ...string[]];
const GRADIENTS = ["none", "linear", "radial", "diagonal", "image"] as const;
const EFFECTS = z.enum(effectIds);
const ECC = ["L", "M", "Q", "H"] as const;

/** Admin-editable subset of QrStyle (everything the design panel exposes). */
export const templateStyleSchema = z
  .object({
    moduleShape: z.enum(moduleShapeIds).optional(),
    eyeShape: z.enum(eyeShapeIds).optional(),
    ballShape: z.enum(eyeShapeIds).optional(),
    fg: hexColor.optional(),
    bg: hexColor.optional(),
    eyeColor: hexColor.optional(),
    ballColor: hexColor.optional(),
    gradientType: z.enum(GRADIENTS).optional(),
    gradientTo: hexColor.optional(),
    accentColor: hexColor.optional(),
    quietZone: z.number().int().min(0).max(8).optional(),
    moduleGap: z.number().min(0).max(0.5).optional(),
    imageMode: z.enum(imageModeIds).optional(),
    imageOpacity: z.number().min(0).max(1).optional(),
    dotScale: z.number().min(0.2).max(1).optional(),
    contrast: z.number().min(-1).max(1).optional(),
    logoScale: z.number().min(0.1).max(0.6).optional(),
    minVersion: z.number().int().min(1).max(10).optional(),
    ecc: z.enum(ECC).optional(),
    transparentBg: z.boolean().optional(),
    artisticStrength: z.number().min(0).max(1).optional(),
    effect: EFFECTS.optional(),
    maskPattern: z.number().int().min(-1).max(7).optional(),
    accentShape: z.enum(moduleShapeIds).optional(),
    accentOnLight: z.boolean().optional(),
    /** Art-direction id (see src/lib/qr/art-directions.ts). Sets the whole
     * design system; the flat-style knobs above tune on top of it. */
    artDirection: short(60).optional(),
    artRelax: z.number().int().min(0).max(8).optional(),
    artCameraSafe: z.boolean().optional(),
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
  /** Pin photo compatibility; omitted = derive from the style's image mode. */
  imageCompatible: z.boolean().optional(),
});
export type TemplateSaveInput = z.infer<typeof templateSaveSchema>;

/* ------------------------------ template categories --------------------------- */

/**
 * The category layer is a rename/order map, not a table of rows: renaming a
 * category re-labels every template in it (built-ins included) without
 * editing a single template, and it can always be undone by clearing the
 * mapping. `order` is the public gallery tab order.
 */
export const categoryDocSchema = z.object({
  renames: z
    .record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(40))
    .refine((r) => Object.keys(r).length <= 100, "Too many renames")
    .default({}),
  order: z.array(short(40)).max(60).default([]),
});
export type CategoryDoc = z.infer<typeof categoryDocSchema>;

/* --------------------------------- samples ---------------------------------- */

/**
 * Landing-page sample configuration (the "gallery, decoded" grid + the hero
 * fan). Each entry points at a catalog template (built-in or cms-); the label
 * and destination are optional overrides. An EMPTY section means "use the
 * curated built-in list", so a fresh install is byte-identical to before this
 * document existed, and clearing a section always restores the defaults.
 */
export const sampleEntrySchema = z.object({
  /** Template id from the merged catalog (built-in id or `cms-…`). */
  presetId: z.string().trim().min(1).max(80),
  /** Card label override — defaults to the template's name. */
  label: short(60).optional(),
  /** Destination encoded into the sample's pixels. */
  url: z.string().trim().max(400).default(DEFAULT_SAMPLE_URL),
});
export type SampleEntry = z.infer<typeof sampleEntrySchema>;

export const samplesDocSchema = z.object({
  /** Landing grid order; the page shows the first 8. */
  grid: z.array(sampleEntrySchema).max(12).default([]),
  /** Hero fan order; the page shows the first 3. */
  hero: z.array(sampleEntrySchema).max(6).default([]),
});
export type SamplesDoc = z.infer<typeof samplesDocSchema>;

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
  categories: categoryDocSchema,
  samples: samplesDocSchema,
} as const;
export type SettingsKey = keyof typeof settingsDocSchemas;

export const DEFAULT_BRAND: BrandDoc = brandSchema.parse({});
export const DEFAULT_CONTENT: ContentDoc = contentSchema.parse({});
export const DEFAULT_SEO: SeoDoc = seoSchema.parse({});
export const DEFAULT_CATEGORIES: CategoryDoc = categoryDocSchema.parse({});
export const DEFAULT_SAMPLES: SamplesDoc = samplesDocSchema.parse({});
