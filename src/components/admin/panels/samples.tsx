/**
 * Landing samples — the "gallery, decoded" grid + the hero fan.
 *
 * Editing surface is the EFFECTIVE list (the saved doc, or the curated
 * built-in set when a section is empty), so what the admin sees is what the
 * landing shows; saving materializes the doc. Each entry is a catalog
 * template + optional label/destination overrides.
 */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Images, Plus, Search, Trash2 } from "lucide-react";
import { adminCatalog } from "@/lib/cms/catalog-merge";
import { saveSamplesDoc } from "@/lib/cms/admin-api";
import type { SampleEntry, SamplesDoc } from "@/lib/cms/schemas";
import { DEFAULT_SAMPLE_URL } from "@/lib/qr/types";
import { PRESETS } from "@/lib/qr/presets";
import { Button } from "@/components/ui/button";
import { Card, Modal, Note } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { RawJsonCard } from "./content";
import { TemplatePreview } from "./template-preview";
import { useAdminMutation, useAdminSettings } from "../session";
import type { AdminSettings } from "../types";

type Row = ReturnType<typeof adminCatalog>[number];

const GRID_IDS = [
  "art-neon-tokyo",
  "art-royal",
  "gal-duo-aurora",
  "art-alpine-summit",
  "gal-peony",
  "art-sakura",
  "gal-mono-lake",
  "art-ukiyo",
];
const HERO_IDS = ["art-neon-tokyo", "art-royal", "gal-duo-aurora"];

const entryFor = (presetId: string): SampleEntry => ({ presetId, url: DEFAULT_SAMPLE_URL });

export function SamplesPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const rows = useMemo<Row[]>(() => (data ? adminCatalog(PRESETS, data.templates, { categories: data.categories }) : []), [data]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const hiddenIds = useMemo(() => new Set(rows.filter((r) => r.hidden).map((r) => r.id)), [rows]);

  // Effective (what the landing renders): saved doc section, or the curated
  // fallback materialized as plain entries.
  const effective = useMemo<SamplesDoc>(() => {
    const grid = data?.samples?.grid?.length ? data.samples.grid : GRID_IDS.map(entryFor);
    const hero = data?.samples?.hero?.length ? data.samples.hero : HERO_IDS.map(entryFor);
    return { grid, hero };
  }, [data?.samples]);

  const [draft, setDraft] = useState<SamplesDoc | null>(null);
  const active = draft ?? effective;
  const dirty = useMemo(() => JSON.stringify(active) !== JSON.stringify(effective), [active, effective]);

  const save = useAdminMutation((doc: SamplesDoc) => saveSamplesDoc({ data: doc }), {
    success: "Landing samples saved — live on the site",
  });

  const [picker, setPicker] = useState<"grid" | "hero" | null>(null);

  if (!data) return null;

  const move = (section: "grid" | "hero", idx: number, dir: -1 | 1) =>
    setDraft({
      ...active,
      [section]: (() => {
        const arr = [...active[section]];
        const j = idx + dir;
        if (j < 0 || j >= arr.length) return arr;
        [arr[idx], arr[j]] = [arr[j]!, arr[idx]!];
        return arr;
      })(),
    });

  const removeAt = (section: "grid" | "hero", idx: number) =>
    setDraft({ ...active, [section]: active[section].filter((_, i) => i !== idx) });

  const patchAt = (section: "grid" | "hero", idx: number, patch: Partial<SampleEntry>) =>
    setDraft({
      ...active,
      [section]: active[section].map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) save.mutate(active);
      }}
    >
      <Card
        title="Landing samples"
        desc="The verified-scan cards on the public landing page. Pick any template from the catalog, relabel it, and point it at any destination — the card renders with the same engine visitors get, then re-decodes to prove it scans. Leave a section cleared to use the curated built-in set."
      >
        <SectionList
          section="grid"
          entries={active.grid}
          shown={8}
          title="Landing grid"
          byId={byId}
          hiddenIds={hiddenIds}
          onAdd={() => setPicker("grid")}
          onMove={move}
          onRemove={removeAt}
          onPatch={patchAt}
        />
        <SectionList
          section="hero"
          entries={active.hero}
          shown={3}
          title="Hero fan"
          byId={byId}
          hiddenIds={hiddenIds}
          onAdd={() => setPicker("hero")}
          onMove={move}
          onRemove={removeAt}
          onPatch={patchAt}
        />
        <Note>
          <Images className="mr-1 inline size-3.5 align-[-2px]" />
          Samples render live in your browser and are verified with jsQR before the badge shows. Hidden
          templates can be added but won't render on the public page until unhidden.
        </Note>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDraft({ grid: GRID_IDS.map(entryFor), hero: HERO_IDS.map(entryFor) })}
          >
            Restore curated set
          </Button>
          <div className="flex items-center gap-2">
            {dirty ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(effective)}>
                Reset
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={!dirty || save.isPending}>
              {save.isPending ? "Saving…" : "Save samples"}
            </Button>
          </div>
        </div>
      </Card>

      <RawJsonCard value={active} onApply={(v) => setDraft(v as SamplesDoc)} />

      <PickerModal
        open={picker !== null}
        section={picker}
        rows={rows}
        already={picker ? active[picker].map((e) => e.presetId) : []}
        onClose={() => setPicker(null)}
        onPick={(presetId) => {
          if (picker) setDraft({ ...active, [picker]: [...active[picker], entryFor(presetId)] });
          setPicker(null);
        }}
      />
    </form>
  );
}

/* -------------------------------- section list ------------------------------- */

function SectionList({
  section,
  entries,
  shown,
  title,
  byId,
  hiddenIds,
  onAdd,
  onMove,
  onRemove,
  onPatch,
}: {
  section: "grid" | "hero";
  entries: SampleEntry[];
  shown: number;
  title: string;
  byId: Map<string, Row>;
  hiddenIds: Set<string>;
  onAdd: () => void;
  onMove: (section: "grid" | "hero", idx: number, dir: -1 | 1) => void;
  onRemove: (section: "grid" | "hero", idx: number) => void;
  onPatch: (section: "grid" | "hero", idx: number, patch: Partial<SampleEntry>) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-fg">
          {title} <span className="font-normal text-subtle">— first {shown} shown on the page</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" />
          Add sample
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-[11px] text-subtle">
          Empty — the landing falls back to the curated built-in set for this section.
        </p>
      ) : (
        <ul className="grid gap-2">
          {entries.map((entry, idx) => {
            const preset = byId.get(entry.presetId);
            const hidden = hiddenIds.has(entry.presetId);
            const overflow = idx >= shown;
            return (
              <li key={`${entry.presetId}-${idx}`} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-elevated p-2">
                {preset ? (
                  <TemplatePreview preset={preset} size={56} />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-lg border border-danger/40 bg-danger/10 text-[10px] font-semibold text-danger">
                    missing
                  </span>
                )}
                <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
                  <Input
                    value={entry.label ?? ""}
                    onChange={(e) => onPatch(section, idx, { label: e.target.value })}
                    placeholder={preset ? `${preset.name} (label)` : "Template id…"}
                    maxLength={60}
                    className="h-8 text-xs"
                  />
                  <Input
                    value={entry.url ?? ""}
                    onChange={(e) => onPatch(section, idx, { url: e.target.value })}
                    placeholder="Destination URL encoded in the sample"
                    maxLength={400}
                    className="h-8 font-mono text-[11px]"
                  />
                  <p className="truncate text-[10px] text-subtle sm:col-span-2">
                    {preset ? `${preset.id} · ${preset.category}` : `Unknown template id: ${entry.presetId}`}
                    {hidden ? " · hidden — won't show on the landing page" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {overflow ? <Badge tone="warn">beyond {shown}</Badge> : null}
                  <Button type="button" variant="ghost" size="icon-sm" title="Move up" disabled={idx === 0} onClick={() => onMove(section, idx, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" title="Move down" disabled={idx === entries.length - 1} onClick={() => onMove(section, idx, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" title="Remove" onClick={() => onRemove(section, idx)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------- picker ---------------------------------- */

function PickerModal({
  open,
  section,
  rows,
  already,
  onClose,
  onPick,
}: {
  open: boolean;
  section: "grid" | "hero" | null;
  rows: Row[];
  already: string[];
  onClose: () => void;
  onPick: (presetId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const cats = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.category)))], [rows]);
  const visible = rows.filter(
    (r) =>
      (cat === "All" || r.category === cat) &&
      (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Modal open={open} onClose={onClose} title={`Add a ${section === "hero" ? "hero fan" : "landing grid"} sample`} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`h-8 rounded-full border px-3 text-xs ${cat === c ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-subtle">{visible.length} templates</span>
      </div>
      <ul className="grid max-h-[50vh] gap-1.5 overflow-y-auto pr-1">
        {visible.map((r) => {
          const used = already.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                disabled={used}
                onClick={() => onPick(r.id)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface p-2 text-left transition hover:border-border-strong hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-45"
              >
                <TemplatePreview preset={r} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-fg">{r.name}</span>
                  <span className="block truncate text-[10px] text-subtle">
                    {r.id} · {r.category}
                    {r.hidden ? " · hidden" : ""}
                    {r.artUrl ? " · photo" : ""}
                  </span>
                </span>
                {used ? <Badge tone="muted">already added</Badge> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "muted" | "warn" }) {
  const cls =
    tone === "warn" ? "border-warn/40 bg-warn/10 text-warn" : "border-border bg-surface text-muted";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}
