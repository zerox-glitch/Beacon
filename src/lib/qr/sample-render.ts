import { encodePayload } from "./encode";
import { buildPayload } from "./payload";
import { loadImage, renderQr } from "./render";
import { DEFAULT_SAMPLE_URL, emptyPayload, type Preset } from "./types";
import { verifyQr } from "./verify";

export const SAMPLE_URL = DEFAULT_SAMPLE_URL;

export interface SampleImage {
  preset: Preset;
  url: string;
  /** True only when jsQR decoded the exact rendered pixels back to the payload. */
  verified: boolean;
}

/**
 * Render a preset to a 512px bitmap and decode it with jsQR — the same
 * pipeline the studio uses — then return the PNG data URL. Used by the
 * landing page so every showcased code is a real, verified QR.
 */
export async function renderSamplePreset(
  preset: Preset,
  px = 512,
  url: string = DEFAULT_SAMPLE_URL,
): Promise<SampleImage> {
  const payload = { ...emptyPayload(), kind: "url" as const, url: url.trim() || DEFAULT_SAMPLE_URL };
  const text = buildPayload(payload).trim();
  const qr = encodePayload(payload, preset.style);
  const art = preset.artUrl ? await loadImage(preset.artUrl).catch(() => null) : null;
  const canvas = document.createElement("canvas");
  renderQr(canvas, qr, preset.style, { pixelSize: px, art, exportScale: true });
  const decoded = await verifyQr(canvas).catch(() => null);
  return { preset, url: canvas.toDataURL("image/png"), verified: decoded === text };
}
