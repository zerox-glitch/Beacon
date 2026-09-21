import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import jsQR from "jsqr";
import { encode } from "uqr";
import { createServer } from "vite";

const PAYLOAD = "https://qrwho.vercel.app";

const vite = await createServer({
  server: { middlewareMode: true },
  plugins: [],
  appType: "custom",
});
const { remapPhotoLuma } = await vite.ssrLoadModule("/src/lib/qr/art/photo-luma.ts");
const { lumaBias } = await vite.ssrLoadModule("/src/lib/qr/art/kernel.ts");

after(async () => {
  await vite.close();
});

function encodeQr() {
  return encode(PAYLOAD, { ecc: "H", boostEcc: true, minVersion: 7, border: 0 });
}

function fillGradient(pixels, n) {
  for (let y = 0; y < n; y++) {
    const t = y / (n - 1);
    const r = 118 + (210 - 118) * (1 - t);
    const g = 142 + (186 - 142) * (1 - t) * 0.7 + 72 * t;
    const b = 168 * (1 - t) + 58 * t;
    for (let x = 0; x < n; x++) {
      const wobble = ((x * 13 + y * 7) % 17) - 8;
      const i = (y * n + x) * 4;
      pixels[i] = Math.max(0, Math.min(255, r + wobble));
      pixels[i + 1] = Math.max(0, Math.min(255, g + wobble * 0.5));
      pixels[i + 2] = Math.max(0, Math.min(255, b - wobble * 0.3));
      pixels[i + 3] = 255;
    }
  }
}

function paintFinder(out, w, ox, oy, module, dark = [18, 18, 18], light = [240, 240, 240]) {
  const fill = (x, y, s, rgb) => {
    for (let py = y; py < y + s; py++) {
      for (let px = x; px < x + s; px++) {
        const i = (py * w + px) * 4;
        out[i] = rgb[0];
        out[i + 1] = rgb[1];
        out[i + 2] = rgb[2];
        out[i + 3] = 255;
      }
    }
  };
  fill(ox, oy, module * 7, dark);
  fill(ox + module, oy + module, module * 5, light);
  fill(ox + module * 2, oy + module * 2, module * 3, dark);
}

function compose(qr, body, n, finders = {}) {
  const module = n / qr.size;
  const qz = 3 * module;
  const w = Math.round(n + qz * 2);
  const out = new Uint8ClampedArray(w * w * 4);
  out.fill(245);
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  const origin = Math.round(qz);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const s = (y * n + x) * 4;
      const d = ((origin + y) * w + (origin + x)) * 4;
      out[d] = body[s];
      out[d + 1] = body[s + 1];
      out[d + 2] = body[s + 2];
      out[d + 3] = 255;
    }
  }
  const dark = finders.dark ?? [18, 18, 18];
  const light = finders.light ?? [240, 240, 240];
  paintFinder(out, w, origin, origin, module, dark, light);
  paintFinder(out, w, origin + (qr.size - 7) * module, origin, module, dark, light);
  paintFinder(out, w, origin, origin + (qr.size - 7) * module, module, dark, light);
  return { out, w };
}

function wovenBody(strength, contrast, fade, boost = 0) {
  const qr = encodeQr();
  const n = qr.size * 8;
  const pixels = new Uint8ClampedArray(n * n * 4);
  fillGradient(pixels, n);
  const cellPx = 480 / (qr.size + 6);
  const version = Math.max(1, Math.round((qr.size - 17) / 4));
  const bias = lumaBias({ strength, contrast, version, cellPx, quietZone: 3, boost });
  remapPhotoLuma(pixels, n, qr, bias, strength, contrast, fade);
  return { qr, n, pixels };
}

describe("Photo QR luminance weave", () => {
  it("jsQR recovers the payload from a full-bleed photo weave", () => {
    const { qr, n, pixels } = wovenBody(0.55, 0.82, 0.88);
    const { out, w } = compose(qr, pixels, n);
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });

  it("stays scannable at a more artistic strength", () => {
    const { qr, n, pixels } = wovenBody(0.72, 0.82, 0.96);
    const { out, w } = compose(qr, pixels, n);
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });

  it("scans with photo-tinted concentric finders", () => {
    const { qr, n, pixels } = wovenBody(0.55, 0.82, 0.88);
    const { out, w } = compose(qr, pixels, n, {
      dark: [22, 28, 36],
      light: [232, 226, 214],
    });
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });
});
