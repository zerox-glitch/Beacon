/**
 * Client-side CMS runtime — one shared, lazily fetched public bundle for the
 * public site (studio gallery, landing, SEO-aware chrome).
 *
 * The store is intentionally a tiny external store instead of React context so
 * non-component code (the zustand studio store, preset lookup helpers) can
 * synchronously read the merged catalog. Before the first fetch resolves every
 * selector falls back to the built-in code presets, so the SSR HTML and the
 * first client paint are identical and the app never blanks.
 */
import { useSyncExternalStore, useEffect } from "react";
import { PRESETS } from "@/lib/qr/presets";
import { mergeCatalog, type VisibleCatalog } from "./catalog-merge.ts";
import type { BrandDoc, ContentDoc, SamplesDoc, SeoDoc } from "./schemas.ts";
import { DEFAULT_BRAND, DEFAULT_CONTENT, DEFAULT_SAMPLES, DEFAULT_SEO } from "./schemas.ts";

export type CmsStatus = "idle" | "loading" | "ready" | "error";

export interface CmsState {
  status: CmsStatus;
  catalog: VisibleCatalog;
  brand: BrandDoc;
  content: ContentDoc;
  seo: SeoDoc;
  presetCount: number;
  /** Template the admin pinned as the studio's opening look (null = stock). */
  defaultTemplate: string | null;
  /** Landing sample grid/hero doc (empty sections = curated built-ins). */
  samplesDoc: SamplesDoc;
  error: string | null;
}

const INITIAL: CmsState = {
  status: "idle",
  catalog: mergeCatalog(PRESETS, []),
  brand: DEFAULT_BRAND,
  content: DEFAULT_CONTENT,
  seo: DEFAULT_SEO,
  presetCount: PRESETS.length,
  defaultTemplate: null,
  samplesDoc: DEFAULT_SAMPLES,
  error: null,
};

let state: CmsState = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCmsState(): CmsState {
  return state;
}

let inflight: Promise<void> | null = null;

/** Fetch the public bundle once; `force` bypasses the module-level latch. */
export function ensureCms(force = false): Promise<void> {
  if (inflight && !force) return inflight;
  if (state.status === "ready" && !force) return Promise.resolve();
  inflight = (async () => {
    state = { ...state, status: "loading", error: null };
    emit();
    try {
      const { getPublicCms } = await import("./public-api");
      const bundle = await getPublicCms();
      state = {
        status: "ready",
        catalog: mergeCatalog(PRESETS, bundle.templates, { categories: bundle.categories }),
        brand: bundle.brand,
        content: bundle.content,
        seo: bundle.seo,
        presetCount: PRESETS.length + bundle.templates.filter((t) => t.isCustom).length,
        defaultTemplate: bundle.defaultTemplate ?? null,
        samplesDoc: bundle.samples ?? DEFAULT_SAMPLES,
        error: null,
      };
    } catch (err) {
      state = { ...INITIAL, status: "error", error: (err as Error)?.message ?? "cms fetch failed" };
    } finally {
      inflight = null;
      emit();
    }
  })();
  return inflight;
}

/** Hook for React trees — triggers the first fetch on mount. */
export function useCms(): CmsState {
  const snap = useSyncExternalStore(subscribe, getCmsState, getCmsState);
  useEffect(() => {
    if (snap.status === "idle") void ensureCms();
  }, [snap.status]);
  return snap;
}

/* ----------------------------- sync selectors ------------------------------ */
/* (usable outside React — e.g. the studio store) */

export function visiblePresets(): readonly import("@/lib/qr/types").Preset[] {
  return state.catalog.presets;
}

export function presetCategories(): readonly string[] {
  return state.catalog.categories;
}

/** Merged lookup (custom + overridden built-ins); null when hidden or unknown. */
export function getPresetMerged(id: string): import("@/lib/qr/types").Preset | undefined {
  if (state.status === "ready" && state.catalog.hiddenIds.has(id)) return undefined;
  return state.catalog.presets.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === id);
}

export function isPresetHidden(id: string): boolean {
  return state.catalog.hiddenIds.has(id);
}
