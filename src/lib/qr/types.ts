export type PayloadKind =
  | "url"
  | "text"
  | "phone"
  | "sms"
  | "email"
  | "whatsapp"
  | "wifi"
  | "geo"
  | "vcard"
  | "event"
  | "pdf"
  | "menu"
  | "review"
  | "payment"
  | "app"
  | "social";

export type ModuleShape =
  | "square"
  | "rounded"
  | "dots"
  | "diamond"
  | "star"
  | "plus"
  | "classy"
  | "leaf"
  | "fluid"
  | "hex"
  | "heart"
  | "squircle"
  | "confetti"
  | "dash"
  | "cross"
  | "diag"
  | "radial"
  | "bubbles"
  | "hbar"
  | "vbar";

export type EyeShape =
  | "square"
  | "rounded"
  | "circle"
  | "leaf"
  | "diamond"
  | "extra-rounded"
  | "classy"
  | "hex"
  | "target"
  | "ticks";

export type GradientType = "none" | "linear" | "radial" | "diagonal" | "image";

export type ImageMode =
  | "none"
  | "logo"
  | "clean"
  | "backdrop"
  | "mosaic"
  | "halftone"
  | "paint"
  | "duotone"
  | "mono";

export type QrEffect = "none" | "shadow" | "glow" | "outline" | "emboss" | "extrude";

export type EccLevel = "L" | "M" | "Q" | "H";

export interface QrStyle {
  moduleShape: ModuleShape;
  eyeShape: EyeShape;
  ballShape: EyeShape;
  fg: string;
  bg: string;
  eyeColor: string;
  ballColor: string;
  gradientType: GradientType;
  gradientTo: string;
  quietZone: number;
  moduleGap: number;
  imageMode: ImageMode;
  imageOpacity: number;
  /** Photo zoom: 1 = fit whole photo (no crop), >1 zooms into the centre, <1 shrinks. */
  photoZoom: number;
  dotScale: number;
  /**
   * The dotScale the active art template was applied with (written by the
   * studio's applyPreset). The art pipeline uses it to tell "the user moved
   * the dot-size slider" from "a style built without it" — without a ref,
   * templates ignore dotScale entirely and render exactly as authored.
   */
  dotScaleRef?: number;
  /**
   * The user explicitly picked a module shape in the Design tab (as opposed
   * to the value the active template seeded the picker with). With the
   * marker, even a pick that matches the "square" seed placeholder is
   * honoured — e.g. Square on a petal template actually renders squares.
   */
  modulePicked?: boolean;
  /** The user explicitly picked an eye-frame shape in the Design tab. */
  eyePicked?: boolean;
  /** The user explicitly picked a pupil shape in the Design tab. */
  ballPicked?: boolean;
  contrast: number;
  logoScale: number;
  minVersion: number;
  ecc: EccLevel;
  transparentBg: boolean;
  /** 0 = SAFE (strong bits), 1 = ARTISTIC (more photo in each module). */
  artisticStrength: number;
  effect: QrEffect;
  /** -1 = automatic mask. */
  maskPattern: number;
  /** Optional secondary "pop" modules drawn in accentColor (e.g. red X over blue dashes). */
  accentShape?: ModuleShape;
  accentColor?: string;
  /** When true the accent dots decorate the *light* cells instead of replacing dark modules. */
  accentOnLight?: boolean;
  /** Photo QR kernel candidate; set by Fix scan escalation (photo engine). */
  photoKernel?: "detail" | "structure" | "balanced" | "camera-safe" | "robust";
  /**
   * Art QR Style System direction (src/lib/qr/art-directions.ts). When set,
   * the renderer paints a deterministic design system instead of a flat
   * module loop — and `artRelax` records how far the relax ladder had to walk
   * to keep it camera-scannable.
   */
  artDirection?: string;
  /** Relax-ladder rung actually rendered (0 = the direction as authored). */
  artRelax?: number;
  /** Force the direction's camera-safe fallback (last relax rung). */
  artCameraSafe?: boolean;
}

/**
 * Where landing-page sample codes point by default (the site itself — so a
 * scan of the demo is a harmless loop back to the top page). Admins can
 * override per sample (CMS samples doc).
 */
export const DEFAULT_SAMPLE_URL = "https://qrwho.vercel.app";

export interface Payload {
  kind: PayloadKind;
  url: string;
  text: string;
  phone: string;
  smsBody: string;
  email: string;
  /** Legacy: no longer embedded in the QR (mailto opens a plain composer). */
  emailSubject: string;
  /** Legacy: no longer embedded in the QR (mailto opens a plain composer). */
  emailBody: string;
  whatsapp: string;
  whatsappText: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiType: "WPA" | "WEP" | "nopass";
  wifiHidden: boolean;
  lat: string;
  lng: string;
  geoLabel: string;
  firstName: string;
  lastName: string;
  org: string;
  vphone: string;
  vemail: string;
  vurl: string;
  eventTitle: string;
  eventLocation: string;
  eventStart: string;
  eventEnd: string;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  featured?: boolean;
  /** One-line design note shown in the gallery (art directions). */
  blurb?: string;
  /** When set, applying this preset loads this picture into the QR. */
  artUrl?: string;
  /**
   * Usable while a photo drives the QR. NULL/undefined = auto: true when the
   * preset itself declares a photo image mode. The studio gallery filters
   * templates that cannot carry a photo, and admins can pin either way.
   */
  imageCompatible?: boolean;
  style: QrStyle;
}

export const MODULE_SHAPES: { id: ModuleShape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Round" },
  { id: "squircle", label: "Soft" },
  { id: "dots", label: "Dots" },
  { id: "fluid", label: "Fluid" },
  { id: "classy", label: "Classy" },
  { id: "diamond", label: "Diamond" },
  { id: "hex", label: "Hex" },
  { id: "star", label: "Star" },
  { id: "plus", label: "Plus" },
  { id: "leaf", label: "Leaf" },
  { id: "heart", label: "Heart" },
  { id: "confetti", label: "Confetti" },
  { id: "dash", label: "Dash" },
  { id: "cross", label: "Cross" },
  { id: "diag", label: "Streak" },
  { id: "radial", label: "Burst" },
  { id: "bubbles", label: "Bubbles" },
  { id: "hbar", label: "H-bars" },
  { id: "vbar", label: "V-bars" },
];

export const EYE_SHAPES: { id: EyeShape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Round" },
  { id: "extra-rounded", label: "Soft" },
  { id: "circle", label: "Circle" },
  { id: "classy", label: "Classy" },
  { id: "diamond", label: "Diamond" },
  { id: "leaf", label: "Leaf" },
  { id: "hex", label: "Hex" },
  { id: "target", label: "Target" },
  { id: "ticks", label: "Ticks" },
];

export const IMAGE_MODES: { id: ImageMode; label: string; hint: string }[] = [
  { id: "paint", label: "Photo QR", hint: "The photograph is built from the QR. Each module’s center is the bit; the rest is a photo halftone." },
  { id: "clean", label: "Clean overlay", hint: "The photo sits underneath at full strength; crisp modules with finder plates float on top — the poster look, maximum scannability." },
  { id: "mosaic", label: "Color blend", hint: "Each module is one contrast-normalized color from the photo" },
  { id: "halftone", label: "Halftone", hint: "Same lattice in black ink on paper — newspaper dots, not colored rings" },
  { id: "duotone", label: "Duotone", hint: "Two inks sampled from the photo, same center-locked weave" },
  { id: "mono", label: "Mono ink", hint: "One ink on paper. Density follows the picture" },
  { id: "logo", label: "Logo", hint: "Center emblem only" },
  { id: "none", label: "None", hint: "Style only, no photo" },
];

export const QR_EFFECTS: { id: QrEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "shadow", label: "Shadow" },
  { id: "outline", label: "Outline" },
  { id: "emboss", label: "Emboss" },
  { id: "extrude", label: "3D" },
  { id: "glow", label: "Glow" },
];

export function emptyPayload(): Payload {
  return {
    kind: "url",
    url: "https://qrwho.vercel.app",
    text: "",
    phone: "",
    smsBody: "",
    email: "",
    emailSubject: "",
    emailBody: "",
    whatsapp: "",
    whatsappText: "",
    wifiSsid: "",
    wifiPassword: "",
    wifiType: "WPA",
    wifiHidden: false,
    lat: "",
    lng: "",
    geoLabel: "",
    firstName: "",
    lastName: "",
    org: "",
    vphone: "",
    vemail: "",
    vurl: "",
    eventTitle: "",
    eventLocation: "",
    eventStart: "",
    eventEnd: "",
  };
}

export const DEFAULT_ART_URL = "/samples/mountain.jpg";

export const DEFAULT_STYLE: QrStyle = {
  moduleShape: "square",
  eyeShape: "extra-rounded",
  ballShape: "extra-rounded",
  fg: "#0f172a",
  bg: "#f4efe6",
  eyeColor: "#0f172a",
  ballColor: "#0f172a",
  gradientType: "none",
  gradientTo: "#1e293b",
  quietZone: 3,
  moduleGap: 0.02,
  imageMode: "paint",
  imageOpacity: 0.86,
  photoZoom: 1,
  dotScale: 0.68,
  contrast: 0.84,
  logoScale: 0.22,
  minVersion: 6,
  ecc: "H",
  transparentBg: false,
  artisticStrength: 0.5,
  effect: "none",
  maskPattern: -1,
};

/* ------------------------------------------------------------------ *
 * Art QR Style System — vocabulary
 *
 * An "art direction" is a deterministic design system, not a palette swap.
 * Each one names at least five visual dimensions: module shape + corner
 * radius, grouping geometry, distortion, gradient behaviour, accent
 * frequency, finder styling and timing/alignment styling. Everything is
 * data (see src/lib/qr/art-directions.ts) so the renderer, the relax
 * ladder and the validation harness all read the same definition.
 * ------------------------------------------------------------------ */

/** Per-cell module geometry. `pill`/`petal`/`pebble`/`gem`/`facet` are art-system additions. */
export type ArtShape =
  | ModuleShape
  | "pill"
  | "petal"
  | "pebble"
  | "gem"
  | "facet"
  | "capsule";

/** How dark modules join into larger, camera-survivable shapes. */
export type ArtGeometry =
  | "single"
  | "runs-h"
  | "runs-v"
  | "runs-both"
  | "blocks"
  | "components"
  | "traces";

/** Medium-scale distortion. Never sub-module noise. */
export type ArtDistortion = "none" | "jitter" | "taper" | "wobble" | "bands" | "steps";

export type ArtGradient =
  | "none"
  | "linear-x"
  | "linear-y"
  | "diagonal"
  | "radial"
  | "ramp"
  | "spectrum"
  | "bands"
  | "split";

export type ArtFinder =
  | "solid"
  | "ringed"
  | "bracket"
  | "chamfer"
  | "diamond"
  | "circle"
  | "floral"
  | "circuit"
  | "gothic"
  | "deco"
  | "soft"
  | "ring8"
  | "halo"
  | "cut";

export type ArtTiming = "solid" | "pill" | "dot";

export type ArtAccent = "none" | "fleck" | "spark" | "ring" | "tick";

/**
 * Rendered size budget. `ppm` = finalRenderedPixels / QRModuleCount.
 * Rich allows full decoration; lean is the camera-safe simplification the
 * renderer falls back to automatically as modules get small.
 */
export type ArtDetailLevel = "rich" | "standard" | "lean";

export interface ArtLodTweaks {
  geometry?: ArtGeometry;
  distortion?: ArtDistortion;
  accent?: ArtAccent;
  gradient?: ArtGradient;
  shape?: ArtShape;
  radius?: number;
  gap?: number;
  mass?: number;
  /** Extra luminance separation applied at this level (0 = none). */
  contrastBoost?: number;
}

export interface ArtDirection {
  id: string;
  name: string;
  category: string;
  /** One line shown in the gallery — what makes this direction itself. */
  blurb: string;
  /** Dark-module colour stops (stop[0] is the base ink). */
  stops: string[];
  bg: string;
  /** Finder ring / ball colours when they differ from the ink ramp. */
  eye?: string;
  ball?: string;
  accent?: string;
  shape: ArtShape;
  /** Corner radius as a fraction of the module (0 = hard, 0.5 = round). */
  radius: number;
  geometry: ArtGeometry;
  distortion: ArtDistortion;
  gradient: ArtGradient;
  /** Extra stops for spectrum/ramp gradients. */
  ramp?: string[];
  finder: ArtFinder;
  timing: ArtTiming;
  alignment: ArtTiming | "ring";
  accentMark: ArtAccent;
  /** 0–1: how often the accent appears. */
  accentFreq: number;
  accentOnLight?: boolean;
  /** Filled-area target for a dark module (QR mass). Clamped by the renderer. */
  mass: number;
  /** Module inset as a fraction of the cell. */
  gap: number;
  /** Artistic strength the direction is safe at (0–1). */
  strength: number;
  quietZone: number;
  /** Minimum luminance separation this direction is allowed to render at. */
  minSeparation?: number;
  lod?: Partial<Record<ArtDetailLevel, ArtLodTweaks>>;
  /** Deterministic fallback used when validation cannot pass otherwise. */
  cameraSafe?: ArtLodTweaks;
  /**
   * Design-tab tuning: set when the user explicitly picks a non-default eye
   * frame shape. Swaps the template's finder for another camera-validated
   * FINDER_STYLES design (the picker's vocabulary maps onto the validated set).
   */
  finderTune?: ArtFinder;
  /** Design-tab tuning: ball silhouette for an explicitly-picked pupil shape. */
  ballTune?: "square" | "circle" | "octagon";
  /**
   * Design-tab eye/pupil picks, resolved through the per-template camera
   * battery (finder-battery.ts): the classic 7×7 / 5×5 / 3×3 layered
   * silhouette system — the same vocabulary the picker icons preview and the
   * plain-QR renderer draws — replacing the 5-design FINDER_STYLES mapping
   * that made most eye/pupil clicks visually no-ops. `finderFrame` is the
   * outer+gap silhouette, `finderBall` the centre-ball silhouette.
   */
  finderFrame?: EyeShape;
  finderBall?: EyeShape;
}

export interface QrStyleArtRef {
  directionId: string;
}
