import type { QrStyle } from "../types";

export interface WeavePreset {
  id: string;
  label: string;
  hint: string;
  patch: Partial<QrStyle>;
}

/** Renderer knobs only — no AI, no overlay. */
export const WEAVE_PRESETS: WeavePreset[] = [
  {
    id: "portrait",
    label: "Portrait",
    hint: "Softer Photo QR for faces",
    patch: { imageMode: "paint", moduleShape: "rounded", artisticStrength: 0.52, contrast: 0.78, effect: "none", gradientType: "none" },
  },
  {
    id: "nature",
    label: "Nature",
    hint: "Color-blend foliage",
    patch: { imageMode: "mosaic", moduleShape: "leaf", artisticStrength: 0.48, contrast: 0.8, effect: "none", gradientType: "image" },
  },
  {
    id: "neon",
    label: "Neon",
    hint: "Punchy dark-on-color",
    patch: { imageMode: "mosaic", moduleShape: "square", artisticStrength: 0.56, contrast: 0.9, effect: "glow", gradientType: "image" },
  },
  {
    id: "ink",
    label: "Ink",
    hint: "Newspaper dots",
    patch: { imageMode: "halftone", moduleShape: "dots", artisticStrength: 0.4, contrast: 0.88, effect: "none", gradientType: "none" },
  },
  {
    id: "luxury",
    label: "Luxury",
    hint: "Duotone weave",
    patch: { imageMode: "duotone", moduleShape: "rounded", artisticStrength: 0.44, contrast: 0.84, effect: "none", gradientType: "none" },
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Mono, lots of paper",
    patch: { imageMode: "mono", moduleShape: "square", artisticStrength: 0.28, contrast: 0.92, effect: "none", gradientType: "none" },
  },
  {
    id: "pixel",
    label: "Pixel",
    hint: "Hard squares",
    patch: { imageMode: "paint", moduleShape: "square", artisticStrength: 0.46, contrast: 0.86, effect: "none", gradientType: "none" },
  },
  {
    id: "organic",
    label: "Organic",
    hint: "Soft blobs of photo",
    patch: { imageMode: "paint", moduleShape: "fluid", artisticStrength: 0.5, contrast: 0.8, effect: "none", gradientType: "image" },
  },
];
