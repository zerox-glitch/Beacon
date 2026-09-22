import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESETS } from "@/lib/qr/presets";
import { ART_DIRECTIONS } from "@/lib/qr/art-directions";
import {
  DEFAULT_STYLE,
  EYE_SHAPES,
  IMAGE_MODES,
  MODULE_SHAPES,
  QR_EFFECTS,
  type QrStyle,
} from "@/lib/qr/types";
import { deleteTemplate, saveCategories, saveTemplate, setTemplateFlags } from "@/lib/cms/admin-api";
import { adminCatalog, newTemplateId, orderCategories } from "@/lib/cms/catalog-merge";
import type { CategoryDoc } from "@/lib/cms/schemas";
import {
  Badge,
  Card,
  DangerNote,
  Field,
  Modal,
  Note,
  SelectInput,
  TextAreaField,
  TextInput,
  ToggleField,
} from "@/components/admin/ui";
import { ImagePicker } from "@/components/admin/image-picker";
import { TemplatePreview } from "./template-preview";
import { useAdminMutation, useAdminSettings } from "@/components/admin/session";
import type { AdminSettings } from "@/components/admin/types";

type Row = ReturnType<typeof adminCatalog>[number];

export function TemplatesPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState<Row | null>(null);
  const flags = useAdminMutation(
    (input: { id: string; hidden?: boolean; featured?: boolean; defaultTemplate?: boolean }) =>
      setTemplateFlags({ data: input }),
    { success: "Template updated" },
  );
  const remove = useAdminMutation(
    async (input: { id: string; custom: boolean }) => {
      await deleteTemplate({ data: { id: input.id } });
    },
    { success: "Removed" },
  );

  const doc = data?.categories;
  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    return adminCatalog(PRESETS, data.templates, { categories: data.categories });
  }, [data]);
  const categories = useMemo(
    () => ["All", ...orderCategories(Array.from(new Set(rows.map((r) => r.category))), doc?.order)],
    [rows, doc],
  );
  const visible = rows.filter(
    (r) =>
      (cat === "All" || r.category === cat) &&
      (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      <CategoryManager rows={rows} doc={doc ?? { renames: {}, order: [] }} />

      <Card
        title={`Template catalog (${rows.length})`}
        desc="Every QR look the studio and landing page show. Hide = removed from the public site (studio gallery, landing samples, share data — the row never reaches visitors). Feature = “featured” flag in the studio. Overriding a built-in lets you rename, recolor or restyle it without touching code."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() =>
              setEditing({
                id: newTemplateId(),
                name: "New template",
                category: "Custom",
                blurb: "",
                artUrl: undefined,
                featured: false,
                style: { ...DEFAULT_STYLE },
                hidden: false,
                isCustom: true,
                sort: 0,
                overridden: false,
                isDefault: false,
              })
            }
          >
            <Plus className="size-3.5" />
            New template
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or id…" className="h-9 w-56 text-xs" />
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
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
          <span className="ml-auto text-[11px] text-subtle">{visible.length} shown</span>
        </div>

        <ul className="divide-y divide-border">
          {visible.slice(0, 400).map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span
                className="relative size-9 shrink-0 overflow-hidden rounded-md border border-border"
                style={{ background: r.style?.bg ?? "#eee" }}
                aria-hidden
              >
                <span className="absolute inset-[15%] grid grid-cols-3 gap-[6%]">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <span key={i} style={{ background: i % 2 === 0 ? (r.style?.fg ?? "#111") : "transparent" }} />
                  ))}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-fg">
                  {r.name}
                  {r.isCustom ? <Badge tone="accent">custom</Badge> : null}
                  {r.overridden && !r.isCustom ? <Badge>override</Badge> : null}
                  {r.style?.artDirection ? <Badge tone="accent">art</Badge> : null}
                  {r.isDefault ? <Badge tone="accent">studio default</Badge> : null}
                  {r.featured ? <Star className="size-3 fill-ok text-ok" /> : null}
                  {r.hidden ? <EyeOff className="size-3 text-danger" /> : null}
                </p>
                <p className="truncate font-mono text-[10px] text-subtle">{r.id} · {r.category}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title={r.hidden ? "Show on public site" : "Hide from public site"}
                  disabled={flags.isPending}
                  onClick={() => flags.mutate({ id: r.id, hidden: !r.hidden })}
                >
                  {r.hidden ? <Eye className="size-3.5 text-ok" /> : <EyeOff className="size-3.5 text-warn" />}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title={r.featured ? "Unfeature" : "Feature"}
                  disabled={flags.isPending}
                  onClick={() => flags.mutate({ id: r.id, featured: !r.featured })}
                >
                  <Star className={`size-3.5 ${r.featured ? "fill-accent text-accent" : ""}`} />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title={r.isDefault ? "Unset as studio default" : "Open the studio with this template"}
                  disabled={flags.isPending || (!r.isDefault && r.hidden)}
                  onClick={() => flags.mutate({ id: r.id, defaultTemplate: !r.isDefault })}
                >
                  <Crown className={`size-3.5 ${r.isDefault ? "fill-ok text-ok" : "text-subtle hover:text-fg"}`} />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title={r.isCustom ? "Delete template" : "Remove override (restore stock)"}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(r.isCustom ? `Delete custom template “${r.name}” for good?` : `Reset “${r.name}” to its built-in state?`)) {
                      remove.mutate({ id: r.id, custom: r.isCustom });
                    }
                  }}
                >
                  {r.isCustom ? <Trash2 className="size-3.5 text-danger" /> : <RotateCcw className="size-3.5" />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {visible.length > 400 ? <Note>Showing the first 400 matches — narrow with search.</Note> : null}
      </Card>

      {/* Mounted per row (key): opening another template always shows THAT
          template's data, never a leftover draft from the last edit. */}
      {editing ? (
        <TemplateEditorModal
          key={editing.id}
          row={editing}
          categories={categories.filter((c) => c !== "All")}
          onClose={() => setEditing(null)}
          media={data?.media ?? []}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ category manager ----------------------------- */

function CategoryManager({ rows, doc }: { rows: Row[]; doc: CategoryDoc }) {
  const save = useAdminMutation((input: CategoryDoc) => saveCategories({ data: input }), {
    success: "Categories saved",
  });
  const [newName, setNewName] = useState("");

  const renames = useMemo(() => ({ ...(doc.renames ?? {}) }), [doc]);
  // Display names currently in use, in public-gallery order.
  const inUse = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).filter(Boolean),
    [rows],
  );
  const listed = orderCategories(
    Array.from(new Set([...(doc.order ?? []), ...inUse])),
    doc.order,
  );

  const commit = (next: { renames?: Record<string, string>; order?: string[] }) =>
    save.mutate({ renames: next?.renames ?? renames, order: next?.order ?? listed });

  const move = (name: string, dir: -1 | 1) => {
    const list = [...listed];
    const i = list.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    void commit({ order: list });
  };

  const rename = (from: string, to: string) => {
    const clean = to.trim().slice(0, 40);
    if (!clean || clean === from) {
      const next = { ...renames };
      delete next[from];
      void commit({ renames: next });
      return;
    }
    void commit({ renames: { ...renames, [from]: clean } });
  };

  const mergeInto = (from: string, to: string) => {
    if (!to || to === from) return;
    const next: Record<string, string> = {};
    for (const [raw, disp] of Object.entries(renames)) {
      // Anything that currently renders as `from` now renders as `to`.
      next[raw] = disp === from ? to : disp!;
    }
    next[from] = to;
    void commit({ renames: next, order: listed.filter((c) => c !== from) });
  };

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return m;
  }, [rows]);

  return (
    <Card
      title="Gallery categories"
      desc="Tabs the studio gallery shows, in order. Renaming re-labels every template in the category (built-ins included) and is fully undoable — no template rows are rewritten. Use “move templates” to empty a category, then it disappears on its own."
      actions={
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="h-9 w-44 text-xs"
            maxLength={40}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!newName.trim() || save.isPending}
            onClick={() => {
              const clean = newName.trim().slice(0, 40);
              if (listed.includes(clean)) {
                toast.error(`“${clean}” already exists`);
                return;
              }
              setNewName("");
              void commit({ order: [...listed, clean] });
            }}
          >
            <Plus className="size-3.5" />
            Create
          </Button>
        </div>
      }
    >
      <ul className="divide-y divide-border">
        {listed.map((name, i) => {
          const rawOf = Object.keys(renames).find((k) => renames[k] === name);
          const count = counts.get(name) ?? 0;
          return (
            <li key={name} className="flex flex-wrap items-center gap-2 py-2">
              <Tags className="size-3.5 shrink-0 text-subtle" />
              <span className="text-sm font-medium text-fg">{name}</span>
              <Badge tone={count ? "accent" : undefined}>{count} template{count === 1 ? "" : "s"}</Badge>
              {rawOf && rawOf !== name ? <span className="text-[10px] text-subtle">renamed from “{rawOf}”</span> : null}
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button type="button" size="icon-sm" variant="ghost" title="Move up" disabled={i === 0 || save.isPending} onClick={() => move(name, -1)}>
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" title="Move down" disabled={i === listed.length - 1 || save.isPending} onClick={() => move(name, 1)}>
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => {
                    const to = window.prompt(`Rename “${name}” to (leave empty to clear the rename):`, name);
                    if (to !== null) rename(name, to);
                  }}
                >
                  Rename
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={save.isPending || listed.length < 2}
                  title="Move every template in this category into another one"
                  onClick={() => {
                    const target = window.prompt(
                      `Move all “${name}” templates INTO this category:`,
                      listed.find((c) => c !== name) ?? "Custom",
                    );
                    const clean = target?.trim().slice(0, 40);
                    if (clean) mergeInto(name, clean);
                  }}
                >
                  Move…
                </Button>
              </div>
            </li>
          );
        })}
        {listed.length === 0 ? <Note>No categories yet — they appear here as templates use them.</Note> : null}
      </ul>
    </Card>
  );
}

/* -------------------------------- editor modal ------------------------------- */

type Draft = {
  name: string;
  category: string;
  newCategory: boolean;
  blurb: string;
  artUrl: string;
  featured: boolean;
  hidden: boolean;
  sort: number;
  /** "auto" = derive from the style's image mode (what the studio does). */
  imageCompat: "auto" | "yes" | "no";
  style: QrStyle;
};

function initDraft(row: Row): Draft {
  return {
    name: row.name ?? "",
    category: row.category ?? "Custom",
    newCategory: false,
    blurb: row.blurb ?? "",
    artUrl: row.artUrl ?? "",
    featured: Boolean(row.featured),
    hidden: Boolean(row.hidden),
    sort: row.sort ?? 0,
    imageCompat:
      (row as { imageCompatible?: boolean | null }).imageCompatible === true
        ? "yes"
        : (row as { imageCompatible?: boolean | null }).imageCompatible === false
          ? "no"
          : "auto",
    // The editor mirrors the RAW stored overrides for custom rows and the full
    // merged style for built-ins — either way it opens on THIS template.
    style: { ...DEFAULT_STYLE, ...(row.style ?? {}) } as QrStyle,
  };
}

function TemplateEditorModal({
  row,
  categories,
  onClose,
  media,
}: {
  row: Row;
  categories: string[];
  onClose: () => void;
  media: AdminSettings["media"];
}) {
  const [draft, setDraft] = useState<Draft>(() => initDraft(row));
  const [advancedJson, setAdvancedJson] = useState<string | null>(null);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const save = useAdminMutation(
    (payload: Record<string, unknown>) => saveTemplate({ data: payload as never }),
    { success: "Template saved" },
  );

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchStyle = (p: Partial<QrStyle>) => setDraft((d) => ({ ...d, style: { ...d.style, ...p } }));

  const previewPreset = {
    id: row.id,
    name: draft.name || "Preview",
    category: draft.category,
    blurb: draft.blurb || undefined,
    artUrl: draft.artUrl || undefined,
    style: draft.style,
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Give the template a name");
      return;
    }
    let style = draft.style;
    if (advancedJson) {
      try {
        style = { ...style, ...(JSON.parse(advancedJson) as Partial<QrStyle>) };
        setAdvancedJson(null);
        setAdvancedError(null);
      } catch (err) {
        setAdvancedError((err as Error).message);
        return;
      }
    }
    const payload: Record<string, unknown> = {
      name: draft.name.trim().slice(0, 80),
      category: draft.category.trim().slice(0, 40) || "Custom",
      blurb: draft.blurb.trim().slice(0, 240),
      artUrl: draft.artUrl.trim(),
      featured: draft.featured,
      hidden: draft.hidden,
      sort: Math.max(-1000, Math.min(1000, Math.trunc(draft.sort) || 0)),
      style,
      ...(draft.imageCompat === "auto" ? {} : { imageCompatible: draft.imageCompat === "yes" }),
    };
    if (row.isCustom) payload.id = row.id;
    else payload.overrideId = row.id;
    try {
      await save.mutateAsync(payload);
      onClose();
    } catch {
      // error already toasted by the mutation hook — keep the modal open so
      // the admin can fix the payload
    }
  }

  const catOptions = Array.from(new Set([...categories, draft.category]))
    .filter(Boolean)
    .map((c) => ({ value: c, label: c }));

  return (
    <Modal open onClose={onClose} title={`${row.isCustom ? "Edit custom template" : row.overridden ? "Override built-in preset" : "Create override for built-in"} — ${row.id}`} wide>
      <form onSubmit={submit} className="space-y-4">
        {!row.isCustom && (
          <Note>
            Saving writes an override row keyed <code className="text-fg">{row.id}</code> — the built-in
            stays in the codebase, the site shows this version. “Reset to stock” in the list removes it.
          </Note>
        )}
        {row.isCustom && (
          <DangerNote>
            Custom templates render in the studio with the SAME engine as built-ins. If the style makes a
            code unscannable, visitors will see it — use the studio’s scan badge to verify before featuring.
          </DangerNote>
        )}
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Name" value={draft.name} onValueChange={(v) => patch({ name: v })} maxLength={80} autoFocus />
              {draft.newCategory ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextInput
                      label="New category"
                      value={draft.category}
                      onValueChange={(v) => patch({ category: v })}
                      maxLength={40}
                      hint="Appears as a studio gallery tab."
                    />
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="mb-1" onClick={() => patch({ newCategory: false, category: categories[0] ?? "Custom" })}>
                    Pick existing
                  </Button>
                </div>
              ) : (
                <SelectInput
                  label="Category"
                  value={catOptions.some((o) => o.value === draft.category) ? draft.category : (catOptions[0]?.value ?? "Custom")}
                  onValueChange={(v) => {
                    if (v === "__new__") patch({ newCategory: true, category: "" });
                    else patch({ category: v });
                  }}
                  options={[...catOptions, { value: "__new__", label: "+ New category…" }]}
                  hint="Which gallery tab this template shows under."
                />
              )}
            </div>
            <TextAreaField label="Blurb" value={draft.blurb} onValueChange={(v) => patch({ blurb: v })} rows={2} hint="One-line design note shown on hover in the gallery." />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextInput label="Sort order" value={String(draft.sort)} onValueChange={(v) => patch({ sort: Number(v) || 0 })} hint="Negative = start, 0 = after built-ins, positive = end." maxLength={5} />
              <div className="flex items-end pb-1 sm:col-span-2">
                <div className="grid w-full grid-cols-2 gap-4">
                  <ToggleField label="Featured" checked={draft.featured} onCheckedChange={(v) => patch({ featured: v })} />
                  <ToggleField
                    label="Hidden from public site"
                    hint="Off = published in the studio gallery."
                    checked={draft.hidden}
                    onCheckedChange={(v) => patch({ hidden: v })}
                  />
                </div>
              </div>
            </div>
            <ImagePicker label="Artwork (optional)" value={draft.artUrl} onChange={(v) => patch({ artUrl: v })} media={media} kind="art" hint="When set, applying this template loads this picture into the QR (paint mode by default)." />

            <Field label="Design system" hint="Pick an art direction to build the template on (the gallery’s “Art directions”). Leave as None for a flat-styled code. Tune-panel edits by visitors layer on top of everything here.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniSelect
                  label="Art direction"
                  value={draft.style.artDirection ?? ""}
                  options={[
                    { value: "", label: "None — flat style" },
                    ...ART_DIRECTIONS.map((d) => ({ value: d.id, label: `${d.name} · ${d.category}` })),
                  ]}
                  onChange={(v) => patchStyle({ artDirection: v || undefined, artRelax: v ? 0 : undefined, artCameraSafe: undefined })}
                />
                <MiniSelect label="Image mode" value={draft.style.imageMode} options={IMAGE_MODES.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => patchStyle({ imageMode: v as QrStyle["imageMode"] })} />
                <MiniSelect label="ECC" value={draft.style.ecc} options={["L", "M", "Q", "H"].map((v) => ({ value: v, label: v }))} onChange={(v) => patchStyle({ ecc: v as QrStyle["ecc"] })} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-subtle">
                While a visitor has a photo in the frame, the gallery only lists photo-compatible templates.
                “Auto” keeps this one compatible exactly when its image mode uses the picture — pin it to
                show it in photo mode anyway, or to hide it there.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(["auto", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch({ imageCompat: v })}
                    className={`h-9 rounded-md border text-xs font-medium capitalize transition ${
                      draft.imageCompat === v
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border bg-elevated text-muted hover:text-fg"
                    }`}
                  >
                    Photo mode: {v === "auto" ? "Auto" : v === "yes" ? "Allowed" : "Hidden"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Shapes & colors" hint="Everything the studio design panel can change — the preview shows the truth.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniSelect label="Module" value={draft.style.moduleShape} options={MODULE_SHAPES.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => patchStyle({ moduleShape: v as QrStyle["moduleShape"] })} />
                <MiniSelect label="Eye" value={draft.style.eyeShape} options={EYE_SHAPES.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => patchStyle({ eyeShape: v as QrStyle["eyeShape"] })} />
                <MiniSelect label="Ball" value={draft.style.ballShape} options={EYE_SHAPES.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => patchStyle({ ballShape: v as QrStyle["eyeShape"] })} />
                <ColorInput label="Foreground" value={draft.style.fg} onChange={(v) => patchStyle({ fg: v })} />
                <ColorInput label="Background" value={draft.style.bg} onChange={(v) => patchStyle({ bg: v })} />
                <ColorInput label="Eye color" value={draft.style.eyeColor} onChange={(v) => patchStyle({ eyeColor: v })} />
                <ColorInput label="Ball color" value={draft.style.ballColor} onChange={(v) => patchStyle({ ballColor: v })} />
                <ColorInput label="Gradient to" value={draft.style.gradientTo} onChange={(v) => patchStyle({ gradientTo: v })} />
                <MiniSelect label="Gradient" value={draft.style.gradientType} options={["none", "linear", "radial", "diagonal", "image"].map((v) => ({ value: v, label: v }))} onChange={(v) => patchStyle({ gradientType: v as QrStyle["gradientType"] })} />
                <MiniSelect label="Effect" value={draft.style.effect} options={QR_EFFECTS.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => patchStyle({ effect: v as QrStyle["effect"] })} />
                <MiniSelect
                  label="Accent shape"
                  value={draft.style.accentShape ?? ""}
                  options={[{ value: "", label: "none" }, ...MODULE_SHAPES.map((o) => ({ value: o.id, label: o.label }))]}
                  onChange={(v) => patchStyle({ accentShape: (v || undefined) as QrStyle["accentShape"] })}
                />
                {draft.style.accentShape ? (
                  <ColorInput label="Accent color" value={draft.style.accentColor ?? "#ff4d4d"} onChange={(v) => patchStyle({ accentColor: v })} />
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <RangeField label={`Module gap · ${draft.style.moduleGap.toFixed(2)}`} min={0} max={0.3} step={0.01} value={draft.style.moduleGap} onChange={(v) => patchStyle({ moduleGap: v })} />
                <RangeField label={`Quiet zone · ${draft.style.quietZone}`} min={0} max={6} step={1} value={draft.style.quietZone} onChange={(v) => patchStyle({ quietZone: v })} />
                <RangeField label={`Dot scale · ${draft.style.dotScale.toFixed(2)}`} min={0.2} max={1} step={0.05} value={draft.style.dotScale} onChange={(v) => patchStyle({ dotScale: v })} />
                <RangeField label={`Artistic strength · ${draft.style.artisticStrength.toFixed(2)}`} min={0} max={1} step={0.05} value={draft.style.artisticStrength} onChange={(v) => patchStyle({ artisticStrength: v })} />
                <RangeField label={`Contrast · ${draft.style.contrast.toFixed(2)}`} min={-1} max={1} step={0.05} value={draft.style.contrast} onChange={(v) => patchStyle({ contrast: v })} />
                <RangeField label={`Image opacity · ${draft.style.imageOpacity.toFixed(2)}`} min={0} max={1} step={0.05} value={draft.style.imageOpacity} onChange={(v) => patchStyle({ imageOpacity: v })} />
                <RangeField label={`Logo scale · ${draft.style.logoScale.toFixed(2)}`} min={0.1} max={0.6} step={0.01} value={draft.style.logoScale} onChange={(v) => patchStyle({ logoScale: v })} />
                <RangeField label={`Min version · ${draft.style.minVersion}`} min={1} max={10} step={1} value={draft.style.minVersion} onChange={(v) => patchStyle({ minVersion: v })} />
                <RangeField label={`Mask pattern · ${draft.style.maskPattern}`} min={-1} max={7} step={1} value={draft.style.maskPattern} onChange={(v) => patchStyle({ maskPattern: v })} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <ToggleField label="Accent on light cells" checked={Boolean(draft.style.accentOnLight)} onCheckedChange={(v) => patchStyle({ accentOnLight: v })} />
                <ToggleField label="Transparent background" checked={Boolean(draft.style.transparentBg)} onCheckedChange={(v) => patchStyle({ transparentBg: v })} />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => patchStyle({ ...DEFAULT_STYLE, artDirection: draft.style.artDirection })}
                  title="Reset every style knob to the studio defaults (keeps the art direction)"
                >
                  <RotateCcw className="size-3.5" />
                  Reset style
                </Button>
              </div>
            </Field>

            <details className="rounded-lg border border-border bg-surface/40 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">Advanced: full style JSON (QrStyle overrides)</summary>
              <TextAreaField
                label="style json"
                value={advancedJson ?? JSON.stringify(draft.style, null, 1)}
                onValueChange={(v) => setAdvancedJson(v)}
                rows={8}
                hint={advancedError ? `Fix the JSON: ${advancedError}` : "Applied when you save. Use for knobs not listed above (photoKernel, artRelax…)."}
              />
            </details>
          </div>

          <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Live preview</p>
            <TemplatePreview preset={previewPreset} size={236} />
            <p className="text-[11px] leading-relaxed text-subtle">
              Encoded with the real engine at ECC “{draft.style.ecc}”. Test in the studio before featuring.
            </p>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving…" : row.isCustom ? "Save template" : "Save override"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MiniSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return <SelectInput label={label} value={value} onValueChange={onChange} options={options} />;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={valid ? value.slice(0, 7) : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 flex-1 font-mono text-xs" maxLength={9} />
      </div>
    </div>
  );
}

function RangeField({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
    </label>
  );
}
