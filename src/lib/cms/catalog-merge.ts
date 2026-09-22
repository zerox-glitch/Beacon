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
  return {
    ...preset,
    name: row.name ?? preset.name,
    category: row.category ?? preset.category,
    blurb: row.blurb ?? preset.blurb,
    artUrl: row.artUrl ?? preset.artUrl,
    featured: row.featured ?? preset.featured,
    style: row.style ? { ...preset.style, ...row.style } : preset.style,
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
    style,
  };
}

/** Admin list view: every row against the built-ins, hidden ones retained + flagged. */
export function adminCatalog(
  base: Preset[],
  rows: TemplateRow[],
  opts: { categories?: CategoryDoc } = {},
): Array<Preset & { hidden: boolean; isCustom: boolean; sort: number; overridden: boolean }> {
  const show = (c: string | null | undefined) => displayCategory(c, opts.categories?.renames);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: Array<Preset & { hidden: boolean; isCustom: boolean; sort: number; overridden: boolean }> = [];
  for (const preset of base) {
    const row = byId.get(preset.id);
    out.push({
      ...showCategory(row ? applyOverride(preset, row) : preset, show),
      hidden: row?.hidden ?? false,
      isCustom: false,
      sort: row?.sort ?? 0,
      overridden: Boolean(row),
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
