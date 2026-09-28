/**
 * Frames QA: renders every "Frames" preset through the real engine (renderQr)
 * on node-canvas and decode-verifies each render with BOTH ZXing and jsQR at
 * 512 + 1024 px across two payloads. Also asserts the scan contract of the
 * decorative frames: a clean paper card under the code (quiet zone included)
 * and a thin border ring (≤ 6.5% per side).
 *
 * Dev-only harness: requires `npm install --no-save @napi-rs/canvas jsqr @zxing/library`.
 * Run: `npx esbuild scripts/qa-frames.ts --bundle --platform=node --format=esm \
 *        --outfile=.qa-frames.mjs --external:@napi-rs/canvas --external:jsqr \
 *        --external:@zxing/library && node .qa-frames.mjs`
 */
import { createCanvas, SKRSContext2D, loadImage } from "@napi-rs/canvas";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import jsQR from "jsqr";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import { encodePayload } from "../src/lib/qr/encode";
import { renderQr } from "../src/lib/qr/render";
import { PRESETS } from "../src/lib/qr/presets";
import { FRAME_ART, setFrameArt, frameBandFor, isDecorFrame } from "../src/lib/qr/frames";
import { DEFAULT_STYLE, emptyPayload } from "../src/lib/qr/types";
import { buildPayload } from "../src/lib/qr/payload";

const reader = new MultiFormatReader();
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
reader.setHints(hints);

function zxingDecode(data: Uint8ClampedArray, w: number, h: number): string | null {
  const lum = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722) | 0;
  }
  try {
    return reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, h)))).getText();
  } catch {
    return null;
  }
}

const PAYLOADS = ["https://qrwho.vercel.app", "https://example.com/menu"];
const OUT = "/home/user/sheets/qa-frames";
mkdirSync(OUT, { recursive: true });

const looks = PRESETS.filter((p) => p.category === "Frames");
console.log(`Frames presets: ${looks.length}`);

// Preload decorative artwork exactly like the browser does (into the shared cache).
for (const [id, path] of Object.entries(FRAME_ART)) {
  // FRAME_ART holds web-root paths (/frames/…); on disk they live in public/.
  // The harness bundle sits at the repo root, so public/frames/… resolves from it.
  const rel = path!.replace(/^\//, "public/");
  const img = await loadImage(readFileSync(new URL(rel, import.meta.url)));
  setFrameArt(id as never, img);
}

let zxPass = 0;
let jqPass = 0;
let total = 0;
let plateOk = 0;
let bandOk = 0;
const thumbs: { name: string; canvas: ReturnType<typeof createCanvas> }[] = [];

for (const preset of looks) {
  const style = { ...DEFAULT_STYLE, ...preset.style };
  let z = 0;
  let j = 0;
  let plates = 0;
  for (const payload of PAYLOADS) {
    const expected = buildPayload({ ...emptyPayload(), url: payload });
    const qr = encodePayload({ ...emptyPayload(), url: payload }, style);
    for (const size of [512, 1024]) {
      const canvas = createCanvas(size, size);
      (canvas as unknown as { style: Record<string, string> }).style = {};
      renderQr(canvas as unknown as HTMLCanvasElement, qr, style, {
        pixelSize: size,
        frame: preset.frame ?? "none",
        exportScale: true,
      });
      const ctx = canvas.getContext("2d") as unknown as SKRSContext2D;
      const img = ctx.getImageData(0, 0, size, size);
      total++;
      if (zxingDecode(img.data, size, size) === expected) {
        z++;
        zxPass++;
      }
      if (jsQR(img.data, size, size)?.data === expected) {
        j++;
        jqPass++;
      }

      // Plate contract: the quiet-zone corners just inside the card must be
      // paper (light), never decoration or ink.
      const band = frameBandFor(preset.frame ?? "none", size);
      const px = (x: number, y: number) => {
        const i = (y * size + x) * 4;
        return img.data[i]! * 0.2126 + img.data[i + 1]! * 0.7152 + img.data[i + 2]! * 0.0722;
      };
      const m = Math.round(band + size * 0.015);
      const corners = [
        [m, m],
        [size - 1 - m, m],
        [m, size - 1 - m],
        [size - 1 - m, size - 1 - m],
        [size / 2, m],
        [size / 2, size - 1 - m],
      ] as const;
      const clean = corners.every(([cx, cy]) => px(Math.round(cx), Math.round(cy)) > 175);
      if (clean) plates++;

      if (payload === PAYLOADS[0] && size === 512) {
        thumbs.push({ name: preset.id, canvas });
        writeFileSync(`${OUT}/${preset.id}.png`, canvas.toBuffer("image/png"));
      }
    }
  }
  const band = frameBandFor(preset.frame ?? "none", 512);
  const thin = isDecorFrame(preset.frame ?? "") && band / 512 <= 0.11;
  if (thin) bandOk++;
  plateOk += plates;
  console.log(
    `  ${preset.id.padEnd(16)} zxing ${z}/4  jsQR ${j}/4  clean-card ${plates}/4  thin-band ${thin ? "yes" : "NO"}`,
  );
}

// Contact sheet (512 thumbs).
const T = 192;
const cols = 3;
const rows = Math.ceil(thumbs.length / cols);
const sheet = createCanvas(T * cols, T * rows);
const sctx = sheet.getContext("2d") as unknown as SKRSContext2D;
sctx.fillStyle = "#12141a";
sctx.fillRect(0, 0, T * cols, T * rows);
thumbs.forEach((t, i) => {
  sctx.drawImage(t.canvas, (i % cols) * T, Math.floor(i / cols) * T, T, T);
});
writeFileSync(`${OUT}/contact.png`, sheet.toBuffer("image/png"));

console.log(`\nZXing ${zxPass}/${total}   jsQR ${jqPass}/${total}`);
console.log(`clean card: ${plateOk}/${total}   thin band: ${bandOk}/${looks.length}`);
console.log(`renders → ${OUT}/  (contact.png for the sheet)`);
if (zxPass + jqPass === 0 || plateOk < total || bandOk < looks.length) process.exit(1);
