import { create } from "zustand";
import {
  DEFAULT_ART_URL,
  DEFAULT_STYLE,
  emptyPayload,
  type Payload,
  type PayloadKind,
  type QrStyle,
} from "@/lib/qr/types";
import { getPreset } from "@/lib/qr/presets";
import type { FrameKind } from "@/lib/qr/finish";
import { type UseCaseId, useCaseById } from "@/lib/qr/usecase";

export interface HistoryItem {
  id: string;
  createdAt: number;
  label: string;
  payload: Payload;
  style: QrStyle;
  imageUrl: string | null;
  thumb: string;
  caption?: string;
  frame?: FrameKind;
}

export type StageBgMood = "vibrant" | "cosmic" | "waves" | "minimal";
export type StudioTab = "content" | "image" | "presets" | "design" | "library";

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
  mobileTab: StudioTab;
  caption: string;
  frame: FrameKind;
  useCase: UseCaseId | null;
  lastFixNotes: string[];
  smartArt: boolean;
  rendering: boolean;
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
  setMobileTab: (tab: StudioTab) => void;
  setCaption: (caption: string) => void;
  setFrame: (frame: FrameKind) => void;
  applyUseCase: (id: UseCaseId) => void;
  setFixNotes: (notes: string[]) => void;
  setSmartArt: (smartArt: boolean) => void;
  setRendering: (rendering: boolean) => void;
  pushHistory: (item: Omit<HistoryItem, "id" | "createdAt">) => void;
  loadHistoryItem: (id: string) => void;
  deleteHistoryItem: (id: string) => void;
  remixHistoryItem: (id: string) => void;
  hydrateHistory: () => void;
}

const HISTORY_KEY = "qrwho-history-v1";

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
  payload: {
    ...emptyPayload(),
    url: "https://qrwho.vercel.app",
  },
  style: { ...DEFAULT_STYLE },
  imageUrl: DEFAULT_ART_URL,
  logoUrl: null,
  presetId: "art-alpine-summit",
  category: "Art",
  stageBg: "cosmic",
  scanText: null,
  scanOk: null,
  error: null,
  history: [],
  mobileTab: "content",
  caption: "",
  frame: "none",
  useCase: null,
  lastFixNotes: [],
  smartArt: false,
  rendering: false,
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
    if (preset.artUrl) {
      set({
        presetId: id,
        imageUrl: preset.artUrl,
        style: {
          ...preset.style,
          imageMode: preset.style.imageMode || "paint",
        },
      });
      return;
    }
    const keepPhoto = Boolean(current.imageUrl) && current.imageUrl !== DEFAULT_ART_URL;
    const nextMode = keepPhoto
      ? current.style.imageMode === "none"
        ? "paint"
        : current.style.imageMode
      : "none";
    set({
      presetId: id,
      style: {
        ...preset.style,
        imageMode: nextMode,
      },
    });
  },
  setImageUrl: (url) =>
    set((s) => {
      if (s.imageUrl?.startsWith("blob:") && s.imageUrl !== url) {
        URL.revokeObjectURL(s.imageUrl);
      }
      return {
        imageUrl: url,
        style: {
          ...s.style,
          imageMode: url ? (s.style.imageMode === "none" ? "paint" : s.style.imageMode) : "none",
        },
      };
    }),
  setLogoUrl: (url) =>
    set((s) => {
      if (s.logoUrl?.startsWith("blob:") && s.logoUrl !== url) {
        URL.revokeObjectURL(s.logoUrl);
      }
      return { logoUrl: url };
    }),
  setCategory: (category) => set({ category }),
  setStageBg: (stageBg) => set({ stageBg }),
  setScan: (scanOk, scanText) => set({ scanOk, scanText }),
  setError: (error) => set({ error }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setCaption: (caption) => set({ caption }),
  setFrame: (frame) => set({ frame }),
  applyUseCase: (id) => {
    const rec = useCaseById(id);
    set((s) => ({
      useCase: id,
      caption: rec.caption,
      style: { ...s.style, ...rec.patch },
    }));
  },
  setFixNotes: (lastFixNotes) => set({ lastFixNotes }),
  setSmartArt: (smartArt) => set({ smartArt }),
  setRendering: (rendering) => set({ rendering }),
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
      caption: item.caption ?? "",
      frame: item.frame ?? "none",
    });
  },
  deleteHistoryItem: (id) => {
    const history = get().history.filter((h) => h.id !== id);
    set({ history });
    persist(history);
  },
  remixHistoryItem: (id) => {
    const item = get().history.find((h) => h.id === id);
    if (!item) return;
    set({
      style: item.style,
      imageUrl: item.imageUrl,
      caption: item.caption ?? "",
      frame: item.frame ?? "none",
      presetId: null,
      mobileTab: "content",
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
