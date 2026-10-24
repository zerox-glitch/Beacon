/**
 * Template QA: renders every "Themes" preset through the real engine
 * (renderQr) on node-canvas and decode-verifies each render with BOTH ZXing
 * (the reference app's decoder stack) and jsQR, at 512 + 1024 px, across two
 * payloads. Writes a contact sheet for visual review.
 *
 * Dev-only harness: requires `npm install --no-save @napi-rs/canvas jsqr @zxing/library`.
 * Run: `npx esbuild scripts/qa-themes.ts --bundle --platform=node --format=esm \
 *        --outfile=.qa-themes.mjs --external:@napi-rs/canvas --external:jsqr \
 *        --external:@zxing/library && node .qa-themes.mjs`
 */
import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
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
mkdirSync("/home/user/sheets/qa", { recursive: true });

const themes = PRESETS.filter((p) => p.category === "Themes");
console.log(`Themes presets: ${themes.length}`);

let zxPass = 0;
let jqPass = 0;
let total = 0;
const thumbs: { name: string; canvas: ReturnType<typeof createCanvas> }[] = [];

for (const preset of themes) {
  const style = { ...DEFAULT_STYLE, ...preset.style };
  let z = 0;
  let j = 0;
  for (const payload of PAYLOADS) {
    const expected = buildPayload({ ...emptyPayload(), url: payload });
    const qr = encodePayload({ ...emptyPayload(), url: payload }, style);
    for (const size of [512, 1024]) {
      const canvas = createCanvas(size, size);
      (canvas as unknown as { style: Record<string, string> }).style = {};
      renderQr(canvas as unknown as HTMLCanvasElement, qr, style, { pixelSize: size, exportScale: true });
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
      if (payload === PAYLOADS[0] && size === 512) {
        thumbs.push({ name: preset.name, canvas });
        writeFileSync(`/home/user/sheets/qa/${preset.id}.png`, canvas.toBuffer("image/png"));
      }
    }
  }
  console.log(`${preset.id.padEnd(14)} zxing ${z}/4  jsQR ${j}/4`);
}

// Contact sheet.
const COLS = 7;
const CELL = 220;
const LABEL = 22;
const rows = Math.ceil(thumbs.length / COLS);
const sheet = createCanvas(COLS * CELL, rows * (CELL + LABEL));
const sc = sheet.getContext("2d") as unknown as SKRSContext2D;
sc.fillStyle = "#111827";
sc.fillRect(0, 0, sheet.width, sheet.height);
thumbs.forEach((t, i) => {
  const x = (i % COLS) * CELL;
  const y = Math.floor(i / COLS) * (CELL + LABEL);
  sc.drawImage(t.canvas, x + 6, y + 6, CELL - 12, CELL - 12);
  sc.fillStyle = "#e5e7eb";
  sc.font = "bold 14px sans-serif";
  sc.textAlign = "center";
  sc.fillText(t.name, x + CELL / 2, y + CELL + 14);
});
writeFileSync("/home/user/sheets/themes-contact.png", sheet.toBuffer("image/png"));

console.log(`\nZXing: ${zxPass}/${total}   jsQR: ${jqPass}/${total}`);
