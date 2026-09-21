import { encode } from "uqr";
import { loadImage, renderQr } from "./render";
import type { Preset, QrStyle } from "./types";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const THUMB_PX = 96;
const MAX_PARALLEL = 3;
let active = 0;
const waiters: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function thumbStyle(preset: Preset, hasArt: boolean): QrStyle {
  return {
    ...preset.style,
    minVersion: hasArt ? 3 : 2,
    quietZone: 2,
    imageMode: hasArt ? (preset.style.imageMode === "none" ? "paint" : preset.style.imageMode) : "none",
    transparentBg: false,
    effect: "none",
  };
}

async function paint(preset: Preset): Promise<string> {
  const art = preset.artUrl ? await loadImage(preset.artUrl).catch(() => null) : null;
  const style = thumbStyle(preset, Boolean(art));
  const qr = encode("https://qrwho.vercel.app", {
    ecc: art ? "H" : "M",
    minVersion: style.minVersion,
    border: 0,
  });
  const canvas = document.createElement("canvas");
  renderQr(canvas, qr, style, { pixelSize: THUMB_PX, art, exportScale: true });
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function cachedPresetThumb(id: string): string | undefined {
  return cache.get(id);
}

/** Mini QR for a look. Cached. No jsQR. */
export function renderPresetThumb(preset: Preset): Promise<string> {
  const hit = cache.get(preset.id);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(preset.id);
  if (pending) return pending;
  const job = withSlot(() => paint(preset))
    .then((url) => {
      cache.set(preset.id, url);
      inflight.delete(preset.id);
      return url;
    })
    .catch((err) => {
      inflight.delete(preset.id);
      throw err;
    });
  inflight.set(preset.id, job);
  return job;
}
