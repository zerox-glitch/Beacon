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

const FRAGILE = new Set(["confetti", "diag", "radial", "heart", "cross", "dash", "star"]);

/**
 * Tries the least-intrusive style tweaks first, re-rendering and re-decoding a
 * probe after each one, and returns the first combination a camera-style
 * reader accepts. Returns an honest failure (with suggestions) when no
 * combination works for the given picture.
 */
export async function autoFixScan(
  payload: Payload,
  style: QrStyle,
  imageUrl: string | null,
  logoUrl: string | null,
): Promise<AutoFixOutcome> {
  const art = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
  const pictured = Boolean(art) && style.imageMode !== "none" && style.imageMode !== "logo";

  const scans = async (s: QrStyle): Promise<boolean> => {
    const enc = tryEncodePayload(payload, s);
    if (!enc.ok) return false;
    const canvas = document.createElement("canvas");
    renderQr(canvas, enc.qr, s, { pixelSize: 640, art, logo, exportScale: true });
    return Boolean(await verifyQr(canvas).catch(() => null));
  };

  if (await scans(style)) return { ok: true, patch: {}, notes: [] };

  const patch: Partial<QrStyle> = {};
  const notes: string[] = [];
  const current = (): QrStyle => ({ ...style, ...patch });

  const steps: { apply: () => void; note: string; only?: "pictured" | "plain" }[] = [];
  if (style.imageMode === "paint" || style.imageMode === "backdrop") {
    steps.push({ apply: () => (patch.imageOpacity = 0.7), note: "faded the photo", only: "pictured" });
    steps.push(
      {
        apply: () => (patch.dotScale = Math.max(style.dotScale, 0.66)),
        note: "enlarged the dots",
        only: "pictured",
      },
      { apply: () => (patch.imageOpacity = 0.5), note: "faded the photo more", only: "pictured" },
    );
  }
  if (pictured) {
    steps.push({ apply: () => (patch.contrast = 0.95), note: "boosted contrast", only: "pictured" });
  }
  if (FRAGILE.has(style.moduleShape)) {
    steps.push({ apply: () => (patch.moduleShape = "dots"), note: "switched to sturdier dots" });
  }
  if (pictured) {
    steps.push({
      apply: () => {
        patch.dotScale = 0.72;
        patch.imageOpacity = Math.min(patch.imageOpacity ?? style.imageOpacity, 0.45);
      },
      note: "max dot weight with a faint photo",
      only: "pictured",
    });
    steps.push({
      apply: () => {
        patch.imageMode = "mosaic";
        patch.contrast = 0.9;
      },
      note: "switched to the Mosaic treatment",
      only: "pictured",
    });
  }

  for (const step of steps) {
    if (step.only === "pictured" && !pictured) continue;
    if (step.only === "plain" && pictured) continue;
    step.apply();
    notes.push(step.note);
    if (await scans(current())) {
      return { ok: true, patch, notes };
    }
  }

  return {
    ok: false,
    patch: {},
    notes: [],
    error: pictured
      ? "This picture is too busy or dark for a reliable code. Try a brighter, simpler photo, the Mosaic treatment, or remove the picture."
      : "This style is too decorative to scan. Pick a sturdier module shape (Square, Round or Dots) or softer colors.",
  };
}
