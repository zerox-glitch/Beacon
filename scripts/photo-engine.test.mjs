/**
 * Photo QR engine unit tests (runs in plain `node --test`).
 *
 * Covers: luminance math, tone-field silhouette preservation, the raster
 * centre-sample guarantee, camera-sim sanity, fidelity ordering, and
 * candidate selection gates. Photo QR must never ship a bitmap whose module
 * centres disagree with the QR matrix — that invariant is asserted directly.
 */
import { register } from "node:module";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

register(new URL("./ts-resolve.mjs", import.meta.url).href);

const { setLuminance, luma, gaussBlur, jpegish, perspective, downscale, bilinearScale, nearestScale } = await import(
  "../src/lib/qr/photo/imaging.ts"
);
const { buildToneField } = await import("../src/lib/qr/photo/field.ts");
const { rasterizePhotoQr } = await import("../src/lib/qr/photo/raster.ts");
const { runCameraBattery, cameraVariants } = await import("../src/lib/qr/photo/camera-sim.ts");
const { photoFidelity } = await import("../src/lib/qr/photo/fidelity.ts");
const { selectBest, PHOTO_CANDIDATES, adaptToModuleScale, FIDELITY_FLOOR, ROBUSTNESS_GATE } = await import(
  "../src/lib/qr/photo/candidates.ts"
);
const { encode } = await import("uqr");
const { roleMaps, candidateParams } = await import("../src/lib/qr/photo/score.ts");

function flatBitmap(n, v) {
  return { data: new Uint8ClampedArray(n * n * 4).fill(v), w: n, h: n };
}

function gradientBitmap(n) {
  const d = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = Math.round(((x + y) / (2 * n)) * 255);
      const i = (y * n + x) * 4;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  return { data: d, w: n, h: n };
}

/** A dark circle on a light ground — the minimal "recognizable subject". */
function dotBitmap(n, r = n * 0.3) {
  const d = new Uint8ClampedArray(n * n * 4);
  const c = n / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inside = (x - c) ** 2 + (y - c) ** 2 < r * r;
      const v = inside ? 30 : 220;
      const i = (y * n + x) * 4;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  return { data: d, w: n, h: n };
}

function sampleMatrix(size) {
  const qr = encode("https://qrwho.example/photo-test", { ecc: "H", boostEcc: true, minVersion: 5, border: 0 });
  assert.equal(qr.size, size >= 33 ? size : qr.size);
  return qr;
}

describe("photo engine — imaging", () => {
  it("setLuminance hits the target luminance and keeps hue", () => {
    const [r, g, b] = setLuminance(200, 60, 40, 0.5);
    assert.ok(Math.abs(luma(r, g, b) - 0.5) < 0.01);
    assert.ok(r > g && g > b, "hue order preserved");
  });

  it("downscale averages away sub-pixel detail like a camera", () => {
    // alternating 1px stripes average to flat grey
    const n = 64;
    const d = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = x % 2 ? 20 : 230;
        const i = (y * n + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    const out = downscale({ data: d, w: n, h: n }, 8);
    const px = out.data;
    assert.ok(Math.abs(px[0] - 125) < 6, `expected ~125, got ${px[0]}`);
  });

  it("gaussBlur / jpegish / perspective preserve geometry (square bitmap stays square-ish)", () => {
    const bm = dotBitmap(64);
    const blurred = gaussBlur(bm, 1.2);
    const jpg = jpegish(blurred, 50);
    const per = perspective(jpg, 0.12);
    const small = bilinearScale(per, 32);
    const near = nearestScale(small, 16);
    assert.equal(near.w, 16);
    // centre still darker than corner after the whole chain
    const c = near.data[(8 * 16 + 8) * 4];
    const corner = near.data[0];
    assert.ok(c < corner, `centre ${c} should be darker than corner ${corner}`);
  });
});

describe("photo engine — tone field", () => {
  it("keeps the large silhouette: dark subject stays dark in the field", () => {
    const qr = sampleMatrix(37);
    const field = buildToneField(dotBitmap(256), qr.size, { detail: 0.2, normalize: 0.8 });
    const centre = Math.floor(qr.size / 2);
    const mid = field.tone[centre * qr.size + centre];
    const corner = field.tone[2 * qr.size + 2];
    assert.ok(mid < 0.45, `subject tone ${mid} should be dark`);
    assert.ok(corner > 0.55, `ground tone ${corner} should be bright`);
  });

  it("stretches low-contrast photos to use the tone range", () => {
    const qr = sampleMatrix(37);
    // low-frequency, low-contrast gradient (a washed-out photo) — the
    // percentile stretch must re-expand it; sub-module ripple is discarded
    // by design (§2: high frequency is sacrificed first).
    const n = 128;
    const d = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = 116 + ((x + y) / (2 * n)) * 20; // 116…136, slow gradient
        const i = (y * n + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    const flat = buildToneField({ data: d, w: n, h: n }, qr.size, { detail: 0, normalize: 0.8 });
    let mn = 1;
    let mx = 0;
    for (const t of flat.tone) {
      mn = Math.min(mn, t);
      mx = Math.max(mx, t);
    }
    assert.ok(mx - mn > 0.3, `low-contrast input should span tones after stretch (got ${mx - mn})`);
  });
});

describe("photo engine — rasterizer", () => {
  const qr = encode("https://qrwho.example/photo-test", { ecc: "H", boostEcc: true, minVersion: 5, border: 0 });
  const N = qr.size;
  const maps = roleMaps(qr);
  const bits = maps.bits;
  const prot = maps.isProtected;

  it("module centre matches the QR bit for EVERY data cell (decode-invariant)", () => {
    const field = buildToneField(gradientBitmap(256), N, { detail: 0.3, normalize: 0.8 });
    const { bitmap } = rasterizePhotoQr(field, {
      size: N,
      ss: 8,
      kernelMin: 0.53,
      kernelMax: 1.02,
      toneGain: 1.2,
      surroundPhoto: 0.66,
      darkT: 0.08,
      lightT: 0.92,
      chroma: 0.8,
      colorMode: "photo",
      fg: [18, 18, 18],
      bg: [244, 241, 234],
      duoDark: [30, 26, 20],
      duoLight: [236, 224, 200],
      bits,
      isProtected: prot,
    });
    const ss = 8;
    let checked = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const mi = y * N + x;
        if (prot[mi] === 1) continue;
        const cx = x * ss + ss / 2;
        const cy = y * ss + ss / 2;
        const i = (Math.floor(cy) * bitmap.w + Math.floor(cx)) * 4;
        const L = (0.2126 * bitmap.data[i] + 0.7152 * bitmap.data[i + 1] + 0.0722 * bitmap.data[i + 2]) / 255;
        const bit = bits[mi];
        assert.ok(bit === 1 ? L < 0.45 : L > 0.55, `module (${x},${y}) centre luma ${L.toFixed(2)} vs bit ${bit}`);
        checked++;
      }
    }
    assert.ok(checked > N * N * 0.5, `checked ${checked} data cells`);
  });

  it("protected cells are solid polarity (finders/alignment untouched by tone)", () => {
    const field = buildToneField(dotBitmap(256), N, { detail: 0, normalize: 0.8 });
    const { bitmap } = rasterizePhotoQr(field, {
      size: N,
      ss: 4,
      kernelMin: 0.53,
      kernelMax: 1.02,
      toneGain: 1.2,
      surroundPhoto: 0.66,
      darkT: 0.08,
      lightT: 0.92,
      chroma: 0.8,
      colorMode: "photo",
      fg: [18, 18, 18],
      bg: [244, 241, 234],
      duoDark: [30, 26, 20],
      duoLight: [236, 224, 200],
      bits,
      isProtected: prot,
    });
    const ss = 4;
    // finder island: ring dark, ball dark, separator ring (row/col 7) light
    for (const [mx, my, wantDark] of [
      [0, 0, 1],
      [3, 3, 1],
      [7, 3, 0], // separator column (light)
      [7, 7, 0], // separator corner (light)
    ]) {
      const i = (my * ss + ss / 2) * bitmap.w * 4 + (mx * ss + ss / 2) * 4;
      const L = (0.2126 * bitmap.data[i] + 0.7152 * bitmap.data[i + 1] + 0.0722 * bitmap.data[i + 2]) / 255;
      if (wantDark) assert.ok(L < 0.4, `finder (${mx},${my}) should be dark, got ${L.toFixed(2)}`);
      else assert.ok(L > 0.6, `separator (${mx},${my}) should be light, got ${L.toFixed(2)}`);
    }
  });
});

describe("photo engine — camera battery", () => {
  it("all variants run and the robust set passes on a plain QR", async () => {
    const variants = cameraVariants();
    assert.equal(variants.length, 13);
    const qr = encode("https://qrwho.example/battery", { ecc: "H", border: 2 });
    const n = qr.size + 4;
    const px = n * 8;
    const d = new Uint8ClampedArray(px * px * 4).fill(255);
    const cell = 8;
    for (let y = 0; y < qr.size; y++)
      for (let x = 0; x < qr.size; x++)
        if (qr.data[y][x])
          for (let dy = 0; dy < cell; dy++)
            for (let dx = 0; dx < cell; dx++) {
              const i = ((y + 2) * cell + dy) * px * 4 + ((x + 2) * cell + dx) * 4;
              d[i] = d[i + 1] = d[i + 2] = 10;
            }
    const decode = (bm) => {
      // lazy import to keep the top clean
      return null; // replaced below
    };
    const jsQR = (await import("jsqr")).default;
    const res = runCameraBattery(
      { data: d, w: px, h: px },
      (bm) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null,
      "https://qrwho.example/battery",
    );
    assert.ok(res.robustness > 0.9, `plain QR should be near-bulletproof, got ${res.robustness.toFixed(2)}`);
    assert.ok(res.cameraRobust);
  });
});

describe("photo engine — fidelity + selection", () => {
  it("fidelity: structure-preserving render beats a destroyed one", () => {
    const photo = dotBitmap(128, 40);
    const good = nearestScale(photo, 128); // identity-ish render
    const bad = flatBitmap(128, 128); // photo obliterated
    const fGood = photoFidelity(photo, good, 32, 1.6);
    const fBad = photoFidelity(photo, bad, 32, 1.6);
    assert.ok(fGood.score > fBad.score + 0.3);
    assert.ok(fGood.structure > 0.9);
  });

  it("selection prefers fidelity among eligible and refuses everything when gates fail", () => {
    const mk = (id, fidelity, robustness, cameraRobust) => ({
      id,
      fidelity: { score: fidelity, structure: fidelity, edges: fidelity, range: 1 },
      battery: { robustness, passed: new Set(), failed: new Set(), cameraRobust, firstFailure: null },
      combined: fidelity * robustness,
      eligible: cameraRobust && robustness >= ROBUSTNESS_GATE && fidelity >= FIDELITY_FLOOR,
    });
    const winner = selectBest([
      mk("balanced", 0.7, 0.9, true),
      mk("detail", 0.85, 0.85, true),
      mk("robust", 0.5, 0.99, true),
    ]);
    assert.equal(winner.id, "detail", "most detailed eligible candidate wins");
    assert.equal(selectBest([mk("balanced", 0.9, 0.3, false)]), null, "nothing eligible → null");
  });

  it("adaptToModuleScale hardens small-module renders (§14/§15)", () => {
    const base = PHOTO_CANDIDATES[0];
    const big = adaptToModuleScale(base, 16);
    const tiny = adaptToModuleScale(base, 4.5);
    assert.ok(tiny.kernelMin > big.kernelMin);
    assert.ok(tiny.detail < big.detail);
  });

  it("the Dot size slider actually moves the kernel floor (visible effect)", () => {
    const input = (dotScale) => ({
      mode: "photo",
      strength: 0.5,
      contrast: 0.84,
      dotScale,
      chroma: 0.86,
      boost: 0,
      viewPxPerModule: 10,
      modules: 37,
      fg: [20, 20, 20],
      bg: [240, 235, 220],
    });
    const small = candidateParams(PHOTO_CANDIDATES[2], input(0.55)).render;
    const large = candidateParams(PHOTO_CANDIDATES[2], input(0.96)).render;
    assert.ok(large.kernelMin - small.kernelMin > 0.1, `dotScale must have real travel, got ${(large.kernelMin - small.kernelMin).toFixed(3)}`);
    assert.ok(small.kernelMin >= 0.3, "never below the camera-survivable floor");
  });
});
