/**
 * Fix-scan ladder guard.
 *
 * Simulates the exact browser pipeline without a DOM: weaveHalftoneQr →
 * composite at the 512px preview bitmap (quiet zone + solid finders) →
 * jsQR decode at native size and at a 320px downscale (phone-camera margin).
 *
 * Guarantees the Fix-scan ladder always contains a candidate that survives
 * BOTH decodes — i.e. the button can actually fix a broken photo QR.
 */
import { after, describe, it } from "node:test";
import jsQR from "jsqr";
import { encode } from "uqr";
import { createServer } from "vite";

const PAYLOAD = "https://qrwho.vercel.app";
const PX = 512;

const vite = await createServer({
  server: { middlewareMode: true },
  plugins: [],
  appType: "custom",
});
const { weaveHalftoneQr, pickSubmodules } = await vite.ssrLoadModule("/src/lib/qr/art/halftone-qr.ts");

after(async () => {
  await vite.close();
});

const qr = encode(PAYLOAD, { ecc: "H", boostEcc: true, minVersion: 7, border: 0 });
const SIZE = qr.size;

/** Soft synthetic photo: big smooth gradient plus a few large blobs. */
function makePhoto(n, seed = 7) {
  const data = new Uint8ClampedArray(n * n * 4);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const h2rgb = (h) => {
    const f = (k) => {
      const t = Math.abs((h * 6 + k) % 6 - 3);
      return 255 * (0.3 + 0.5 * Math.max(0, 1 - Math.min(t, 4 - t, 1)));
    };
    return [f(0), f(8), f(4)];
  };
  const blobs = Array.from({ length: 6 }, () => ({
    x: rnd() * n,
    y: rnd() * n,
    r: (0.22 + rnd() * 0.3) * n,
    c: h2rgb(rnd()),
  }));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      let r = 190 + 40 * (x / n);
      let g = 170 + 40 * (y / n);
      let b = 150;
      for (const bl of blobs) {
        const d = Math.hypot(x - bl.x, y - bl.y) / bl.r;
        const w = Math.exp(-d * d * 2);
        r = r * (1 - w) + bl.c[0] * w;
        g = g * (1 - w) + bl.c[1] * w;
        b = b * (1 - w) + bl.c[2] * w;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function woven(kind, strength, contrast, dotScale, opacity, boost) {
  const sub = pickSubmodules(kind, strength, SIZE, boost);
  const pixels = makePhoto(SIZE * sub, 7 + sub * 13 + (kind === "halftone" ? 101 : 0));
  weaveHalftoneQr(pixels, qr, {
    sub,
    kind,
    contrast,
    strength,
    boost,
    dotScale,
    chroma: opacity,
    dither: "fs",
    fg: [18, 18, 18],
    bg: [244, 241, 234],
  });
  return pixels;
}

/** 512px bitmap: paper + nearest-blit weave body + standard solid finders. */
function compose(pixels, qz = 3) {
  const W = Math.sqrt(pixels.length / 4) | 0;
  const total = SIZE + qz * 2;
  const cell = PX / total;
  const origin = qz * cell;
  const body = SIZE * cell;
  const out = new Uint8ClampedArray(PX * PX * 4);
  const paper = [243, 238, 230];
  const dark = [18, 16, 14];
  const light = [245, 240, 230];
  const finderBit = (fx, fy, mx, my) => {
    const cx = Math.floor(mx - fx);
    const cy = Math.floor(my - fy);
    if (cx < 0 || cy < 0 || cx > 6 || cy > 6) return 0;
    if (cx === 0 || cx === 6 || cy === 0 || cy === 6) return 1;
    if (cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4) return 1;
    return 0;
  };
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      const o = (y * PX + x) * 4;
      const mx = (x - origin) / cell;
      const my = (y - origin) / cell;
      if (mx < 0 || my < 0 || mx >= SIZE || my >= SIZE) {
        out[o] = paper[0];
        out[o + 1] = paper[1];
        out[o + 2] = paper[2];
        out[o + 3] = 255;
        continue;
      }
      let ink;
      if (my < 8 && mx < 8) ink = finderBit(0, 0, mx, my) ? dark : light;
      else if (my < 8 && mx >= SIZE - 8) ink = finderBit(SIZE - 7, 0, mx, my) ? dark : light;
      else if (my >= SIZE - 8 && mx < 8) ink = finderBit(0, SIZE - 7, mx, my) ? dark : light;
      else {
        const sx = Math.min(W - 1, Math.floor(((x - origin) / body) * W));
        const sy = Math.min(W - 1, Math.floor(((y - origin) / body) * W));
        const i = (sy * W + sx) * 4;
        ink = [pixels[i], pixels[i + 1], pixels[i + 2]];
      }
      out[o] = ink[0];
      out[o + 1] = ink[1];
      out[o + 2] = ink[2];
      out[o + 3] = 255;
    }
  }
  return out;
}

function decode(data, px) {
  return jsQR(data, px, px, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function decodeScaled(data, px, size) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(px - 1, Math.floor(((x + 0.5) * px) / size));
      const sy = Math.min(px - 1, Math.floor(((y + 0.5) * px) / size));
      const i = (sy * px + sx) * 4;
      const o = (y * size + x) * 4;
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
      out[o + 3] = 255;
    }
  }
  return decode(out, size);
}

function strong(name, pixels) {
  const bitmap = compose(pixels);
  const native = decode(bitmap, PX);
  const small = decodeScaled(bitmap, PX, 320);
  const ok = native === PAYLOAD && small === PAYLOAD;
  console.log(`  ${name.padEnd(28)} native=${native ? "ok" : "FAIL"}  320=${small ? "ok" : "FAIL"}`);
  return ok;
}

// The same ladder the browser optimizer walks (photo mode).
const LADDER = {
  "default (0.5 / 0.84)": woven("photo", 0.5, 0.84, 0.68, 0.86, 0),
  "default + boost 0.7": woven("photo", 0.5, 0.84, 0.68, 0.86, 0.7),
  "c1 lock bits": woven("photo", 0.5, 0.92, 0.8, 0.86, 0),
  "c2 colors crushed": woven("photo", 0.5, 1, 0.8, 0.4, 0),
  "c3 heavy dots": woven("photo", 0.5, 1, 0.95, 0.4, 0),
  "c4 coarse weave": woven("photo", 0.22, 1, 0.95, 0.4, 0),
  "c5 newspaper ink": woven("halftone", 0.22, 1, 0.95, 0.6, 0),
};

describe("fix scan ladder", () => {
  it("always contains a candidate that survives 512px + 320px decodes", () => {
    const results = {};
    for (const [name, pixels] of Object.entries(LADDER)) results[name] = strong(name, pixels);
    const survivors = Object.entries(results).filter(([, ok]) => ok).map(([n]) => n);
    console.log(`  survivors: ${survivors.join(", ") || "none"}`);
    // The coarse weaves must survive — they are the ladder's guarantee.
    if (!results["c4 coarse weave"]) throw new Error("c4 coarse weave should always decode");
    if (!results["c5 newspaper ink"]) throw new Error("c5 newspaper ink should always decode");
    if (survivors.length === 0) throw new Error("ladder has no strong candidate");
  });
});
