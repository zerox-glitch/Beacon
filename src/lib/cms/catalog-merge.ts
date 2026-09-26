/**
 * Template catalog merge — pure, unit-tested. Turns the built-in code presets
 * plus the admin-managed `qr_templates` rows into the list the public site
 * renders. Hidden templates are filtered HERE (and re-filtered server-side on
 * the public API, so hidden rows never even cross the wire).
 *
 * A template row is either an OVERRIDE (its id matches a built-in preset:
 * rename / recategorize / restyle / hide / feature) or a CUSTOM template (id
 * starts with "cms-": a full new preset built on DEFAULT_STYLE).
 */
import { DEFAULT_STYLE } from "../qr/types.ts";
import type { Preset, QrStyle } from "../qr/types.ts";
import { DEFAULT_SAMPLE_URL } from "../qr/types.ts";

/** Admin-managed category layer (see schemas.ts `categoryDocSchema`). */
export interface CategoryDoc {
  /** raw category -> display name. Renaming never edits template rows. */
  renames?: Record<string, string>;
  /** Gallery tab order. Names not listed keep their first-seen order after. */
  order?: string[];
}

export const DEFAULT_CATEGORIES: CategoryDoc = { renames: {}, order: [] };

/** Apply the admin rename map to one raw category string. */
export function displayCategory(name: string | null | undefined, renames?: Record<string, string>): string {
  const raw = (name ?? "Custom").trim() || "Custom";
  const mapped = renames?.[raw]?.trim();
  return mapped && mapped !== raw ? mapped : raw;
}

/** Sort category names by the admin order, unknown ones following in order of appearance. */
export function orderCategories(names: string[], order?: readonly string[]): string[] {
  if (!order?.length) return names;
  const rank = new Map(order.map((n, i) => [n, i]));
  return [...names].sort((a, b) => {
    const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

/** Wire shape of a `qr_templates` row (public API: only hidden=false rows). */
export interface TemplateRow {
  id: string;
  name: string | null;
  category: string | null;
  blurb: string | null;
  artUrl: string | null;
  style: Partial<QrStyle> | null;
  featured: boolean | null;
  hidden: boolean;
  sort: number;
  isCustom: boolean;
  /** NULL/undefined = auto: compatible iff the template declares a photo mode. */
  imageCompatible?: boolean | null;
  /** Admin-picked: the studio applies this template when it opens. */
  isDefault?: boolean;
}

export interface VisibleCatalog {
  presets: Preset[];
  categories: string[];
  /** id -> true for every built-in/custom template the admin hid (admin view only). */
  hiddenIds: ReadonlySet<string>;
}

/**
 * Merge built-ins with DB rows.
 * @param base  built-in presets (order preserved for non-custom rows)
 * @param rows  visible template rows from `qr_templates`
 * @param opts.includeHidden  admin view: keep hidden entries, expose hiddenIds
 */
export function mergeCatalog(
  base: Preset[],
  rows: TemplateRow[],
  opts: { includeHidden?: boolean; categories?: CategoryDoc } = {},
): VisibleCatalog {
  const renames = opts.categories?.renames;
  const show = (c: string | null | undefined) => displayCategory(c, renames);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const hiddenIds = new Set(rows.filter((r) => r.hidden).map((r) => r.id));

  const merged: Preset[] = [];
  for (const preset of base) {
    const row = byId.get(preset.id);
    if (!row) {
      merged.push(showCategory(preset, show));
      continue;
    }
    if (row.hidden && !opts.includeHidden) continue;
    merged.push(showCategory(applyOverride(preset, row), show));
  }

  const customs: Array<{ sort: number; idx: number; preset: Preset }> = [];
  rows.forEach((row, idx) => {
    if (!row.isCustom) return;
    if (row.hidden && !opts.includeHidden) return;
    customs.push({ sort: row.sort, idx, preset: showCategory(rowToPreset(row), show) });
  });
  customs.sort((a, b) => a.sort - b.sort || a.idx - b.idx);
  // Negative sort => pinned to the front; >= 0 => appended after the
  // built-ins, still ascending by sort.
  for (const c of customs) {
    if (c.sort < 0) merged.unshift(c.preset);
    else merged.push(c.preset);
  }

  const categories = orderCategories(
    Array.from(new Set(merged.map((p) => p.category))).filter(Boolean),
    opts.categories?.order,
  );
  return { presets: merged, categories, hiddenIds };
}

/** Swap a preset's category for its admin display name (rename layer). */
function showCategory(preset: Preset, show: (c: string | null | undefined) => string): Preset {
  const next = show(preset.category);
  return next === preset.category ? preset : { ...preset, category: next };
}

function applyOverride(preset: Preset, row: TemplateRow): Preset {
  const style = row.style ? { ...preset.style, ...row.style } : preset.style;
  return {
    ...preset,
    // An override that switches the image mode re-derives compat — unless the
    // admin pinned it explicitly.
    imageCompatible: row.imageCompatible ?? (row.style ? worksWithImages({ style }) : (preset.imageCompatible ?? worksWithImages({ style: preset.style }))),
    style,
    name: row.name ?? preset.name,
    category: row.category ?? preset.category,
    blurb: row.blurb ?? preset.blurb,
    artUrl: row.artUrl ?? preset.artUrl,
    featured: row.featured ?? preset.featured,
  };
}

export function rowToPreset(row: TemplateRow): Preset {
  const style: QrStyle = { ...DEFAULT_STYLE, ...(row.style ?? {}) };
  return {
    id: row.id,
    name: row.name ?? "Untitled template",
    category: row.category ?? "Custom",
    blurb: row.blurb ?? undefined,
    artUrl: row.artUrl ?? undefined,
    featured: row.featured ?? false,
    imageCompatible: row.imageCompatible ?? worksWithImages({ style }),
    style,
  };
}

/**
 * Can this template carry a photo? Explicit admin flag wins; otherwise a
 * template is photo-ready exactly when it declares a photo image mode.
 * (Takes the shape loosely so rowToPreset can bootstrap from a style alone.)
 */
export function worksWithImages(preset: { imageCompatible?: boolean; style?: QrStyle }): boolean {
  if (typeof preset.imageCompatible === "boolean") return preset.imageCompatible;
  const mode = preset.style?.imageMode;
  return mode !== undefined && mode !== "none";
}

/** Admin list view: every row against the built-ins, hidden ones retained + flagged. */
export function adminCatalog(
  base: Preset[],
  rows: TemplateRow[],
  opts: { categories?: CategoryDoc } = {},
): Array<Preset & { hidden: boolean; isCustom: boolean; sort: number; overridden: boolean; isDefault: boolean }> {
  const show = (c: string | null | undefined) => displayCategory(c, opts.categories?.renames);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: Array<Preset & { hidden: boolean; isCustom: boolean; sort: number; overridden: boolean; isDefault: boolean }> = [];
  for (const preset of base) {
    const row = byId.get(preset.id);
    out.push({
      ...showCategory(row ? applyOverride(preset, row) : preset, show),
      hidden: row?.hidden ?? false,
      isCustom: false,
      sort: row?.sort ?? 0,
      overridden: Boolean(row),
      isDefault: row?.isDefault ?? false,
    });
  }
  for (const row of rows) {
    if (!row.isCustom) continue;
    out.push({
      ...showCategory(rowToPreset(row), show),
      hidden: row.hidden,
      isCustom: true,
      sort: row.sort,
      overridden: true,
      isDefault: row.isDefault ?? false,
    });
  }
  return out;
}

export function newTemplateId(): string {
  const rnd =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `cms-${rnd}`;
}

/* ------------------------------ landing samples ------------------------------ */

/** A resolved sample: the template to render + the card's label/destination. */
export interface SampleRef {
  preset: Preset;
  label: string;
  url: string;
}

/**
 * Resolve a samples document against the merged catalog. Each section is
 * independent: an EMPTY doc section falls back to the curated id list (a
 * fresh install renders exactly what the hardcoded landing showed); a
 * non-empty section is honored in admin order. Unknown ids and hidden
 * templates are skipped; duplicates collapse to the first occurrence.
 */
/** A samples-doc entry as authored (post-zod it always has url; the pure
 * resolver stays lenient so tests and client drafts can pass partials). */
type SampleEntryLike = { presetId: string; label?: string; url?: string };

export function resolveSamples(
  doc: { grid: SampleEntryLike[]; hero: SampleEntryLike[] } | null | undefined,
  presets: readonly Preset[],
  hiddenIds: ReadonlySet<string>,
  fallback: { grid: readonly string[]; hero: readonly string[] },
): { grid: SampleRef[]; hero: SampleRef[] } {
  const byId = new Map(presets.map((p) => [p.id, p]));
  const resolve = (entries: SampleEntryLike[] | undefined, fallbackIds: readonly string[], cap: number) => {
    const out: SampleRef[] = [];
    const seen = new Set<string>();
    const take = (id: string, entry?: SampleEntryLike) => {
      if (seen.has(id) || hiddenIds.has(id)) return;
      const preset = byId.get(id);
      if (!preset) return;
      seen.add(id);
      out.push({ preset, label: (entry?.label ?? "").trim() || preset.name, url: (entry?.url ?? "").trim() || DEFAULT_SAMPLE_URL });
    };
    if (entries && entries.length) for (const e of entries) take(e.presetId, e);
    else for (const id of fallbackIds) take(id);
    return out.slice(0, cap);
  };
  return {
    grid: resolve(doc?.grid, fallback.grid, 30),
    hero: resolve(doc?.hero, fallback.hero, 3),
  };
}
