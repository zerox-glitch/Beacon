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
const { weaveHalftoneQr } = await vite.ssrLoadModule("/src/lib/qr/art/halftone-qr.ts");
const { cellRole, isDark } = await vite.ssrLoadModule("/src/lib/qr/structure.ts");

after(async () => {
  await vite.close();
});

function encodeQr() {
  return encode(PAYLOAD, { ecc: "H", boostEcc: true, minVersion: 7, border: 0 });
}

function luma(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function fillGradient(pixels, n, invert = false) {
  for (let y = 0; y < n; y++) {
    const t = invert ? 1 - y / (n - 1) : y / (n - 1);
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

function fillToneRamp(pixels, n) {
  for (let y = 0; y < n; y++) {
    const v = Math.round(255 * (1 - y / (n - 1)));
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      pixels[i] = v;
      pixels[i + 1] = v;
      pixels[i + 2] = v;
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

function compose(qr, body, n, finders = {}, scale = 2) {
  const module = (n / qr.size) * scale;
  const qz = 3 * module;
  const w = Math.round(n * scale + qz * 2);
  const out = new Uint8ClampedArray(w * w * 4);
  out.fill(245);
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  const origin = Math.round(qz);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const s = (y * n + x) * 4;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const d = ((origin + y * scale + dy) * w + (origin + x * scale + dx)) * 4;
          out[d] = body[s];
          out[d + 1] = body[s + 1];
          out[d + 2] = body[s + 2];
          out[d + 3] = 255;
        }
      }
    }
  }
  const dark = finders.dark ?? [18, 18, 18];
  const light = finders.light ?? [240, 240, 240];
  paintFinder(out, w, origin, origin, module, dark, light);
  paintFinder(out, w, origin + (qr.size - 7) * module, origin, module, dark, light);
  paintFinder(out, w, origin, origin + (qr.size - 7) * module, module, dark, light);
  return { out, w };
}

function wovenBody(opts = {}) {
  const qr = encodeQr();
  const sub = opts.sub ?? 5;
  const n = qr.size * sub;
  const pixels = new Uint8ClampedArray(n * n * 4);
  fillGradient(pixels, n, opts.invert);
  weaveHalftoneQr(pixels, qr, {
    sub,
    kind: opts.kind ?? "photo",
    contrast: opts.contrast ?? 0.84,
    strength: opts.strength ?? 0.5,
    boost: opts.boost ?? 0,
    dotScale: opts.dotScale ?? 0.68,
    chroma: opts.chroma ?? 0.86,
    dither: opts.dither ?? "fs",
  });
  return { qr, n, sub, pixels };
}

function dataSurroundLuma(qr, pixels, n, sub, my0, my1) {
  const mid = (sub - 1) / 2;
  let s = 0;
  let c = 0;
  for (let my = my0; my < my1; my++) {
    for (let mx = 0; mx < qr.size; mx++) {
      if (cellRole(qr, mx, my) !== "data") continue;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          if (sx === mid && sy === mid) continue;
          const i = ((my * sub + sy) * n + (mx * sub + sx)) * 4;
          s += luma(pixels[i], pixels[i + 1], pixels[i + 2]);
          c++;
        }
      }
    }
  }
  return c ? s / c : 0;
}

describe("Chu halftone Photo QR", () => {
  it("jsQR recovers the payload from a 5×5 photo lattice", () => {
    const { qr, n, pixels } = wovenBody({ sub: 5, strength: 0.5, contrast: 0.84 });
    const { out, w } = compose(qr, pixels, n);
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });

  it("stays scannable at a more artistic strength", () => {
    const { qr, n, pixels } = wovenBody({
      sub: 5,
      strength: 0.7,
      contrast: 0.78,
      chroma: 1,
      dotScale: 0.62,
    });
    const { out, w } = compose(qr, pixels, n);
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });

  it("locks each data-module centroid to the QR bit", () => {
    const { qr, n, sub, pixels } = wovenBody({ sub: 5, contrast: 0.9, chroma: 0.4 });
    const mid = (sub - 1) / 2;
    let checked = 0;
    for (let my = 0; my < qr.size; my++) {
      for (let mx = 0; mx < qr.size; mx++) {
        const role = cellRole(qr, mx, my);
        if (role === "finder" || role === "separator") continue;
        const px = mx * sub + mid;
        const py = my * sub + mid;
        const i = (py * n + px) * 4;
        const L = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (isDark(qr, mx, my)) assert.ok(L < 0.42, `dark centroid luma ${L} at ${mx},${my}`);
        else assert.ok(L > 0.58, `light centroid luma ${L} at ${mx},${my}`);
        checked++;
      }
    }
    assert.ok(checked > 200);
  });

  it("image density follows the cover (sky brighter than ground)", () => {
    const qr = encodeQr();
    const sub = 5;
    const n = qr.size * sub;
    const pixels = new Uint8ClampedArray(n * n * 4);
    fillToneRamp(pixels, n);
    weaveHalftoneQr(pixels, qr, {
      sub,
      kind: "photo",
      contrast: 0.84,
      strength: 0.5,
      dotScale: 0.68,
      chroma: 0.86,
      dither: "fs",
    });
    const top = dataSurroundLuma(qr, pixels, n, sub, 9, 16);
    const bot = dataSurroundLuma(qr, pixels, n, sub, qr.size - 16, qr.size - 9);
    assert.ok(top > bot + 0.12, `expected sky ${top} >> ground ${bot}`);
  });

  it("different covers produce different compositions", () => {
    const a = wovenBody({ invert: false });
    const b = wovenBody({ invert: true });
    let changed = 0;
    for (let i = 0; i < a.pixels.length; i += 4) {
      if (
        Math.abs(a.pixels[i] - b.pixels[i]) +
          Math.abs(a.pixels[i + 1] - b.pixels[i + 1]) +
          Math.abs(a.pixels[i + 2] - b.pixels[i + 2]) >
        18
      ) {
        changed++;
      }
    }
    assert.ok(changed > a.n * a.n * 0.2, `expected many pixels to move, got ${changed}`);
  });

  it("contrast, fade and bit-lock change the weave", () => {
    const hi = wovenBody({ contrast: 1, chroma: 0.2, dotScale: 0.92 });
    const lo = wovenBody({ contrast: 0.4, chroma: 1, dotScale: 0.55 });
    let changed = 0;
    for (let i = 0; i < hi.pixels.length; i += 4) {
      if (
        Math.abs(hi.pixels[i] - lo.pixels[i]) +
          Math.abs(hi.pixels[i + 1] - lo.pixels[i + 1]) +
          Math.abs(hi.pixels[i + 2] - lo.pixels[i + 2]) >
        18
      ) {
        changed++;
      }
    }
    assert.ok(changed > hi.n * hi.n * 0.12, `expected many pixels to move, got ${changed}`);
  });

  it("scans with photo-tinted concentric finders", () => {
    const { qr, n, pixels } = wovenBody({ sub: 5 });
    const { out, w } = compose(qr, pixels, n, {
      dark: [22, 28, 36],
      light: [232, 226, 214],
    });
    const hit = jsQR(out, w, w, { inversionAttempts: "attemptBoth" });
    assert.equal(hit?.data, PAYLOAD);
  });
});
