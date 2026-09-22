import { verifyQr } from "./verify";

export interface ScanReport {
  decoded: string | null;
  ok: boolean;
  contrast: number;
  quietZoneOk: boolean;
  finderOk: boolean;
  notes: string[];
}

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function sampleL(data: Uint8ClampedArray, w: number, x: number, y: number): number {
  const i = (Math.round(y) * w + Math.round(x)) * 4;
  return luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
}

/**
 * Decode the actual pixels with jsQR, then measure contrast / quiet zone / finders.
 * Never reports "scannable" unless the payload comes back from the decoder.
 */
export async function inspectRenderedQr(
  canvas: HTMLCanvasElement,
  expected?: string | null,
): Promise<ScanReport> {
  const notes: string[] = [];
  const decoded = await verifyQr(canvas).catch(() => null);
  const matches = expected ? decoded === expected : Boolean(decoded);
  const ok = Boolean(decoded) && (expected == null || matches);
  if (decoded && expected && !matches) notes.push("decoded a different payload");

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { decoded, ok, contrast: 0, quietZoneOk: false, finderOk: false, notes };
  }
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const qz = Math.max(2, Math.round(w * 0.04));

  let border = 0;
  let bn = 0;
  for (let x = 0; x < w; x += 4) {
    border += sampleL(d, w, x, 1) + sampleL(d, w, x, h - 2);
    bn += 2;
  }
  for (let y = 0; y < h; y += 4) {
    border += sampleL(d, w, 1, y) + sampleL(d, w, w - 2, y);
    bn += 2;
  }
  const borderL = border / bn;
  const quietZoneOk = borderL > 0.55 || borderL < 0.4;
  if (!quietZoneOk) notes.push("quiet zone is noisy");

  const inset = w * 0.18;
  let darkAcc = 0;
  let lightAcc = 0;
  let dn = 0;
  let ln = 0;
  for (let y = inset; y < h - inset; y += 7) {
    for (let x = inset; x < w - inset; x += 7) {
      const L = sampleL(d, w, x, y);
      if (L < 0.42) {
        darkAcc += L;
        dn++;
      } else {
        lightAcc += L;
        ln++;
      }
    }
  }
  const dMean = dn ? darkAcc / dn : 0.2;
  const lMean = ln ? lightAcc / ln : 0.85;
  const contrast = Math.max(0, Math.min(1, lMean - dMean));
  if (contrast < 0.28) notes.push("module contrast is low");

  const finder = (ox: number, oy: number) => {
    const s = w * 0.12;
    const c = sampleL(d, w, ox + s / 2, oy + s / 2);
    const ring = sampleL(d, w, ox + s * 0.15, oy + s * 0.15);
    return Math.abs(c - ring) > 0.18;
  };
  const finderOk = finder(qz, qz) && finder(w - qz - w * 0.12, qz) && finder(qz, h - qz - h * 0.12);
  if (!finderOk) notes.push("finder eyes need more contrast");

  if (ok) notes.unshift("jsQR recovered the payload");
  else notes.unshift("jsQR could not read this bitmap");

  return { decoded, ok, contrast, quietZoneOk, finderOk, notes };
}

/** Downscale a canvas and decode it — a robustness margin for phone cameras. */
export async function decodeScaled(canvas: HTMLCanvasElement, size: number): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const cx = off.getContext("2d", { willReadFrequently: true });
  if (!cx) return null;
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(canvas, 0, 0, size, size);
  const img = cx.getImageData(0, 0, size, size);
  return jsQR(img.data, size, size, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

/** Decode a downloaded PNG blob at native size, then 480 and 360 via verifyQr. */
export async function inspectPngBlob(blob: Blob, expected?: string | null): Promise<ScanReport> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read PNG"));
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (!cx) {
      return {
        decoded: null,
        ok: false,
        contrast: 0,
        quietZoneOk: false,
        finderOk: false,
        notes: ["Could not read PNG pixels"],
      };
    }
    cx.drawImage(img, 0, 0);
    return inspectRenderedQr(c, expected);
  } finally {
    URL.revokeObjectURL(url);
  }
}
