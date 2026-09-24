/**
 * Unit tests for the pure CMS logic (password policy, lockout transitions,
 * catalog merge incl. hiding, upload validation). These run under
 * `node --test` with type stripping — keep everything they touch free of
 * runtime framework imports.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { assessPassword, assertStrongPassword, guardCheck, guardOnFail, LOCKOUT } from "./policy.ts";
import type { Preset } from "../qr/types.ts";
import { mergeCatalog, adminCatalog, rowToPreset, newTemplateId, worksWithImages, resolveSamples } from "./catalog-merge.ts";
import { sniffImage, sanitizeFilename, isSafeImageUrl, parseUpload, MAX_MEDIA_BYTES } from "./media-format.ts";
import { seoKeyForPath, brandSchema, templateSaveSchema } from "./schemas.ts";

const preset = (id: string, over: Partial<Preset> = {}): Preset => ({
  id,
  name: id,
  category: "Classic",
  style: {
    moduleShape: "square",
    eyeShape: "square",
    ballShape: "square",
    fg: "#111111",
    bg: "#ffffff",
    eyeColor: "#111111",
    ballColor: "#111111",
    gradientType: "none",
    gradientTo: "#111111",
    quietZone: 2,
    moduleGap: 0,
    imageMode: "none",
    imageOpacity: 1,
    dotScale: 1,
    contrast: 0,
    logoScale: 0.3,
    minVersion: 1,
    ecc: "M",
    transparentBg: false,
    artisticStrength: 0.5,
    effect: "none",
    maskPattern: -1,
  },
  ...over,
});

/* ------------------------------- password policy ------------------------------ */

describe("assessPassword", () => {
  it("rejects short passwords", () => {
    const a = assessPassword("Sh0rt!pw");
    assert.equal(a.ok, false);
    assert.ok(a.issues.some((i) => i.toLowerCase().includes("12")));
  });

  it("rejects common passwords even when long", () => {
    assert.equal(assessPassword("password1234").ok, false);
    assert.equal(assessPassword("123456789012").ok, false);
  });

  it("rejects passwords containing the admin name or email", () => {
    const a = assessPassword("Correct-Horse-997-morgan", ["morgan"]);
    assert.equal(a.ok, false);
    assert.ok(a.issues.some((i) => /name or email/i.test(i)));
  });

  it("rejects 5+ repeated chars and keyboard runs", () => {
    assert.equal(assessPassword("aaaaabbbbbcccccdddd").ok, false); // runs
    assert.equal(assessPassword("xqwertyuiop9z").ok, false); // keyboard run
  });

  it("accepts a strong mixed password", () => {
    assert.equal(assessPassword("Tr0ub4dor&3xyz!k").ok, true);
  });

  it("accepts a long passphrase", () => {
    assert.equal(assessPassword("correct horse battery staple qr").ok, true);
  });

  it("assertStrongPassword throws with the first issue", () => {
    assert.throws(() => assertStrongPassword("weak"), /12 characters/);
    assert.doesNotThrow(() => assertStrongPassword("Tr0ub4dor&3xyz!k"));
  });
});

/* --------------------------------- lockouts --------------------------------- */

describe("login guard", () => {
  const now = 1_700_000_000_000;
  it("locks after maxFails inside the window", () => {
    let row = null as null | { fails: number; firstFailAt: number; lockedUntil: number | null };
    for (let i = 0; i < LOCKOUT.maxFails; i += 1) row = guardOnFail(row, now + i * 60_000);
    assert.equal(row!.fails, LOCKOUT.maxFails);
    assert.ok(row!.lockedUntil && row!.lockedUntil > now);
    const check = guardCheck(row, now + 1000);
    assert.equal(check.verdict, "lockout");
  });

  it("resets the window after expiry", () => {
    const first = guardOnFail({ fails: 4, firstFailAt: now - LOCKOUT.windowMs - 1, lockedUntil: null }, now);
    assert.equal(first.fails, 1);
    assert.equal(first.lockedUntil, null);
  });

  it("allows when not locked", () => {
    assert.equal(guardCheck(null, now).verdict, "allow");
    assert.equal(guardCheck({ fails: 2, firstFailAt: now, lockedUntil: now - 1 }, now).verdict, "allow");
  });
});

/* -------------------------------- catalog merge ------------------------------- */

describe("mergeCatalog", () => {
  const base = [preset("ink-cut"), preset("art-royal"), preset("gal-peony", { artUrl: "/samples/peony.jpg" })];

  it("keeps everything when there are no rows", () => {
    const r = mergeCatalog(base, []);
    assert.equal(r.presets.length, 3);
    assert.equal(r.hiddenIds.size, 0);
  });

  it("hides built-ins from the public view but keeps them for the admin view", () => {
    const rows = [{ id: "art-royal", name: null, category: null, blurb: null, artUrl: null, style: null, featured: null, hidden: true, sort: 0, isCustom: false }];
    const pub = mergeCatalog(base, rows);
    assert.deepEqual(pub.presets.map((p) => p.id), ["ink-cut", "gal-peony"]);
    const adm = adminCatalog(base, rows);
    const royal = adm.find((p) => p.id === "art-royal")!;
    assert.equal(royal.hidden, true);
    assert.equal(royal.isCustom, false);
  });

  it("renames via override rows and merges style partials", () => {
    const rows = [{ id: "ink-cut", name: "Midnight Cut", category: null, blurb: null, artUrl: null, style: { fg: "#abcdef" }, featured: true, hidden: false, sort: 0, isCustom: false }];
    const r = mergeCatalog(base, rows);
    const p = r.presets.find((x) => x.id === "ink-cut")!;
    assert.equal(p.name, "Midnight Cut");
    assert.equal(p.featured, true);
    assert.equal(p.style.fg, "#abcdef");
    assert.equal(p.style.bg, "#ffffff"); // untouched
  });

  it("inserts custom templates and sorts them", () => {
    const rows = [
      { id: "cms-b", name: "B", category: "Custom", blurb: null, artUrl: null, style: null, featured: null, hidden: false, sort: 1, isCustom: true },
      { id: "cms-a", name: "A", category: "Custom", blurb: null, artUrl: null, style: null, featured: null, hidden: false, sort: -5, isCustom: true },
    ];
    const r = mergeCatalog(base, rows);
    assert.equal(r.presets[0]!.id, "cms-a"); // negative sort => front
    assert.equal(r.presets.at(-1)!.id, "cms-b"); // positive => end
    assert.equal(r.presets.length, 5);
  });

  it("rowToPreset fills the stock style as base", () => {
    const p = rowToPreset({ id: "cms-x", name: "X", category: null, blurb: null, artUrl: null, style: { ecc: "H" }, featured: null, hidden: false, sort: 0, isCustom: true });
    assert.equal(p.style.ecc, "H");
    assert.equal(p.category, "Custom");
  });

  it("makes unique cms ids", () => {
    assert.match(newTemplateId(), /^cms-[a-z0-9]{6,}$/);
  });

  it("renames categories across built-ins AND customs without touching rows", () => {
    const rows = [
      { id: "cms-1", name: "Neon Thing", category: "Neon", blurb: null, artUrl: null, style: null, featured: null, hidden: false, sort: 0, isCustom: true },
    ];
    const r = mergeCatalog(base, rows, {
      categories: { renames: { Neon: "Lights", Classic: "Heritage" }, order: ["Lights", "Heritage"] },
    });
    assert.equal(r.presets.find((p) => p.id === "art-royal")!.category, "Heritage");
    assert.equal(r.presets.find((p) => p.id === "cms-1")!.category, "Lights");
    assert.deepEqual(r.categories, ["Lights", "Heritage"]); // admin order wins, then first-seen
    assert.ok(!r.categories.includes("Classic"));
    // The admin view renames too, so chips and rows agree.
    const adm = adminCatalog(base, rows, { categories: { renames: { Neon: "Lights" } } });
    assert.equal(adm.find((p) => p.id === "cms-1")!.category, "Lights");
  });

  it("derives photo compatibility from the image mode unless pinned", () => {
    assert.equal(worksWithImages({ style: { imageMode: "clean" as const } as never }), true);
    assert.equal(worksWithImages({ style: { imageMode: "none" } as never }), false);
    assert.equal(worksWithImages({ imageCompatible: false, style: { imageMode: "clean" as const } as never }), false);
    assert.equal(worksWithImages({ imageCompatible: true, style: { imageMode: "none" } as never }), true);
  });

  it("an override switching to a photo mode flips compat; isDefault surfaces in the admin view", () => {
    const rows = [
      { id: "ink-cut", name: null, category: null, blurb: null, artUrl: null, style: { imageMode: "clean" as const }, featured: null, hidden: false, sort: 0, isCustom: false, isDefault: true },
      { id: "cms-photo", name: "Pinned flat", category: "Photo", blurb: null, artUrl: null, style: { imageMode: "duotone" as const }, featured: null, hidden: false, sort: 0, isCustom: true, imageCompatible: false },
    ];
    const r = mergeCatalog(base, rows);
    assert.equal(r.presets.find((p) => p.id === "ink-cut")!.imageCompatible, true); // re-derived from the override
    const r2 = mergeCatalog(base, rows, { categories: undefined });
    assert.equal(r2.presets.find((p) => p.id === "cms-photo")!.imageCompatible, false); // pin beats derivation
    const adm = adminCatalog(base, rows);
    assert.equal(adm.find((p) => p.id === "ink-cut")!.isDefault, true);
    assert.equal(adm.find((p) => p.id === "ink-cut")!.imageCompatible, true);
    assert.equal(adm.find((p) => p.id === "art-royal")!.isDefault, false);
    // Rows without a DB override carry no explicit pin — the gallery derives
    // compatibility from the style at read time (worksWithImages above).
    assert.equal(adm.find((p) => p.id === "art-royal")!.imageCompatible, undefined);
    assert.equal(worksWithImages(adm.find((p) => p.id === "art-royal")!), false);
  });

  it("resolveSamples: empty doc falls back to curated ids in order", () => {
    const presets = [
      { id: "a", name: "A", category: "Art", style: {} } as never,
      { id: "b", name: "B", category: "Art", style: {} } as never,
      { id: "c", name: "C", category: "Photo", style: {} } as never,
    ];
    const r = resolveSamples(null, presets, new Set(), { grid: ["b", "a", "c"], hero: ["a"] });
    assert.deepEqual(r.grid.map((e) => e.preset.id), ["b", "a", "c"]);
    assert.deepEqual(r.hero.map((e) => e.preset.id), ["a"]);
    assert.equal(r.grid[0]!.label, "B"); // label defaults to the template name
    assert.ok(r.grid[0]!.url.length > 0); // destination defaults to the sample URL
  });

  it("resolveSamples: admin order wins, overrides apply, unknown/hidden/dups skipped", () => {
    const presets = [
      { id: "a", name: "A", category: "Art", style: {} } as never,
      { id: "b", name: "B", category: "Art", style: {} } as never,
      { id: "c", name: "C", category: "Photo", style: {} } as never,
    ];
    const doc = {
      grid: [
        { presetId: "c", url: "https://menu.example" },
        { presetId: "ghost" },
        { presetId: "b" },
        { presetId: "c", label: "Menu" }, // dup collapses to the first
      ],
      hero: [{ presetId: "a", label: "  Neon  " }],
    };
    const r = resolveSamples(doc, presets, new Set(["a"]), { grid: ["a"], hero: ["a", "b"] });
    assert.deepEqual(r.grid.map((e) => e.preset.id), ["c", "b"]);
    assert.equal(r.grid[0]!.url, "https://menu.example");
    assert.equal(r.hero.length, 0); // a is hidden
    const r2 = resolveSamples(doc, presets, new Set(), { grid: ["a"], hero: ["a", "b"] });
    assert.equal(r2.hero[0]!.label, "Neon"); // label trimmed
  });

  it("resolveSamples: caps at 30 grid / 3 hero entries", () => {
    const presets = Array.from({ length: 32 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, category: "Art", style: {} })) as unknown as Preset[];
    const ids = presets.map((p) => p.id);
    const r = resolveSamples({ grid: ids.map((presetId) => ({ presetId })), hero: ids.map((presetId) => ({ presetId })) }, presets, new Set(), { grid: [], hero: [] });
    assert.equal(r.grid.length, 30);
    assert.equal(r.hero.length, 3);
  });

  it("ignores identity renames and orders listed tabs first", () => {
    const b = [preset("a", { category: "Zed" }), preset("b", { category: "Alpha" }), preset("c", { category: "Mid" })];
    const r = mergeCatalog(b, [], { categories: { renames: { Mid: "Mid" }, order: ["Mid"] } });
    assert.deepEqual(r.categories, ["Mid", "Zed", "Alpha"]);
  });
});

/* ------------------------------ upload validation ----------------------------- */

describe("media-format", () => {
  const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

  it("sniffs real types from magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52, 1, 2, 3]);
    assert.equal(sniffImage(png)?.contentType, "image/png");
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    assert.equal(sniffImage(jpg)?.contentType, "image/jpeg");
    const webp = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);
    assert.equal(sniffImage(webp)?.contentType, "image/webp");
  });

  it("rejects fakes (zip labeled as png, svg text)", () => {
    assert.equal(sniffImage(new TextEncoder().encode("PK\u0003\u0004 zip file disguised")), null);
    assert.equal(sniffImage(new TextEncoder().encode('<svg onload="alert(1)"></svg>')), null);
  });

  it("parseUpload rejects svg data URLs and oversized files, accepts real png", () => {
    assert.throws(() => parseUpload("data:image/svg+xml;base64,AAAA"), /SVG/);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52, 1, 2, 3]);
    assert.throws(() => parseUpload(b64(new Uint8Array(MAX_MEDIA_BYTES + 1).fill(1))) , /large|base64/);
    const ok = parseUpload(b64(png));
    assert.equal(ok.detected.contentType, "image/png");
  });

  it("sanitizes filenames", () => {
    assert.equal(sanitizeFilename("../../etc/pa ss!ng.png", "png"), "etcpa-ssng.png");
    assert.equal(sanitizeFilename("", "png"), "upload.png");
  });

  it("isSafeImageUrl gates the art URL", () => {
    assert.equal(isSafeImageUrl("/api/media/med_abc"), true);
    assert.equal(isSafeImageUrl("https://cdn.example.com/a.png"), true);
    assert.equal(isSafeImageUrl("javascript:alert(1)"), false);
    assert.equal(isSafeImageUrl("//evil.com/x.png"), false);
    assert.equal(isSafeImageUrl("data:image/png;base64,AA"), false);
  });
});

/* ----------------------------------- schemas ---------------------------------- */

describe("schemas", () => {
  it("seoKeyForPath maps known pages, null for others", () => {
    assert.equal(seoKeyForPath("/"), "home");
    assert.equal(seoKeyForPath("/studio"), "studio");
    assert.equal(seoKeyForPath("/lab"), "lab");
    assert.equal(seoKeyForPath("/admin"), null);
    assert.equal(seoKeyForPath("/studio/"), "studio");
  });

  it("brand schema defaults keep the pre-CMS look", () => {
    const b = brandSchema.parse({});
    assert.equal(b.siteName, "QRWho");
    assert.equal(b.logoUrl, "/logo.png");
    assert.equal(b.announcementEnabled, false);
  });

  it("brand schema: photo defaults = clean overlay house style", () => {
    const b = brandSchema.parse({});
    assert.deepEqual(b.photoDefaults, {
      imageMode: "clean",
      dotScale: 0.6,
      imageOpacity: 0.71,
      contrast: 1,
      quietZone: 2,
      minVersion: 6,
    });
    const custom = brandSchema.parse({
      photoDefaults: { imageMode: "duotone", dotScale: 0.8, imageOpacity: 0.5, contrast: 0.7, quietZone: 4, minVersion: 8 },
    });
    assert.equal(custom.photoDefaults.imageMode, "duotone");
    const bad = brandSchema.safeParse({ photoDefaults: { imageMode: "sparkles" } });
    assert.equal(bad.success, false);
  });

  it("brand schema: support popup is off by default, on with a tip link", () => {
    const b = brandSchema.parse({});
    assert.equal(b.kofiUrl, ""); // empty link = no post-download popup
    assert.ok(b.kofiMessage.length > 10);
    const withLink = brandSchema.parse({ kofiUrl: "https://ko-fi.com/qrwho" });
    assert.equal(withLink.kofiUrl, "https://ko-fi.com/qrwho");
    const bad = brandSchema.safeParse({ kofiUrl: "javascript:alert(1)" });
    assert.equal(bad.success, false); // no script: URLs in the brand doc
  });

  it("template save rejects unsafe art URLs but accepts media paths", () => {
    const ok = templateSaveSchema.safeParse({ name: "X", artUrl: "/api/media/med_x" });
    assert.equal(ok.success, true);
    const bad = templateSaveSchema.safeParse({ name: "X", artUrl: "javascript:alert(1)" });
    assert.equal(bad.success, false);
  });
});
