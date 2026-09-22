/**
 * Unit tests for the pure CMS logic (password policy, lockout transitions,
 * catalog merge incl. hiding, upload validation). These run under
 * `node --test` with type stripping — keep everything they touch free of
 * runtime framework imports.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { assessPassword, assertStrongPassword, guardCheck, guardOnFail, LOCKOUT } from "./policy.ts";
import { mergeCatalog, adminCatalog, rowToPreset, newTemplateId } from "./catalog-merge.ts";
import { sniffImage, sanitizeFilename, isSafeImageUrl, parseUpload, MAX_MEDIA_BYTES } from "./media-format.ts";
import { seoKeyForPath, brandSchema, templateSaveSchema } from "./schemas.ts";
import type { Preset } from "../qr/types.ts";

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

  it("template save rejects unsafe art URLs but accepts media paths", () => {
    const ok = templateSaveSchema.safeParse({ name: "X", artUrl: "/api/media/med_x" });
    assert.equal(ok.success, true);
    const bad = templateSaveSchema.safeParse({ name: "X", artUrl: "javascript:alert(1)" });
    assert.equal(bad.success, false);
  });
});
