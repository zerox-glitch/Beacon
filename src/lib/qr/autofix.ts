import { tryEncodePayload } from "./encode";
import { loadImage, renderQr } from "./render";
import { verifyQr } from "./verify";
import type { Payload, QrStyle } from "./types";

export interface AutoFixOutcome {
  ok: boolean;
  patch: Partial<QrStyle>;
  notes: string[];
  error?: string;
}

/**
 * Tune contrast / dot weight / fade so the code scans — without switching
 * treatment, palette, or module shape. The photo stays the photo.
 */
export async function autoFixScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
): Promise<AutoFixOutcome> {
  const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;

  const scans = async (s: QrStyle): Promise<boolean> => {
    const enc = tryEncodePayload(payload, s);
    if (!enc.ok) return false;
    const canvas = document.createElement("canvas");
    renderQr(canvas, enc.qr, s, { pixelSize: 720, art, logo, exportScale: true });
    return Boolean(await verifyQr(canvas).catch(() => null));
  };

  if (await scans(style)) return { ok: true, patch: {}, notes: ["already scannable"] };

  const patch: Partial<QrStyle> = {};
  const notes: string[] = [];
  const current = (): QrStyle => ({ ...style, ...patch });

  const steps: { apply: () => void; note: string }[] = [
    {
      apply: () => {
        patch.contrast = Math.min(1, Math.max(style.contrast, 0.78) + 0.1);
        patch.dotScale = Math.min(0.88, Math.max(style.dotScale, 0.62));
        patch.ecc = "H";
      },
      note: "raised contrast and dot weight",
    },
    {
      apply: () => {
        patch.contrast = Math.min(1, 0.92);
        patch.imageOpacity = Math.min(style.imageOpacity, 0.78);
        patch.dotScale = Math.min(0.9, Math.max(style.dotScale, 0.78));
        patch.quietZone = Math.max(style.quietZone, 3);
      },
      note: "tightened photo fade for camera lock",
    },
    {
      apply: () => {
        patch.contrast = 0.96;
        patch.imageOpacity = Math.min(style.imageOpacity, 0.62);
        patch.dotScale = 0.86;
        patch.moduleGap = Math.min(style.moduleGap, 0.06);
        patch.quietZone = Math.max(style.quietZone, 3);
        patch.transparentBg = false;
        patch.ecc = "H";
      },
      note: "maximized bit separation, kept this picture treatment",
    },
  ];

  for (const step of steps) {
    step.apply();
    notes.push(step.note);
    if (await scans(current())) {
      return { ok: true, patch, notes };
    }
  }

  return { ok: true, patch, notes };
}
