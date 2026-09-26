import { Database, Eye, EyeOff, Images, Layers, ShieldCheck } from "lucide-react";
import { Badge, Card, Note } from "@/components/admin/ui";
import { useAdminSession, useAdminSettings } from "@/components/admin/session";
import type { AdminSettings } from "@/components/admin/types";

export function OverviewPanel() {
  const { me } = useAdminSession();
  const { data } = useAdminSettings<AdminSettings>();
  if (!data) return null;

  const templates = data.templates;
  const hidden = templates.filter((t) => t.hidden).length;
  const customs = templates.filter((t) => t.isCustom).length;
  const overridden = templates.filter((t) => !t.isCustom).length;
  const lastUpdate = [...templates.map((t) => t.updatedAt), ...data.media.map((m) => m.createdAt)].sort().at(-1) ?? null;
  const pglite = data.meta?.dbSource === "pglite";

  return (
    <div className="space-y-5">
      <Card title={`Welcome, ${me?.name ?? "admin"}`} desc="Everything here is saved to the site database through guarded admin APIs — changes are live the moment you save.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Layers className="size-4" />} label="QR templates" value={String(customs + overridden)} sub={`${customs} custom · ${overridden} overrides`} />
          <Stat icon={<EyeOff className="size-4" />} label="Hidden from public" value={String(hidden)} sub={hidden ? "not sent to visitors" : "all visible"} tone={hidden ? "warn" : "ok"} />
          <Stat icon={<Images className="size-4" />} label="Media assets" value={String(data.media.length)} sub="in the database" />
          <Stat icon={<ShieldCheck className="size-4" />} label="Admin account" value={me ? "Active" : "?"} sub={me?.email} tone="ok" />
        </div>
        <Note>
          Last data change: {lastUpdate ? new Date(lastUpdate).toLocaleString() : "nothing changed yet"}.{" "}
          <a href="#/templates" className="font-semibold text-fg underline underline-offset-2">Manage templates</a>
          {" · "}
          <a href="#/seo" className="font-semibold text-fg underline underline-offset-2">SEO</a>
          {" · "}
          <a href="#/security" className="font-semibold text-fg underline underline-offset-2">Security</a>
        </Note>
        {pglite ? (
          <p className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-warn">
            <Database className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Currently running on the embedded preview database (PGLite, in-memory): data survives
              dev-server edits but <strong>not a server restart</strong> — on a deployed preview each
              request can land on a fresh, empty copy. For permanent storage, set
              <code className="mx-1 rounded bg-black/30 px-1">DATABASE_URL</code> (e.g. Neon) on
              your deployment — the app switches over automatically, no code changes.
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[11px] text-ok">
            <Database className="size-3.5" /> Persistent Postgres (Neon) — admin changes survive restarts and deploys.
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-subtle">
          <Eye className="size-3.5" />
          Public site preview of your current catalog: <a href="/" target="_blank" rel="noopener" className="font-semibold text-fg underline underline-offset-2">open the studio ↗</a>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between text-muted">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        <span className={tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : ""}>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{value}</p>
      {sub ? (
        <p className="mt-0.5 truncate text-[11px] text-subtle" title={sub ?? undefined}>
          {sub}
        </p>
      ) : (
        <span className="sr-only">—</span>
      )}
      {label === "Admin account" && value === "Active" ? <Badge tone="ok">secured</Badge> : null}
    </div>
  );
}
