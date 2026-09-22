import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSeoDoc } from "@/lib/cms/admin-api";
import type { PageSeo, SeoDoc } from "@/lib/cms/schemas";
import { Badge, Card, Note, SaveRow, TextAreaField, TextInput, ToggleField } from "@/components/admin/ui";
import { ImagePicker } from "@/components/admin/image-picker";
import { useAdminMutation, useAdminSettings } from "@/components/admin/session";
import { useDoc } from "@/components/admin/use-doc";
import type { AdminSettings } from "@/components/admin/types";

const PAGE_LABELS: Record<keyof SeoDoc["pages"], string> = {
  home: "Home (/)",
  studio: "Studio (/studio)",
  lab: "Art lab (/lab)",
};

export function SeoPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const seo = useDoc<SeoDoc>(data?.seo);
  const save = useAdminMutation((doc: SeoDoc) => saveSeoDoc({ data: doc }), {
    success: "SEO saved — all pages pick it up on next load",
  });
  const [activePage, setActivePage] = useState<keyof SeoDoc["pages"]>("home");
  if (!data || !seo.draft) return null;
  const d = seo.draft;
  const page = (d.pages[activePage] ?? {}) as PageSeo;
  const eff = {
    title: page.title || d.defaults.title,
    description: page.description || d.defaults.description,
  };
  const canonical = d.canonicalBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const path = activePage === "home" ? "/" : `/${activePage}`;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (seo.dirty) save.mutate(d);
      }}
    >
      <Card
        title="Indexing & canonical"
        desc="Where search engines should point, and whether they may index this site at all."
        actions={seo.dirty ? <Badge tone="warn">unsaved</Badge> : <Badge tone="ok">saved</Badge>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Canonical base URL"
            value={d.canonicalBaseUrl}
            onValueChange={(v) => seo.patch({ canonicalBaseUrl: v })}
            placeholder="https://yourdomain.com"
            hint="Origin only, no trailing slash. Drives canonical links, sitemap, robots."
            maxLength={200}
          />
          <div className="flex items-end pb-2">
            <div className="w-full">
              <ToggleField
                label="Allow search engines to index"
                hint="Off → every page gets noindex,nofollow and robots.txt disallows all."
                checked={d.indexSite}
                onCheckedChange={(v) => seo.patch({ indexSite: v })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Default metadata (all pages)" desc="Used wherever a page does not override. Rendered into the SSR <head> by the root loader.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Site title" value={d.defaults.title ?? ""} onValueChange={(v) => seo.patch({ defaults: { ...d.defaults, title: v } })} maxLength={180} />
          <TextAreaField label="Meta description" value={d.defaults.description ?? ""} onValueChange={(v) => seo.patch({ defaults: { ...d.defaults, description: v } })} rows={3} />
        </div>
        <TextAreaField label="Keywords" value={d.defaults.keywords ?? ""} onValueChange={(v) => seo.patch({ defaults: { ...d.defaults, keywords: v } })} rows={2} hint="Comma-separated. Still read by some engines; harmless elsewhere." />
        <ImagePicker
          label="Default share image (og)"
          value={d.defaults.ogImageUrl ?? ""}
          onChange={(v) => seo.patch({ defaults: { ...d.defaults, ogImageUrl: v } })}
          media={data.media}
          kind="og"
          hint="1200×630 PNG/JPEG recommended. Shown when links to your site are shared."
        />
      </Card>

      <Card
        title="Per-page overrides"
        desc="Pick a page to tune its title, description, robots directive and social card."
        actions={
          <div className="flex gap-1">
            {(Object.keys(PAGE_LABELS) as Array<keyof SeoDoc["pages"]>).map((k) => (
              <Button key={k} type="button" size="sm" variant={activePage === k ? "default" : "ghost"} onClick={() => setActivePage(k)}>
                {PAGE_LABELS[k].split(" ")[0]}
              </Button>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput
            label={`${PAGE_LABELS[activePage]} — title override`}
            value={page.title ?? ""}
            onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, title: v || undefined } } })}
            placeholder={d.defaults.title}
            maxLength={180}
          />
          <TextAreaField
            label="Description override"
            value={page.description ?? ""}
            onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, description: v || undefined } } })}
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Keywords override"
              value={page.keywords ?? ""}
              onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, keywords: v || undefined } } })}
              maxLength={600}
            />
            <TextInput
              label="Robots override"
              value={page.robots ?? ""}
              onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, robots: v || undefined } } })}
              placeholder="index, follow"
              maxLength={160}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="og:title override" value={page.ogTitle ?? ""} onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, ogTitle: v || undefined } } })} maxLength={180} />
            <TextAreaField label="og:description override" value={page.ogDescription ?? ""} onValueChange={(v) => seo.patch({ pages: { ...d.pages, [activePage]: { ...page, ogDescription: v || undefined } } })} rows={2} />
          </div>

          {/* Live previews */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-subtle">Google result preview</p>
              <p className="truncate text-sm text-[#8ab4f8]">{canonical}{path}</p>
              <p className="truncate text-base text-[#bdc1c6]">{eff.title}</p>
              <p className="line-clamp-2 text-xs text-[#9aa0a6]">{eff.description}</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-[#1f1f1e]">
              <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-subtle">Social card preview</p>
              {page.ogImageUrl || d.defaults.ogImageUrl ? (
                <img src={page.ogImageUrl || d.defaults.ogImageUrl} alt="" className="mt-2 h-32 w-full object-cover" />
              ) : (
                <img src="/art-hero.jpg" alt="" className="mt-2 h-32 w-full object-cover opacity-70" />
              )}
              <div className="p-3">
                <p className="truncate text-[11px] text-neutral-400">{canonical.replace(/^https?:\/\//, "")}{path}</p>
                <p className="truncate text-sm font-semibold text-neutral-100">{page.ogTitle || eff.title}</p>
                <p className="line-clamp-2 text-[11px] text-neutral-400">{page.ogDescription || eff.description}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="robots.txt & sitemap.xml" desc="Served dynamically from this data at /robots.txt and /sitemap.xml (the static files are gone — these win).">
        <TextAreaField
          label="robots.txt"
          value={d.robotsTxt ?? ""}
          onValueChange={(v) => seo.patch({ robotsTxt: v || undefined })}
          rows={6}
          hint="Leave empty to auto-generate from the index setting + sitemap URL."
        />
        <SitemapEditor paths={d.sitemapPaths ?? null} onChange={(paths) => seo.patch({ sitemapPaths: paths ?? undefined })} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer">View /robots.txt <ExternalLink className="size-3" /></a>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">View /sitemap.xml <ExternalLink className="size-3" /></a>
          </Button>
          <Note>Changes apply as soon as you press Save (no rebuild, no redeploy).</Note>
        </div>
        <SaveRow dirty={seo.dirty} saving={save.isPending} onSave={() => save.mutate(d)} onReset={seo.reset} />
      </Card>
    </form>
  );
}

type SitemapPath = { path: string; priority?: string; changefreq?: string };

function SitemapEditor({ paths, onChange }: { paths: SitemapPath[] | null; onChange: (v: SitemapPath[] | null) => void }) {
  const list = useMemo(() => paths ?? [{ path: "/" }, { path: "/studio" }, { path: "/lab" }], [paths]);
  const [extra, setExtra] = useState("");
  const [showDefault, setShowDefault] = useState(paths == null);
  const shown = showDefault ? list : paths ?? [];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sitemap paths</p>
      <div className="flex items-center gap-2">
        <ToggleField
          label={showDefault ? "Using defaults (/, /studio, /lab)" : "Custom path list"}
          checked={!showDefault}
          onCheckedChange={(v) => {
            setShowDefault(!v);
            if (!v) onChange(paths ? [...(paths ?? [])] : null);
          }}
        />
      </div>
      {!showDefault ? (
        <>
          <ul className="space-y-1.5">
            {shown.map((p, i) => (
              <li key={`${p.path}-${i}`} className="grid grid-cols-[1fr_90px_120px_32px] items-center gap-2">
                <Input value={p.path} className="h-8 text-xs" onChange={(e) => { const next = [...shown]; next[i] = { ...p, path: e.target.value }; onChange(next); }} />
                <Input value={p.priority ?? ""} className="h-8 text-xs" placeholder="1.0" onChange={(e) => { const next = [...shown]; next[i] = { ...p, priority: e.target.value }; onChange(next); }} />
                <select
                  value={p.changefreq ?? "weekly"}
                  onChange={(e) => { const next = [...shown]; next[i] = { ...p, changefreq: e.target.value }; onChange(next); }}
                  className="h-8 rounded-md border border-border bg-elevated px-2 text-xs text-fg"
                >
                  {["daily", "weekly", "monthly", "yearly"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-danger" onClick={() => onChange(shown.filter((_, j) => j !== i))} aria-label="Remove path">
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="/new-page" className="h-8 w-48 text-xs" />
            <Button type="button" size="sm" variant="outline" onClick={() => { const v = extra.trim(); if (!v.startsWith("/") || v.length > 100) return; onChange([...shown, { path: v, priority: "0.8" }]); setExtra(""); }}>
              Add
            </Button>
          </div>
        </>
      ) : (
        <Note>Switch the toggle off to edit the exact URL list, priorities and change frequencies.</Note>
      )}
    </div>
  );
}
