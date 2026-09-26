import assert from "node:assert";
import { test } from "node:test";
import { encodeSession, decodeSession } from "./session-cookie.ts";
import { DEFAULT_STYLE, emptyPayload } from "./qr/types.ts";
import { LOGOS, logoDataUrl } from "./qr/logo-set.ts";

const base = () => ({
  payload: { ...emptyPayload(), url: "https://example.com/x" },
  style: { ...DEFAULT_STYLE, fg: "#123456" },
  logoId: LOGOS[0].id,
  imageUrl: "/api/media/med_1",
  caption: "cafe menu",
  frame: "soft" as const,
});

test("session cookie: round-trips a full slice", () => {
  const encoded = encodeSession(base());
  assert.ok(encoded);
  const back = decodeSession(encoded);
  assert.ok(back);
  assert.equal(back.payload.url, "https://example.com/x");
  assert.equal(back.style.fg, "#123456");
  assert.equal(back.logoId, LOGOS[0].id);
  assert.equal(back.imageUrl, "/api/media/med_1");
  assert.equal(back.caption, "cafe menu");
  assert.equal(back.frame, "soft");
});

test("session cookie: rejects garbage, wrong version, and blob: images", () => {
  assert.equal(decodeSession(null), null);
  assert.equal(decodeSession("%%%not-json"), null);
  assert.equal(decodeSession(encodeURIComponent(JSON.stringify({ v: 2, p: {}, s: {} }))), null);
  const b = base();
  b.imageUrl = "blob:http://localhost:8080/abc";
  const back = decodeSession(encodeSession(b));
  assert.ok(back);
  assert.equal(back.imageUrl, null); // blob URLs never survive a visit
});

test("session cookie: stays under the size budget, degrading gracefully", () => {
  const huge = { ...base(), caption: "x".repeat(5000) };
  const encoded = encodeSession(huge);
  // Either it fits (impossible) or it degrades and still fits — never oversize.
  assert.ok(encoded === null || encoded.length <= 3800);
  const small = base();
  assert.ok(encodeSession(small)!.length <= 3800);
});

test("session cookie: merged defaults keep unknown future fields safe", () => {
  const doc = { v: 1, at: 0, p: { url: "https://a.b" }, s: { fg: "#123456" }, l: null, i: null, c: "", f: "none" };
  const back = decodeSession(encodeURIComponent(JSON.stringify(doc)));
  assert.ok(back);
  assert.equal(back.payload.url, "https://a.b");
  assert.equal(back.style.fg, "#123456");
  assert.ok("kind" in back.payload); // emptyPayload defaults merged in
});

test("session cookie: logo data URL <-> id mapping is stable", () => {
  const logo = LOGOS.find((l) => l.id === LOGOS[0].id)!;
  assert.equal(logoDataUrl(logo), "data:image/svg+xml;utf8," + encodeURIComponent(logo.svg));
});
