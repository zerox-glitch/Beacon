#!/usr/bin/env node
/**
 * Scan-verification harness for the Themes template posters.
 *
 * For a set of realistic payloads: encode with the app's encoder settings
 * (uqr, ecc H + boost, minVersion 6), composite poster + crisp modules the
 * way renderCleanPhotoQr does (via scripts/template-posters.py --qa), then
 * decode every composite with jsQR — the same library verifyQr uses. Any
 * template/payload pair that fails gets reported so its colours or layout
 * can be fixed BEFORE the preset ships.
 *
 * Run: node scripts/template-qa.mjs
 */
import { encode } from "uqr";
import jsQR from "jsqr";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sheets = path.join(root, "sheets");
const rawDir = path.join(sheets, "template-raw");
mkdirSync(sheets, { recursive: true });

const PAYLOADS = {
  url: "https://qrwho.vercel.app",
  long: "https://qrwho.vercel.app/studio?utm_source=instagram&utm_medium=social&utm_campaign=template_gallery_showcase_2026",
  wifi: "WIFI:T:WPA;S:MyHomeNetwork;P:SuperSecretPass123;H:false;;",
  vcard:
    "BEGIN:VCARD\nVERSION:3.0\nN:Khan;Ayesha\nFN:Ayesha Khan\nORG:Beacon Studio\nTITLE:Creative Director\nTEL:+92 300 1234567\nEMAIL:ayesha@beacon.studio\nURL:https://beacon.studio\nEND:VCARD",
};

const manifest = JSON.parse(readFileSync(path.join(root, "public/templates/manifest.json"), "utf8"));

// clear stale composites from previous/diagnostic runs
for (const f of readdirSync(rawDir)) unlinkSync(path.join(rawDir, f));

const results = [];
let fails = 0;

for (const [tag, text] of Object.entries(PAYLOADS)) {
  // mirror src/lib/qr/encode.ts for pictured styles (border: 0 is critical —
  // uqr's default border bakes a quiet ring into data and shifts the finders)
  const qr = encode(text, { ecc: "H", boostEcc: true, minVersion: 6, border: 0 });
  const matrix = {
    size: qr.size,
    data: Array.from({ length: qr.size }, (_, y) => Array.from(qr.data[y], (v) => (v ? 1 : 0))),
  };
  const jsonPath = path.join(sheets, "template-matrices.json");
  writeFileSync(jsonPath, JSON.stringify({ [tag]: matrix }));

  // one payload at a time keeps raw files small enough to stream through
  execFileSync("python3", [path.join(root, "scripts/template-posters.py"), "--qa", jsonPath], {
    stdio: "inherit",
    cwd: root,
  });

  for (const file of readdirSync(rawDir).filter((f) => f.endsWith(".raw"))) {
    const name = file.replace(/\.raw$/, "");
    const buf = readFileSync(path.join(rawDir, file));
    const rgba = new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength);
    const out = jsQR(rgba, 1024, 1024, { inversionAttempts: "attemptBoth" });
    const ok = Boolean(out && out.data === text);
    if (!ok) fails += 1;
    results.push({ template: name.split("--")[0], payload: tag, size: qr.size, ok });
    unlinkSync(path.join(rawDir, file));
  }
}

const byTemplate = new Map();
for (const r of results) {
  if (!byTemplate.has(r.template)) byTemplate.set(r.template, []);
  byTemplate.get(r.template).push(r);
}
console.log("\n=== TEMPLATE SCAN MATRIX (jsQR, ECC H) ===");
for (const [tpl, rows] of byTemplate) {
  const line = rows.map((r) => `${r.payload}:${r.ok ? "ok" : "FAIL"}`).join("  ");
  console.log(tpl.padEnd(14), line);
}
console.log(`\n${results.length - fails}/${results.length} template×payload pairs decode`);
if (fails) {
  console.log(`${fails} FAILURES — fix colours/layout before shipping`);
  process.exitCode = 1;
} else {
  console.log("all green");
}
