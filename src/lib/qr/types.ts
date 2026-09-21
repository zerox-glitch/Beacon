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
  dotScale: number;
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
}

export interface Payload {
  kind: PayloadKind;
  url: string;
  text: string;
  phone: string;
  smsBody: string;
  email: string;
  emailSubject: string;
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
  /** When set, applying this preset loads this picture into the QR. */
  artUrl?: string;
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
  { id: "paint", label: "Photo QR", hint: "Photo woven into every module; the center of each dot is the bit cameras read" },
  { id: "mosaic", label: "Color blend", hint: "Each module is a contrast-normalized sample of the photo" },
  { id: "halftone", label: "Halftone", hint: "3×3 submodules: center is the QR bit, surround is a photo halftone" },
  { id: "duotone", label: "Duotone", hint: "Photo remapped to two scannable tones, still woven into the modules" },
  { id: "mono", label: "Mono ink", hint: "One ink. Dot size follows the photo — like a woodcut QR" },
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
  eyeShape: "square",
  ballShape: "square",
  fg: "#0f172a",
  bg: "#f4efe6",
  eyeColor: "#0f172a",
  ballColor: "#0f172a",
  gradientType: "none",
  gradientTo: "#1e293b",
  quietZone: 3,
  moduleGap: 0.03,
  imageMode: "paint",
  imageOpacity: 0.88,
  dotScale: 0.78,
  contrast: 0.82,
  logoScale: 0.22,
  minVersion: 7,
  ecc: "H",
  transparentBg: false,
  artisticStrength: 0.42,
  effect: "none",
  maskPattern: -1,
};
