/**
 * Deterministic image operations for the Photo QR engine.
 *
 * Everything here is pure math over typed arrays — no canvas, no DOM, no AI,
 * no network — so the exact same code runs in the browser renderer, in the
 * camera-stress simulator and in the node test harness.
 */

export interface Bitmap {
  data: Uint8ClampedArray; // RGBA
  w: number;
  h: number;
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

export function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Keep the hue of (r,g,b) but move its luma to `target` (0–1). */
export function setLuminance(r: number, g: number, b: number, target: number): [number, number, number] {
  const L = luma(r, g, b);
  const t = clamp(target, 0, 1);
  if (L < 0.0008) {
    const v = t * 255;
    return [v, v, v];
  }
  if (t <= L) {
    const k = t / L;
    return [r * k, g * k, b * k];
  }
  const k = (t - L) / (1 - L);
  return [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k];
}

/** Luma plane (0–1) of a bitmap. */
export function lumaPlane(bm: Bitmap): Float32Array {
  const out = new Float32Array(bm.w * bm.h);
  for (let i = 0, p = 0; p < out.length; p++, i += 4) {
    out[p] = luma(bm.data[i]!, bm.data[i + 1]!, bm.data[i + 2]!);
  }
  return out;
}

/**
 * Area-average downscale by a rational factor. This mirrors what a camera
 * ISP does when it binns the sensor frame — each output pixel is the mean of
 * the source footprint, so high-frequency detail averages away exactly like
 * it does on a phone.
 */
export function downscale(bm: Bitmap, factor: number): Bitmap {
  const f = Math.max(1, factor);
  const w = Math.max(1, Math.round(bm.w / f));
  const h = Math.max(1, Math.round(bm.h / f));
  const out = new Uint8ClampedArray(w * h * 4);
  const sx = bm.w / w;
  const sy = bm.h / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(bm.h, Math.max(y0 + 1, Math.floor((y + 1) * sy)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(bm.w, Math.max(x0 + 1, Math.floor((x + 1) * sx)));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * bm.w + xx) * 4;
          r += bm.data[i]!;
          g += bm.data[i + 1]!;
          b += bm.data[i + 2]!;
          n++;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** Separable Gaussian blur with a [0.5σ] clamp at the borders. */
export function gaussBlur(bm: Bitmap, sigma: number): Bitmap {
  const s = Math.max(0.25, sigma);
  const radius = Math.max(1, Math.ceil(s * 2.5));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * s * s));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] = (kernel[i] as number) / sum;

  const { w, h } = bm;
  const tmp = new Float32Array(w * h * 3);
  const src = bm.data;
  // horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = clamp(x + k, 0, w - 1);
        const i = (y * w + xx) * 4;
        const kv = kernel[k + radius]!;
        r += src[i]! * kv;
        g += src[i + 1]! * kv;
        b += src[i + 2]! * kv;
      }
      const o = (y * w + x) * 3;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
    }
  }
  // vertical
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = clamp(y + k, 0, h - 1);
        const o = (yy * w + x) * 3;
        const kv = kernel[k + radius]!;
        r += tmp[o]! * kv;
        g += tmp[o + 1]! * kv;
        b += tmp[o + 2]! * kv;
      }
      const i = (y * w + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** Compress contrast around mid grey (cameras in flat light do this). */
export function contrastReduce(bm: Bitmap, keep: number): Bitmap {
  const out = new Uint8ClampedArray(bm.data.length);
  for (let i = 0; i < bm.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = bm.data[i + c]! / 255;
      out[i + c] = (0.5 + (v - 0.5) * keep) * 255;
    }
    out[i + 3] = 255;
  }
  return { data: out, w: bm.w, h: bm.h };
}

/** Shift brightness by `delta` luma (-0.5..0.5). */
export function brightnessShift(bm: Bitmap, delta: number): Bitmap {
  const d = delta * 255;
  const out = new Uint8ClampedArray(bm.data.length);
  for (let i = 0; i < bm.data.length; i += 4) {
    out[i] = bm.data[i]! + d;
    out[i + 1] = bm.data[i + 1]! + d;
    out[i + 2] = bm.data[i + 2]! + d;
    out[i + 3] = 255;
  }
  return { data: out, w: bm.w, h: bm.h };
}

/** Bilinear sample of a bitmap (clamped edges). */
function sampleBilinear(bm: Bitmap, x: number, y: number, out: [number, number, number]) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  for (let c = 0; c < 3; c++) {
    const v00 = px(bm, x0, y0, c);
    const v10 = px(bm, x0 + 1, y0, c);
    const v01 = px(bm, x0, y0 + 1, c);
    const v11 = px(bm, x0 + 1, y0 + 1, c);
    out[c] = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
  }
}

function px(bm: Bitmap, x: number, y: number, c: number): number {
  const xx = clamp(x, 0, bm.w - 1);
  const yy = clamp(y, 0, bm.h - 1);
  return bm.data[(yy * bm.w + xx) * 4 + c]!;
}

/**
 * Mild perspective keystone, as when a phone photographs a code slightly
 * off-axis. `amount` (0..0.3) tilts the top edge — an off-axis phone view.
 * Bilinear resample, deterministic.
 */
export function perspective(bm: Bitmap, amount: number): Bitmap {
  const a = clamp(amount, 0, 0.3);
  const { w, h } = bm;
  // Destination corners: bottom edge stays, top edge shrinks and drops.
  const inset = (w * a * 0.5) / 2;
  const drop = h * a * 0.12;
  // Map source square (0,0)-(1,0)-(1,1)-(0,1) onto the distorted quad.
  const H = homographyFromQuad(
    [inset, drop], // TL
    [w - inset, drop], // TR
    [w, h], // BR
    [0, h], // BL
  );
  const out = new Uint8ClampedArray(w * h * 4);
  const s: [number, number, number] = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const den = H[6]! * u + H[7]! * v + 1;
      // H maps the unit square directly to pixel coordinates.
      const sxp = (H[0]! * u + H[1]! * v + H[2]!) / den;
      const syp = (H[3]! * u + H[4]! * v + H[5]!) / den;
      sampleBilinear(bm, sxp, syp, s);
      const i = (y * w + x) * 4;
      out[i] = s[0];
      out[i + 1] = s[1];
      out[i + 2] = s[2];
      out[i + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/**
 * 3×3 homography (h33 = 1) mapping unit-square coords (u,v) onto a quad.
 * Standard projective square→quad formula (Heckbert, Projective Mappings
 * for Image Warping) — exact for keystone quads, no linear solving.
 */
function homographyFromQuad(tl: number[], tr: number[], br: number[], bl: number[]): Float64Array {
  const dx1 = tr[0]! - br[0]!;
  const dx2 = bl[0]! - br[0]!;
  const dx3 = tl[0]! - tr[0]! + br[0]! - bl[0]!;
  const dy1 = tr[1]! - br[1]!;
  const dy2 = bl[1]! - br[1]!;
  const dy3 = tl[1]! - tr[1]! + br[1]! - bl[1]!;

  const den = dx1 * dy2 - dy1 * dx2;
  const g = (dx3 * dy2 - dy3 * dx2) / (den || 1e-12);
  const hh = (dx1 * dy3 - dy1 * dx3) / (den || 1e-12);

  const h11 = tr[0]! - tl[0]! + g * tr[0]!;
  const h12 = bl[0]! - tl[0]! + hh * bl[0]!;
  const h13 = tl[0]!;
  const h21 = tr[1]! - tl[1]! + g * tr[1]!;
  const h22 = bl[1]! - tl[1]! + hh * bl[1]!;
  const h23 = tl[1]!;
  return new Float64Array([h11, h12, h13, h21, h22, h23, g, hh]);
}

// ---------------------------------------------------------------------------
// JPEG-like compression: real 8×8 DCT with the standard luma/chroma tables.
// Approximates what a phone does to every camera frame before the decoder
// sees it. Deterministic, dependency-free.
// ---------------------------------------------------------------------------

const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10,
  17, 24, 32, 25, 18, 11, 4, 5,
  12, 19, 26, 33, 40, 48, 41, 34,
  27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36,
  29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46,
  53, 60, 61, 54, 47, 55, 62, 63,
];

const LUMA_Q = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

const CHROMA_Q = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
];

function quantTable(base: number[], quality: number): Float32Array {
  // libjpeg quality scaling
  const q = clamp(quality, 1, 100);
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  const t = new Float32Array(64);
  for (let i = 0; i < 64; i++) t[i] = Math.max(1, Math.floor((base[i]! * scale + 50) / 100));
  return t;
}

const COS = (() => {
  // Precomputed DCT-II basis: COS[u][x]
  const t: Float64Array[] = [];
  for (let u = 0; u < 8; u++) {
    const row = new Float64Array(8);
    for (let x = 0; x < 8; x++) row[x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
    t.push(row);
  }
  return t;
})();

/** Separable forward DCT (rows then columns) — 4× fewer multiplies. */
function fdct(block: Float32Array, out: Float32Array) {
  const tmp = new Float32Array(64);
  for (let y = 0; y < 8; y++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let x = 0; x < 8; x++) sum += block[y * 8 + x]! * COS[u]![x]!;
      const au = u === 0 ? Math.SQRT1_2 : 1;
      tmp[y * 8 + u] = 0.5 * au * sum;
    }
  }
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let y = 0; y < 8; y++) sum += tmp[y * 8 + u]! * COS[v]![y]!;
      const av = v === 0 ? Math.SQRT1_2 : 1;
      out[v * 8 + u] = 0.5 * av * sum;
    }
  }
}

/** Separable inverse DCT. */
function idct(coef: Float32Array, out: Float32Array) {
  const tmp = new Float32Array(64);
  for (let v = 0; v < 8; v++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let u = 0; u < 8; u++) sum += coef[v * 8 + u]! * COS[u]![x]! * (u === 0 ? Math.SQRT1_2 : 1);
      tmp[v * 8 + x] = 0.5 * sum;
    }
  }
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) sum += tmp[v * 8 + x]! * COS[v]![y]! * (v === 0 ? Math.SQRT1_2 : 1);
      out[y * 8 + x] = 0.5 * sum;
    }
  }
}

/**
 * JPEG-ish compression: convert to 4:2:0, forward DCT, quantize, inverse DCT.
 * `quality` 1–100 (libjpeg scale). Deterministic — no rounding surprises.
 */
export function jpegish(bm: Bitmap, quality: number): Bitmap {
  const { w, h } = bm;
  const padW = Math.ceil(w / 8) * 8;
  const padH = Math.ceil(h / 8) * 8;
  const Y = new Float32Array(padW * padH);
  const Cb = new Float32Array(padW * padH);
  const Cr = new Float32Array(padW * padH);
  for (let y = 0; y < padH; y++) {
    const yy = Math.min(y, h - 1);
    for (let x = 0; x < padW; x++) {
      const xx = Math.min(x, w - 1);
      const i = (yy * w + xx) * 4;
      const r = bm.data[i]!;
      const g = bm.data[i + 1]!;
      const b = bm.data[i + 2]!;
      const p = y * padW + x;
      Y[p] = 0.299 * r - 128 + 0.587 * g + 0.114 * b;
      Cb[p] = -0.168736 * r - 0.331264 * g + 0.5 * b;
      Cr[p] = 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
  }
  // 4:2:0 subsample chroma
  const cW = padW / 2;
  const cH = padH / 2;
  const CbS = new Float32Array(cW * cH);
  const CrS = new Float32Array(cW * cH);
  for (let y = 0; y < cH; y++) {
    for (let x = 0; x < cW; x++) {
      CbS[y * cW + x] = (Cb[2 * y * padW + 2 * x]! + Cb[2 * y * padW + 2 * x + 1]! + Cb[(2 * y + 1) * padW + 2 * x]! + Cb[(2 * y + 1) * padW + 2 * x + 1]!) / 4;
      CrS[y * cW + x] = (Cr[2 * y * padW + 2 * x]! + Cr[2 * y * padW + 2 * x + 1]! + Cr[(2 * y + 1) * padW + 2 * x]! + Cr[(2 * y + 1) * padW + 2 * x + 1]!) / 4;
    }
  }

  const qL = quantTable(LUMA_Q, quality);
  const qC = quantTable(CHROMA_Q, quality);
  const blk = new Float32Array(64);
  const coe = new Float32Array(64);
  const outBlk = new Float32Array(64);

  const compress = (plane: Float32Array, pw: number, ph: number, q: Float32Array): Float32Array => {
    const out = new Float32Array(pw * ph);
    for (let by = 0; by < ph; by += 8) {
      for (let bx = 0; bx < pw; bx += 8) {
        for (let i = 0; i < 64; i++) {
          const x = (i % 8) + bx;
          const y = Math.floor(i / 8) + by;
          blk[i] = plane[y * pw + x]!;
        }
        fdct(blk, coe);
        for (let i = 0; i < 64; i++) {
          const zz = ZIGZAG[i]!;
          coe[zz] = Math.round(coe[zz]! / q[zz]!) * q[zz]!;
        }
        idct(coe, outBlk);
        for (let i = 0; i < 64; i++) {
          const x = (i % 8) + bx;
          const y = Math.floor(i / 8) + by;
          out[y * pw + x] = outBlk[i]!;
        }
      }
    }
    return out;
  };

  const Yc = compress(Y, padW, padH, qL);
  const Cbc = compress(CbS, cW, cH, qC);
  const Crc = compress(CrS, cW, cH, qC);

  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const yp = y * padW + x;
      const cp = Math.floor(y / 2) * cW + Math.floor(x / 2);
      const yy = Yc[yp]! + 128;
      const cb = Cbc[cp]!;
      const cr = Crc[cp]!;
      const i = (y * w + x) * 4;
      out[i] = yy + 1.402 * cr;
      out[i + 1] = yy - 0.344136 * cb - 0.714136 * cr;
      out[i + 2] = yy + 1.772 * cb;
      out[i + 3] = 255;
    }
  }
  return { data: out, w, h };
}

/** Nearest-neighbor resample to an exact square — the product's crisp lattice blit. */
export function nearestScale(bm: Bitmap, size: number): Bitmap {
  if (bm.w === size && bm.h === size) return bm;
  const out = new Uint8ClampedArray(size * size * 4);
  const sx = bm.w / size;
  const sy = bm.h / size;
  for (let y = 0; y < size; y++) {
    const syp = Math.min(bm.h - 1, Math.max(0, Math.round((y + 0.5) * sy - 0.5)));
    for (let x = 0; x < size; x++) {
      const sxp = Math.min(bm.w - 1, Math.max(0, Math.round((x + 0.5) * sx - 0.5)));
      const si = (syp * bm.w + sxp) * 4;
      const di = (y * size + x) * 4;
      out[di] = bm.data[si]!;
      out[di + 1] = bm.data[si + 1]!;
      out[di + 2] = bm.data[si + 2]!;
      out[di + 3] = 255;
    }
  }
  return { data: out, w: size, h: size };
}

/** Bilinear resample to an exact square — mirrors a high-quality canvas blit. */
export function bilinearScale(bm: Bitmap, size: number): Bitmap {
  if (bm.w === size && bm.h === size) return bm;
  const out = new Uint8ClampedArray(size * size * 4);
  const sx = bm.w / size;
  const sy = bm.h / size;
  const s: [number, number, number] = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      sampleBilinear(bm, (x + 0.5) * sx - 0.5, (y + 0.5) * sy - 0.5, s);
      const i = (y * size + x) * 4;
      out[i] = s[0];
      out[i + 1] = s[1];
      out[i + 2] = s[2];
      out[i + 3] = 255;
    }
  }
  return { data: out, w: size, h: size };
}

/** Downscale a luma plane to size×size with a box filter, then blur σ in cells. */
export function lumaSmall(bm: Bitmap, size: number, blurSigmaCells = 1): Float32Array {
  const f = Math.max(1, Math.min(bm.w, bm.h) / size);
  const small = downscale(bm, f);
  const blurred = gaussBlur(small, blurSigmaCells);
  const plane = lumaPlane(blurred);
  // pool to exactly size×size
  const out = new Float32Array(size * size);
  const sx = blurred.w / size;
  const sy = blurred.h / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xs = Math.round((x + 0.5) * sx - 0.5);
      const ys = Math.round((y + 0.5) * sy - 0.5);
      out[y * size + x] = plane[clamp(ys, 0, blurred.h - 1) * blurred.w + clamp(xs, 0, blurred.w - 1)]!;
    }
  }
  return out;
}

/** Mean / std of a plane. */
export function stats(plane: Float32Array): { mean: number; std: number } {
  let m = 0;
  for (let i = 0; i < plane.length; i++) m += plane[i]!;
  m /= plane.length;
  let v = 0;
  for (let i = 0; i < plane.length; i++) {
    const d = plane[i]! - m;
    v += d * d;
  }
  return { mean: m, std: Math.sqrt(v / plane.length) };
}
