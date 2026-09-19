import { DEFAULT_STYLE, type ModuleShape, type EyeShape, type Preset, type QrStyle } from "./types";

interface Palette {
  id: string;
  name: string;
  cat: string;
  fg: string;
  bg: string;
  eye: string;
  ball: string;
  to?: string;
}

interface Kit {
  key: string;
  label: string;
  module: ModuleShape;
  eye: EyeShape;
  ball: EyeShape;
  gap?: number;
}

const PALETTES: Palette[] = [
  { id: "ink", name: "Ink", cat: "Classic", fg: "#141412", bg: "#f4f1ea", eye: "#141412", ball: "#141412" },
  { id: "ghost", name: "Ghost", cat: "Classic", fg: "#f4f1ea", bg: "#141412", eye: "#f4f1ea", ball: "#f4f1ea" },
  { id: "newsprint", name: "Newsprint", cat: "Classic", fg: "#1c1916", bg: "#e8e0d4", eye: "#1c1916", ball: "#1c1916" },
  { id: "navy", name: "Navy", cat: "Classic", fg: "#0f2744", bg: "#f3f1ec", eye: "#0f2744", ball: "#0c1d33" },
  { id: "slate", name: "Slate", cat: "Classic", fg: "#3a4048", bg: "#eef0f2", eye: "#2a3036", ball: "#2a3036" },
  { id: "carbon", name: "Carbon", cat: "Classic", fg: "#e7e7e4", bg: "#1a1b1d", eye: "#e7e7e4", ball: "#cfd0cc" },
  { id: "ivory", name: "Ivory", cat: "Classic", fg: "#4a3f32", bg: "#f7f1e4", eye: "#3a3228", ball: "#3a3228" },
  { id: "lead", name: "Lead", cat: "Classic", fg: "#2b2e32", bg: "#d8dde2", eye: "#1a1c1f", ball: "#1a1c1f" },
  { id: "moss", name: "Moss", cat: "Nature", fg: "#2f4a38", bg: "#e8f0e6", eye: "#1e3326", ball: "#1e3326" },
  { id: "pine", name: "Pine", cat: "Nature", fg: "#e5efe4", bg: "#1c2b22", eye: "#e5efe4", ball: "#c5d8c2" },
  { id: "fern", name: "Fern", cat: "Nature", fg: "#3d6b4f", bg: "#f2f6ef", eye: "#2a4a36", ball: "#2a4a36", to: "#7da36a" },
  { id: "ocean", name: "Ocean", cat: "Nature", fg: "#164e63", bg: "#e8f4f8", eye: "#0e3a4a", ball: "#0e3a4a", to: "#1d7a8c" },
  { id: "tide", name: "Tide", cat: "Nature", fg: "#e6f3f4", bg: "#12343c", eye: "#e6f3f4", ball: "#b7d9dc" },
  { id: "coral", name: "Coral", cat: "Nature", fg: "#c45c4a", bg: "#fbf1ee", eye: "#8f3d32", ball: "#8f3d32" },
  { id: "sand", name: "Sand", cat: "Nature", fg: "#8a6a44", bg: "#f6ecd8", eye: "#5c452c", ball: "#5c452c" },
  { id: "clay", name: "Clay", cat: "Nature", fg: "#7a4b3a", bg: "#f3e6dc", eye: "#5a3226", ball: "#5a3226" },
  { id: "dusk", name: "Dusk", cat: "Sky", fg: "#2c3654", bg: "#ece8f0", eye: "#1b2238", ball: "#1b2238", to: "#5a6b8a" },
  { id: "dawn", name: "Dawn", cat: "Sky", fg: "#c46a4a", bg: "#fdeee4", eye: "#8d4430", ball: "#8d4430", to: "#e8a87a" },
  { id: "storm", name: "Storm", cat: "Sky", fg: "#4a5564", bg: "#d9e2ec", eye: "#2d3642", ball: "#2d3642" },
  { id: "fog", name: "Fog", cat: "Sky", fg: "#6b7280", bg: "#f3f4f6", eye: "#374151", ball: "#374151" },
  { id: "glacier", name: "Glacier", cat: "Sky", fg: "#3d6a78", bg: "#eaf4f6", eye: "#1f4450", ball: "#1f4450", to: "#7eb0bd" },
  { id: "horizon", name: "Horizon", cat: "Sky", fg: "#2a4a62", bg: "#f4efe6", eye: "#1a3142", ball: "#1a3142", to: "#d9845c" },
  { id: "noon", name: "Noon", cat: "Sky", fg: "#1e5f8a", bg: "#eef6fb", eye: "#13405e", ball: "#13405e" },
  { id: "mist", name: "Mist", cat: "Sky", fg: "#5c6d70", bg: "#e7eeef", eye: "#3a4749", ball: "#3a4749" },
  { id: "ember", name: "Ember", cat: "Ember", fg: "#c45c2a", bg: "#1a120e", eye: "#e8a060", ball: "#f3d2a6" },
  { id: "coal", name: "Coal", cat: "Ember", fg: "#f0dcc4", bg: "#1c1612", eye: "#f0dcc4", ball: "#d4b896" },
  { id: "rust", name: "Rust", cat: "Ember", fg: "#a84832", bg: "#f6ebe4", eye: "#6e2e20", ball: "#6e2e20" },
  { id: "copper", name: "Copper", cat: "Ember", fg: "#b87333", bg: "#1a1410", eye: "#e0a060", ball: "#c88848" },
  { id: "brick", name: "Brick", cat: "Ember", fg: "#8f3a32", bg: "#f7eeea", eye: "#5c241e", ball: "#5c241e" },
  { id: "wine", name: "Wine", cat: "Ember", fg: "#6e2436", bg: "#f8eef1", eye: "#4a1824", ball: "#4a1824" },
  { id: "cherry", name: "Cherry", cat: "Ember", fg: "#b03040", bg: "#fdecee", eye: "#7a1e2a", ball: "#7a1e2a" },
  { id: "maple", name: "Maple", cat: "Ember", fg: "#c46b2e", bg: "#fbf1e6", eye: "#8a4518", ball: "#8a4518" },
  { id: "film", name: "Film", cat: "Studio", fg: "#22201c", bg: "#d9d2c5", eye: "#22201c", ball: "#22201c" },
  { id: "sepia", name: "Sepia", cat: "Studio", fg: "#5c4632", bg: "#efe3cd", eye: "#3e2e20", ball: "#3e2e20" },
  { id: "chrome", name: "Chrome", cat: "Studio", fg: "#9aa3ad", bg: "#1c1e22", eye: "#d0d6dc", ball: "#eceff2" },
  { id: "brass", name: "Brass", cat: "Studio", fg: "#c6a25a", bg: "#16140f", eye: "#e8d09a", ball: "#f0e4c0" },
  { id: "velvet", name: "Velvet", cat: "Studio", fg: "#d8d0c8", bg: "#241c1c", eye: "#d8d0c8", ball: "#b8b0a8" },
  { id: "porcelain", name: "Porcelain", cat: "Studio", fg: "#4a5a62", bg: "#f4f6f5", eye: "#2f3c42", ball: "#2f3c42" },
  { id: "onyx", name: "Onyx", cat: "Studio", fg: "#0e0e0e", bg: "#f7f7f5", eye: "#0e0e0e", ball: "#0e0e0e" },
  { id: "pearl", name: "Pearl", cat: "Studio", fg: "#8a8680", bg: "#f8f5f0", eye: "#3a3834", ball: "#3a3834" },
  { id: "electric", name: "Electric", cat: "Pulse", fg: "#1d9bf0", bg: "#0b1220", eye: "#e8f4fc", ball: "#1d9bf0" },
  { id: "cyan", name: "Cyan", cat: "Pulse", fg: "#22c3d6", bg: "#07151a", eye: "#dff6fa", ball: "#22c3d6" },
  { id: "mint", name: "Mint", cat: "Pulse", fg: "#3dba8b", bg: "#0d1a16", eye: "#d8f5ea", ball: "#3dba8b" },
  { id: "lime", name: "Lime", cat: "Pulse", fg: "#b6d66c", bg: "#14180c", eye: "#eef6d4", ball: "#b6d66c" },
  { id: "tangerine", name: "Tangerine", cat: "Pulse", fg: "#f08a3a", bg: "#1a120c", eye: "#fde4cc", ball: "#f08a3a" },
  { id: "cobalt", name: "Cobalt", cat: "Pulse", fg: "#3a6fd6", bg: "#0c1220", eye: "#d6e4fa", ball: "#3a6fd6" },
  { id: "berry", name: "Berry", cat: "Pulse", fg: "#d44a6a", bg: "#1a0e14", eye: "#fad8e0", ball: "#d44a6a" },
  { id: "ice", name: "Ice", cat: "Pulse", fg: "#a8d4e8", bg: "#102028", eye: "#eef6fa", ball: "#a8d4e8" },
];

const KIT_POOL: Kit[] = [
  { key: "cut", label: "Cut", module: "square", eye: "square", ball: "square" },
  { key: "drop", label: "Drop", module: "dots", eye: "circle", ball: "circle", gap: 0.04 },
  { key: "bloom", label: "Bloom", module: "fluid", eye: "extra-rounded", ball: "rounded" },
  { key: "gem", label: "Gem", module: "diamond", eye: "diamond", ball: "diamond", gap: 0.06 },
  { key: "petal", label: "Petal", module: "leaf", eye: "leaf", ball: "circle" },
  { key: "nova", label: "Nova", module: "star", eye: "circle", ball: "circle", gap: 0.05 },
  { key: "plus", label: "Plus", module: "plus", eye: "rounded", ball: "square", gap: 0.08 },
  { key: "classy", label: "Classy", module: "classy", eye: "classy", ball: "rounded" },
  { key: "hex", label: "Hex", module: "hex", eye: "hex", ball: "hex", gap: 0.04 },
  { key: "heart", label: "Heart", module: "heart", eye: "rounded", ball: "rounded", gap: 0.06 },
  { key: "soft", label: "Soft", module: "rounded", eye: "rounded", ball: "rounded", gap: 0.05 },
  { key: "puff", label: "Puff", module: "squircle", eye: "extra-rounded", ball: "circle", gap: 0.03 },
];

function styleFrom(p: Palette, kit: Kit, featured: boolean): QrStyle {
  const useGrad = Boolean(p.to) && (kit.key === "bloom" || kit.key === "soft" || kit.key === "puff");
  return {
    ...DEFAULT_STYLE,
    moduleShape: kit.module,
    eyeShape: kit.eye,
    ballShape: kit.ball,
    fg: p.fg,
    bg: p.bg,
    eyeColor: p.eye,
    ballColor: p.ball,
    gradientType: useGrad ? "diagonal" : "none",
    gradientTo: p.to ?? p.fg,
    moduleGap: kit.gap ?? 0,
    imageMode: featured ? "paint" : "paint",
    quietZone: 2,
  };
}

function buildPresets(): Preset[] {
  const list: Preset[] = [];
  PALETTES.forEach((palette, i) => {
    const kits = [0, 4, 8].map((off) => KIT_POOL[(i + off) % KIT_POOL.length]!);
    kits.forEach((kit, ki) => {
      const featured = i < 4 && ki === 0;
      list.push({
        id: `${palette.id}-${kit.key}`,
        name: `${palette.name} ${kit.label}`,
        category: palette.cat,
        featured,
        style: styleFrom(palette, kit, featured),
      });
    });
  });
  return list;
}

/**
 * Hand-tuned "art" presets inspired by designer QR galleries: confetti dashes,
 * halftone bubbles, diagonal streaks, radial bursts and two-tone accent pops.
 * They render pure (imageMode "none") so the artwork itself is the star.
 */
function art(p: Omit<Preset, "style"> & { style: Partial<QrStyle> }): Preset {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    featured: p.featured,
    style: { ...DEFAULT_STYLE, imageMode: "none", minVersion: 6, ecc: "H", ...p.style },
  };
}

const ART_PRESETS: Preset[] = [
  art({
    id: "arcade-dash",
    name: "Arcade",
    category: "Fresh",
    style: {
      moduleShape: "dash",
      eyeShape: "target",
      ballShape: "circle",
      fg: "#2743c7",
      bg: "#f2f1ee",
      eyeColor: "#e08c00",
      ballColor: "#e08c00",
      accentShape: "cross",
      accentColor: "#b3271c",
      moduleGap: 0.06,
    },
  }),
  art({
    id: "sweet-heart",
    name: "Sweetheart",
    category: "Fresh",
    style: {
      moduleShape: "heart",
      eyeShape: "rounded",
      ballShape: "rounded",
      fg: "#d0524a",
      bg: "#fbeeec",
      eyeColor: "#d0524a",
      ballColor: "#d0524a",
      moduleGap: 0.04,
    },
  }),
  art({
    id: "confetti-pop",
    name: "Confetti",
    category: "Fresh",
    style: {
      moduleShape: "confetti",
      eyeShape: "ticks",
      ballShape: "rounded",
      fg: "#6b3d8f",
      bg: "#e9edd3",
      eyeColor: "#5b8a4a",
      ballColor: "#5b8a4a",
    },
  }),
  art({
    id: "bubble-gum",
    name: "Bubblegum",
    category: "Fresh",
    style: {
      moduleShape: "bubbles",
      eyeShape: "extra-rounded",
      ballShape: "extra-rounded",
      fg: "#2f3bc4",
      bg: "#ecd9e0",
      eyeColor: "#2f3bc4",
      ballColor: "#2f3bc4",
    },
  }),
  art({
    id: "pixel-pop",
    name: "Pixel Pop",
    category: "Fresh",
    style: {
      moduleShape: "square",
      eyeShape: "square",
      ballShape: "square",
      fg: "#101826",
      bg: "#4a7fb5",
      eyeColor: "#16305e",
      ballColor: "#16305e",
      accentShape: "dots",
      accentColor: "#e8d47a",
      accentOnLight: true,
      moduleGap: 0.08,
    },
  }),
  art({
    id: "streak-lime",
    name: "Streak",
    category: "Fresh",
    style: {
      moduleShape: "diag",
      eyeShape: "ticks",
      ballShape: "square",
      fg: "#c8f05a",
      bg: "#232b06",
      eyeColor: "#c8f05a",
      ballColor: "#c8f05a",
    },
  }),
  art({
    id: "burst-ember",
    name: "Burst",
    category: "Fresh",
    style: {
      moduleShape: "radial",
      eyeShape: "square",
      ballShape: "square",
      fg: "#e03a24",
      bg: "#250502",
      eyeColor: "#e03a24",
      ballColor: "#e03a24",
    },
  }),
  art({
    id: "circuit-teal",
    name: "Circuit",
    category: "Fresh",
    style: {
      moduleShape: "dash",
      eyeShape: "ticks",
      ballShape: "square",
      fg: "#7fd0c4",
      bg: "#160d1a",
      eyeColor: "#7fd0c4",
      ballColor: "#e06298",
      moduleGap: 0.05,
    },
  }),
  art({
    id: "art-ukiyo",
    name: "Ukiyo Wave",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "fluid",
      eyeShape: "leaf",
      ballShape: "leaf",
      fg: "#164e63",
      bg: "#f4efe6",
      eyeColor: "#0e3a4a",
      ballColor: "#0e3a4a",
      gradientType: "diagonal",
      gradientTo: "#1d7a8c",
      moduleGap: 0.02,
    },
  }),
  art({
    id: "art-neon-fungi",
    name: "Neon Fungi",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "bubbles",
      eyeShape: "circle",
      ballShape: "circle",
      fg: "#3dba8b",
      bg: "#0b1210",
      eyeColor: "#d8f5ea",
      ballColor: "#22c3d6",
      gradientType: "diagonal",
      gradientTo: "#22c3d6",
    },
  }),
  art({
    id: "art-pixel-quest",
    name: "Pixel Quest",
    category: "Art",
    style: {
      moduleShape: "square",
      eyeShape: "square",
      ballShape: "square",
      fg: "#3d6b4f",
      bg: "#e8f0e6",
      eyeColor: "#2a4a36",
      ballColor: "#2a4a36",
      moduleGap: 0.05,
    },
  }),
  art({
    id: "art-tiger",
    name: "Tiger Stripe",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "diag",
      eyeShape: "square",
      ballShape: "square",
      fg: "#b3541e",
      bg: "#f6ecd8",
      eyeColor: "#141412",
      ballColor: "#141412",
      moduleGap: 0.05,
    },
  }),
  art({
    id: "art-sakura",
    name: "Sakura Bloom",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "heart",
      eyeShape: "leaf",
      ballShape: "rounded",
      fg: "#d44a6a",
      bg: "#fdecee",
      eyeColor: "#5b8a4a",
      ballColor: "#d44a6a",
      moduleGap: 0.04,
    },
  }),
  art({
    id: "art-galaxy",
    name: "Galaxy Burst",
    category: "Art",
    style: {
      moduleShape: "radial",
      eyeShape: "rounded",
      ballShape: "rounded",
      fg: "#a8d4e8",
      bg: "#101426",
      eyeColor: "#eef6fa",
      ballColor: "#a8d4e8",
    },
  }),
  art({
    id: "art-royal",
    name: "Royal Gold",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "classy",
      eyeShape: "classy",
      ballShape: "rounded",
      fg: "#c6a25a",
      bg: "#16140f",
      eyeColor: "#e8d09a",
      ballColor: "#f0e4c0",
      gradientType: "linear",
      gradientTo: "#f0e4c0",
      quietZone: 3,
    },
  }),
  art({
    id: "art-matrix",
    name: "Matrix Terminal",
    category: "Art",
    style: {
      moduleShape: "dash",
      eyeShape: "hex",
      ballShape: "hex",
      fg: "#3dba8b",
      bg: "#07151a",
      eyeColor: "#d8f5ea",
      ballColor: "#3dba8b",
    },
  }),
  art({
    id: "art-candy",
    name: "Candy Pop",
    category: "Art",
    style: {
      moduleShape: "bubbles",
      eyeShape: "target",
      ballShape: "circle",
      fg: "#d44a6a",
      bg: "#fdecee",
      eyeColor: "#e08c00",
      ballColor: "#d44a6a",
    },
  }),
  art({
    id: "art-aurora",
    name: "Aurora Glow",
    category: "Art",
    style: {
      moduleShape: "fluid",
      eyeShape: "extra-rounded",
      ballShape: "extra-rounded",
      fg: "#3dba8b",
      bg: "#0d1a16",
      eyeColor: "#d8f5ea",
      ballColor: "#3a6fd6",
      gradientType: "linear",
      gradientTo: "#3a6fd6",
    },
  }),
  art({
    id: "art-ember",
    name: "Ember Storm",
    category: "Art",
    style: {
      moduleShape: "confetti",
      eyeShape: "rounded",
      ballShape: "rounded",
      fg: "#f08a3a",
      bg: "#1a120c",
      eyeColor: "#fde4cc",
      ballColor: "#f08a3a",
      gradientType: "diagonal",
      gradientTo: "#b03040",
    },
  }),
  art({
    id: "art-mono",
    name: "Mono Luxe",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "classy",
      eyeShape: "square",
      ballShape: "square",
      fg: "#0e0e0e",
      bg: "#f7f7f5",
      eyeColor: "#0e0e0e",
      ballColor: "#0e0e0e",
      quietZone: 3,
    },
  }),
  art({
    id: "art-cyberpunk",
    name: "Cyberpunk 2099",
    category: "Art",
    featured: true,
    style: {
      moduleShape: "dash",
      eyeShape: "ticks",
      ballShape: "square",
      fg: "#ff2a85",
      bg: "#0a0a14",
      eyeColor: "#00f0ff",
      ballColor: "#00f0ff",
      gradientType: "diagonal",
      gradientTo: "#7928ca",
      moduleGap: 0.04,
    },
  }),
  art({
    id: "art-synthwave",
    name: "Synthwave Sunset",
    category: "Art",
    style: {
      moduleShape: "fluid",
      eyeShape: "rounded",
      ballShape: "rounded",
      fg: "#ff7b00",
      bg: "#180e29",
      eyeColor: "#ff7b00",
      ballColor: "#ffd000",
      gradientType: "linear",
      gradientTo: "#9b00e8",
    },
  }),
  art({
    id: "art-stained-glass",
    name: "Stained Glass",
    category: "Art",
    style: {
      moduleShape: "diamond",
      eyeShape: "diamond",
      ballShape: "diamond",
      fg: "#3b82f6",
      bg: "#111827",
      eyeColor: "#ec4899",
      ballColor: "#8b5cf6",
      gradientType: "diagonal",
      gradientTo: "#ef4444",
      moduleGap: 0.05,
    },
  }),
  art({
    id: "art-desert",
    name: "Desert Mirage",
    category: "Art",
    style: {
      moduleShape: "diag",
      eyeShape: "classy",
      ballShape: "rounded",
      fg: "#c2410c",
      bg: "#fef3c7",
      eyeColor: "#78350f",
      ballColor: "#78350f",
      moduleGap: 0.04,
    },
  }),
  art({
    id: "art-botanical",
    name: "Botanical Sage",
    category: "Art",
    style: {
      moduleShape: "leaf",
      eyeShape: "leaf",
      ballShape: "circle",
      fg: "#2d5a27",
      bg: "#f3f6f0",
      eyeColor: "#1e3d1a",
      ballColor: "#1e3d1a",
      moduleGap: 0.04,
    },
  }),
  art({
    id: "art-midnight",
    name: "Midnight Starlight",
    category: "Art",
    style: {
      moduleShape: "dots",
      eyeShape: "circle",
      ballShape: "circle",
      fg: "#93c5fd",
      bg: "#030712",
      eyeColor: "#fef08a",
      ballColor: "#60a5fa",
      moduleGap: 0.05,
    },
  }),
];

export const PRESETS: Preset[] = [...buildPresets(), ...ART_PRESETS];

export const PRESET_CATEGORIES: string[] = [
  "All",
  ...Array.from(new Set(PRESETS.map((p) => p.category))),
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export const SAMPLE_IMAGES: { id: string; name: string; src: string }[] = [
  { id: "ink", name: "Ink", src: "/samples/ink.jpg" },
  { id: "peony", name: "Peony", src: "/samples/peony.jpg" },
  { id: "cat", name: "Tabby", src: "/samples/cat.jpg" },
  { id: "lake", name: "Lake", src: "/samples/lake.jpg" },
  { id: "arch", name: "Stairs", src: "/samples/arch.jpg" },
  { id: "waves", name: "Waves", src: "/samples/waves.jpg" },
];
