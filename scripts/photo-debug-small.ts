/**
 * Focused debug: which battery variants fail for the safest candidate at
 * small matrix + weak ECC (the only regime where selection refuses).
 */
import jsQR from "jsqr";
import { encode } from "uqr";
import { runCameraBattery, cameraVariants } from "../src/lib/qr/photo/camera-sim.ts";
import { photoFidelity } from "../src/lib/qr/photo/fidelity.ts";
import { buildToneField } from "../src/lib/qr/photo/field.ts";
import { rasterizePhotoQr } from "../src/lib/qr/photo/raster.ts";
import { roleMaps, candidateParams, type StyleToParamsInput } from "../src/lib/qr/photo/score.ts";
import { PHOTO_CANDIDATES } from "../src/lib/qr/photo/candidates.ts";
import { bilinearScale, type Bitmap } from "../src/lib/qr/photo/imaging.ts";
import { portrait } from "./photo-report.ts";

const STYLE_INPUT: StyleToParamsInput = {
  mode: "photo",
  strength: 0.5,
  contrast: 0.84,
  dotScale: 0.68,
  chroma: 0.86,
  boost: 0,
  viewPxPerModule: 6.5,
  modules: 37,
  fg: [18, 18, 18],
  bg: [244, 241, 234],
};

function quietPadBody(body: Bitmap, qrSize: number, quietModules = 4, paper: Rgb = [244, 241, 234]): Bitmap {
  const ss = body.w / qrSize;
  const pad = Math.round(quietModules * ss);
  const N = body.w + pad * 2;
  const out = new Uint8ClampedArray(N * N * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = paper[0];
    out[i + 1] = paper[1];
    out[i + 2] = paper[2];
    out[i + 3] = 255;
  }
  for (let y = 0; y < body.h; y++)
    for (let x = 0; x < body.w; x++) {
      const si = (y * body.w + x) * 4;
      const di = ((y + pad) * N + x + pad) * 4;
      out[di] = body.data[si]!;
      out[di + 1] = body.data[si + 1]!;
      out[di + 2] = body.data[si + 2]!;
      out[di + 3] = 255;
    }
  return { data: out, w: N, h: N };
}

const decode = (bm: Bitmap) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;
const photo = portrait();
const text = "https://qrwho.vercel.app/welcome/photo-demo";

for (const ecc of ["Q", "M"] as const) {
  const qr = encode(text, { ecc, boostEcc: false, minVersion: 4, border: 0 });
  const maps = roleMaps(qr);
  STYLE_INPUT.modules = qr.size;
  console.log(`\n=== size ${qr.size} ECC ${ecc} ===`);
  for (const cand of PHOTO_CANDIDATES) {
    const field = buildToneField(photo, qr.size, {
      detail: cand.detail * 0.8,
      normalize: 0.8,
    });
    const { render } = candidateParams(cand, STYLE_INPUT);
    const { bitmap } = rasterizePhotoQr(field, {
      size: qr.size,
      ss: 8,
      ...render,
      colorMode: "photo",
      fg: STYLE_INPUT.fg,
      bg: STYLE_INPUT.bg,
      duoDark: [30, 26, 20],
      duoLight: [236, 224, 200],
      bits: maps.bits,
      isProtected: maps.isProtected,
    });
    const bm512 = bilinearScale(quietPadBody(bitmap, qr.size), 512);
    const bat = runCameraBattery(bm512, decode, text);
    const fid = photoFidelity(photo, bilinearScale(bitmap, 512), 40, 1.6);
    console.log(
      `${cand.id.padEnd(12)} R${bat.robustness.toFixed(2)} F${fid.score.toFixed(2)} fails: ${[...bat.failed].join(",") || "—"}`,
    );
  }
}
