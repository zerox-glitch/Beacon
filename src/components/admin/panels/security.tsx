import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminAuditList,
  adminChangePassword,
  adminExportData,
  adminImportData,
  adminRename,
  adminRevokeSessions,
  adminResetLoginGuard,
} from "@/lib/cms/admin-api";
import { assessPassword } from "@/lib/cms/policy";
import { Badge, Card, DangerNote, Note } from "@/components/admin/ui";
import { setAdminBearer } from "@/lib/cms/admin-bearer";
import { useAdminMutation, useAdminSettings } from "@/components/admin/session";
import type { AdminSettings } from "@/components/admin/types";
import { useQuery } from "@tanstack/react-query";

export function SecurityPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const [name, setName] = useState<string | null>(null);
  const [pass, setPass] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const me = data?.admin ?? null;
  const audit = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => adminAuditList(),
    staleTime: 15_000,
  });

  const rename = useAdminMutation(
    (v: { name: string }) => adminRename({ data: v }),
    { success: "Admin name updated", invalidate: ["admin-me"] },
  );
  const change = useAdminMutation(
    (v: typeof pass) => adminChangePassword({ data: v }),
    {
      success: "Password changed — other sessions revoked. Re-login on this device.",
      invalidate: ["admin-me"],
    },
  );
  const revoke = useAdminMutation(() => adminRevokeSessions(), { success: "All sessions revoked" });
  const exportQ = useAdminMutation(() => adminExportData(), {});
  const unlock = useAdminMutation(() => adminResetLoginGuard(), { success: "Login throttle reset" });

  const strength = pass.newPassword ? assessPassword(pass.newPassword, [me?.name ?? "", (me?.email ?? "").split("@")[0] ?? ""]) : null;

  return (
    <div className="space-y-5">
      <Card title="Admin identity" desc="The single account that unlocks this panel. Setup is permanently closed once claimed (which happened: see below).">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sec-name">Admin name</Label>
            <div className="flex gap-2">
              <Input id="sec-name" value={name ?? me?.name ?? ""} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-9 text-sm" />
              <Button type="button" size="sm" variant="outline" disabled={rename.isPending || !name || name === me?.name} onClick={() => { if (name) rename.mutate({ name }); }}>
                Rename
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Sign-in email</Label>
            <p className="flex h-9 items-center rounded-md border border-border bg-surface px-3 font-mono text-xs text-muted">{me?.email ?? "—"}</p>
            <p className="text-[11px] text-subtle">Changing the email requires a fresh claim — use “change password” and keep this one.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-subtle">
          <Badge tone="ok">setup closed</Badge>
          claimed {me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"} · scrypt-hashed via Better Auth · HttpOnly __Host- session cookie
        </div>
      </Card>

      <Card title="Change password" desc="Requires the current password. Other devices are signed out automatically; this device re-logs-in.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (pass.newPassword !== pass.confirm) {
              toast.error("New passwords do not match");
              return;
            }
            if (!strength?.ok) {
              toast.error(strength?.issues[0] ?? "Password too weak");
              return;
            }
            change.mutate(pass, {
              onSuccess: () => {
                setPass({ currentPassword: "", newPassword: "", confirm: "" });
                setAdminBearer(null);
              },
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-cur">Current password</Label>
              <Input id="p-cur" type="password" autoComplete="current-password" value={pass.currentPassword} onChange={(e) => setPass((p) => ({ ...p, currentPassword: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-new">New password</Label>
              <Input id="p-new" type="password" autoComplete="new-password" value={pass.newPassword} onChange={(e) => setPass((p) => ({ ...p, newPassword: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-conf">Repeat new</Label>
              <Input id="p-conf" type="password" autoComplete="new-password" value={pass.confirm} onChange={(e) => setPass((p) => ({ ...p, confirm: e.target.value }))} required />
            </div>
          </div>
          {strength ? (
            <p className={`text-[11px] ${strength.ok ? "text-ok" : "text-warn"}`}>
              {strength.ok ? `Strong enough (~${strength.bits} bits)` : strength.issues[0]}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={change.isPending || !pass.currentPassword || !strength?.ok}>
            {change.isPending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </Card>

      <Card title="Session control">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-fg">Sign out everywhere</p>
            <p className="text-[11px] leading-relaxed text-muted">Deletes every Better-Auth session for this account (including this one). Use after a device is lost.</p>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={revoke.isPending}
              onClick={() => {
                if (!window.confirm("Sign out ALL sessions including this one?")) return;
                revoke.mutate(undefined, {
                  onSuccess: () => {
                    setAdminBearer(null);
                    window.location.reload();
                  },
                });
              }}
            >
              Revoke all sessions
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-fg">Login throttle</p>
            <p className="text-[11px] leading-relaxed text-muted">5 wrong passwords lock the account for 15 minutes. If you locked yourself out (and remember the password), you can clear it — only while signed in.</p>
            <Button type="button" size="sm" variant="outline" disabled={unlock.isPending} onClick={() => unlock.mutate(undefined)}>
              Reset failed-attempt counter
            </Button>
          </div>
        </div>
        <DangerNote>
          There is no email reset flow: lose this password and the panel is only recoverable by a
          database operator clearing <code>cms_admin</code> + restarting setup. Store it safely.
        </DangerNote>
      </Card>

      <Card
        title="Data export / import"
        desc="Brand, content, SEO and template rows (no media bytes) as JSON. Import validates every document server-side before writing."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exportQ.isPending}
              onClick={async () => {
                try {
                  exportQ.mutate(undefined, {
                    onSuccess: (doc) => {
                      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "qrwho-cms-export.json";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    },
                  });
                } catch {
                  /* handled by mutation toast */
                }
              }}
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <ImportButton />
          </div>
        }
      >
        <Note>
          Export is also the migration path between preview and production databases: upload the same
          file once you connect a real <code>DATABASE_URL</code>.
        </Note>
      </Card>

      <Card title={`Audit log (${audit.data?.length ?? 0} recent)`} desc="Every admin mutation, with actor, IP and user agent. Append-only in the database.">
        {!audit.data || audit.data.length === 0 ? (
          <p className="text-xs text-subtle">No entries yet.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-surface text-subtle">
                <tr>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Target</th>
                  <th className="px-3 py-2 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.data.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-muted">{new Date(row.ts).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-fg">{row.actorName ?? row.actor ?? "system"}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-ok">{row.action}</td>
                    <td className="max-w-44 truncate px-3 py-1.5 font-mono text-[10px] text-muted">{row.target ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-subtle">{row.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ImportButton() {
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-transparent px-3 text-xs font-medium text-fg transition hover:bg-surface">
      <Upload className="size-3.5" />
      {busy ? "Importing…" : "Import JSON"}
      <input
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || f.size > 2 * 1024 * 1024) {
            if (f) toast.error("File too large");
            return;
          }
          setBusy(true);
          try {
            const doc = JSON.parse(await f.text()) as unknown;
            await adminImportData({ data: doc });
            toast.success("Import applied");
          } catch (err) {
            toast.error((err as Error)?.message ?? "Import failed");
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
