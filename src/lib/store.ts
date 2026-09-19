import { create } from "zustand";
import { DEFAULT_STYLE, emptyPayload, type Payload, type PayloadKind, type QrStyle } from "@/lib/qr/types";
import { getPreset } from "@/lib/qr/presets";

export interface HistoryItem {
  id: string;
  createdAt: number;
  label: string;
  payload: Payload;
  style: QrStyle;
  imageUrl: string | null;
  thumb: string;
}

export type StageBgMood = "vibrant" | "cosmic" | "waves" | "minimal";

interface StudioState {
  payload: Payload;
  style: QrStyle;
  imageUrl: string | null;
  logoUrl: string | null;
  presetId: string | null;
  category: string;
  stageBg: StageBgMood;
  scanText: string | null;
  scanOk: boolean | null;
  error: string | null;
  history: HistoryItem[];
  mobileTab: "content" | "image" | "presets" | "design";
  setKind: (kind: PayloadKind) => void;
  patchPayload: (patch: Partial<Payload>) => void;
  patchStyle: (patch: Partial<QrStyle>) => void;
  applyPreset: (id: string) => void;
  setImageUrl: (url: string | null) => void;
  setLogoUrl: (url: string | null) => void;
  setCategory: (category: string) => void;
  setStageBg: (stageBg: StageBgMood) => void;
  setScan: (ok: boolean | null, text: string | null) => void;
  setError: (error: string | null) => void;
  setMobileTab: (tab: StudioState["mobileTab"]) => void;
  pushHistory: (item: Omit<HistoryItem, "id" | "createdAt">) => void;
  loadHistoryItem: (id: string) => void;
  hydrateHistory: () => void;
}

const HISTORY_KEY = "beacon-history-v1";

function persist(history: HistoryItem[]) {
  try {
    const slim = history.slice(0, 12).map((h) => ({
      ...h,
      imageUrl: h.imageUrl?.startsWith("blob:") ? null : h.imageUrl,
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    /* quota */
  }
}

export const useStudio = create<StudioState>((set, get) => ({
  payload: emptyPayload(),
  style: { ...DEFAULT_STYLE },
  imageUrl: "/samples/ink.jpg",
  logoUrl: null,
  presetId: null,
  category: "All",
  stageBg: "vibrant",
  scanText: null,
  scanOk: null,
  error: null,
  history: [],
  mobileTab: "content",
  setKind: (kind) => set((s) => ({ payload: { ...s.payload, kind } })),
  patchPayload: (patch) => set((s) => ({ payload: { ...s.payload, ...patch } })),
  patchStyle: (patch) =>
    set((s) => ({
      style: { ...s.style, ...patch },
      presetId: null,
    })),
  applyPreset: (id) => {
    const preset = getPreset(id);
    if (!preset) return;
    const current = get();
    const keepMode =
      preset.style.imageMode === "none"
        ? "none" // pure-art presets stay pure; re-enable photos from the Image tab
        : current.imageUrl && current.style.imageMode !== "none"
          ? current.style.imageMode
          : current.imageUrl
            ? "paint"
            : preset.style.imageMode;
    set({
      presetId: id,
      style: {
        ...preset.style,
        imageMode: keepMode,
        minVersion: current.style.minVersion,
        dotScale: current.style.dotScale,
        contrast: current.style.contrast,
        logoScale: current.style.logoScale,
        quietZone: current.style.quietZone,
        transparentBg: current.style.transparentBg,
        ecc: current.style.ecc,
      },
    });
  },
  setImageUrl: (url) =>
    set((s) => ({
      imageUrl: url,
      style: {
        ...s.style,
        imageMode: url ? (s.style.imageMode === "none" ? "paint" : s.style.imageMode) : "none",
      },
    })),
  setLogoUrl: (url) => set({ logoUrl: url }),
  setCategory: (category) => set({ category }),
  setStageBg: (stageBg) => set({ stageBg }),
  setScan: (scanOk, scanText) => set({ scanOk, scanText }),
  setError: (error) => set({ error }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  pushHistory: (item) => {
    const entry: HistoryItem = {
      ...item,
      id: `${Date.now()}`,
      createdAt: Date.now(),
    };
    const history = [entry, ...get().history].slice(0, 12);
    set({ history });
    persist(history);
  },
  loadHistoryItem: (id) => {
    const item = get().history.find((h) => h.id === id);
    if (!item) return;
    set({
      payload: item.payload,
      style: item.style,
      imageUrl: item.imageUrl,
      presetId: null,
    });
  },
  hydrateHistory: () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (Array.isArray(parsed)) set({ history: parsed.slice(0, 12) });
    } catch {
      /* ignore */
    }
  },
}));
