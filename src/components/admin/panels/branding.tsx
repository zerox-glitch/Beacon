import { useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { saveBrandDoc } from "@/lib/cms/admin-api";
import type { BrandDoc, SurpriseCode } from "@/lib/cms/schemas";
import { Badge, Card, SaveRow, SelectInput, TextInput, ToggleField } from "../ui";
import { FRAME_DEFS } from "@/lib/qr/frames";
import { ImagePicker } from "../image-picker";
import { SupportPopup } from "@/components/support-popup";
import { useAdminMutation, useAdminSettings } from "../session";
import { useDoc } from "../use-doc";
import type { AdminSettings } from "../types";

export function BrandingPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const brand = useDoc<BrandDoc>(data?.brand);
  const [themeDraft, setThemeDraft] = useState<string | null>(null);
  const [previewSupport, setPreviewSupport] = useState(false);
  const save = useAdminMutation(
    (doc: BrandDoc) => saveBrandDoc({ data: doc }),
    { success: "Branding saved — live on the public site", invalidate: ["admin-brand"] },
  );
  if (!data || !brand.draft) return null;
  const d = brand.draft;
  const patchSurprise = (i: number, p: Partial<SurpriseCode>) =>
    brand.patch({ surpriseCodes: (d.surpriseCodes ?? []).map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const theme = themeDraft ?? d.themeColor;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (brand.dirty) save.mutate({ ...d, themeColor: theme });
      }}
    >
      <Card
        title="Brand identity"
        desc="Name, logos and colors used by the studio header, landing page, favicon and share cards."
        actions={dirtyBadge(brand.dirty)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Site name" value={d.siteName} onValueChange={(v) => brand.patch({ siteName: v })} maxLength={60} />
          <TextInput label="Tagline" value={d.tagline} onValueChange={(v) => brand.patch({ tagline: v })} maxLength={160} />
          <TextInput
            label="Theme color"
            value={theme}
            onValueChange={(v) => setThemeDraft(v)}
            onBlur={() => {
              if (themeDraft && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(themeDraft)) {
                brand.patch({ themeColor: themeDraft });
                setThemeDraft(null);
              }
            }}
            hint="Hex (e.g. #0c0c0b) — drives the browser UI accent."
            maxLength={9}
          />
          <TextInput label="Footer note" value={d.footerNote} onValueChange={(v) => brand.patch({ footerNote: v })} maxLength={300} hint="Shown under the public gallery footer (empty keeps the default copy)." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImagePicker label="Logo" value={d.logoUrl} onChange={(v) => brand.patch({ logoUrl: v })} media={data.media} kind="logo" hint="Header + landing logo. PNG/WebP with transparency looks best." />
          <ImagePicker label="Favicon" value={d.faviconUrl} onChange={(v) => brand.patch({ faviconUrl: v })} media={data.media} kind="logo" hint="Square PNG/WebP ≥ 64px." />
        </div>
      </Card>

      <Card
        title="Photo defaults"
        desc="The look every photo QR starts with the moment a visitor uploads a picture. Change it here and all new uploads begin with your house style."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Weave style"
            value={d.photoDefaults.imageMode}
            onValueChange={(v) => brand.patch({ photoDefaults: { ...d.photoDefaults, imageMode: v as BrandDoc["photoDefaults"]["imageMode"] } })}
            options={[
              { value: "clean", label: "Clean overlay — photo at full strength, crisp dots" },
              { value: "paint", label: "Photo QR — built from the weave lattice" },
              { value: "mosaic", label: "Color blend — one photo color per dot" },
              { value: "halftone", label: "Halftone — newspaper dots" },
              { value: "duotone", label: "Duotone — two inks from the photo" },
              { value: "mono", label: "Mono ink — density follows the photo" },
            ]}
            hint="Applied automatically when a picture is uploaded."
          />
          <TextInput
            label="Dot size (%)"
            value={String(Math.round(d.photoDefaults.dotScale * 100))}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 50 && n <= 100) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, dotScale: n / 100 } });
              }
            }}
            hint="50–100. Smaller dots show more of the picture."
          />
          <TextInput
            label="Photo color (%)"
            value={String(Math.round(d.photoDefaults.imageOpacity * 100))}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 10 && n <= 100) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, imageOpacity: n / 100 } });
              }
            }}
            hint="10–100. Low = grayscale inks."
          />
          <TextInput
            label="Contrast (%)"
            value={String(Math.round(d.photoDefaults.contrast * 100))}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 30 && n <= 100) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, contrast: n / 100 } });
              }
            }}
            hint="30–100."
          />
          <TextInput
            label="Photo size (%)"
            value={String(Math.round(d.photoDefaults.photoZoom * 100))}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 50 && n <= 200) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, photoZoom: n / 100 } });
              }
            }}
            hint="50–200. 100 = whole photo, no crop."
          />
          <SelectInput
            label="Quiet zone"
            value={String(d.photoDefaults.quietZone)}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isInteger(n) && n >= 2 && n <= 6) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, quietZone: n } });
              }
            }}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
            hint="2–6 quiet modules around the QR. Smaller = tighter frame."
          />
          <SelectInput
            label="Grid detail"
            value={String(d.photoDefaults.minVersion)}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isInteger(n) && n >= 5 && n <= 12) {
                brand.patch({ photoDefaults: { ...d.photoDefaults, minVersion: n } });
              }
            }}
            options={[5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ value: String(n), label: `Version ${n}` }))}
            hint="QR version floor. Lower = fewer, larger dots."
          />
        </div>
      </Card>

      <Card
        title="Frames"
        desc="Which frame borders visitors can pick in the studio (Design → Frame & caption). Frames are drawn around the code, inside the quiet zone — they never touch the dots. “None” is always available."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FRAME_DEFS.filter((f) => f.id !== "none").map((f) => (
            <ToggleField
              key={f.id}
              label={f.label}
              hint={f.hint}
              checked={(d.enabledFrames ?? []).includes(f.id)}
              onCheckedChange={(v) => {
                const cur = new Set(d.enabledFrames ?? []);
                if (v) cur.add(f.id);
                else cur.delete(f.id);
                brand.patch({ enabledFrames: FRAME_DEFS.filter((x) => x.id !== "none" && cur.has(x.id)).map((x) => x.id) });
              }}
            />
          ))}
        </div>
      </Card>

      <Card
        title="Surprise me"
        desc="The codes the studio’s “Surprise me” button draws from — it picks one at random and loads it as the current QR. Add as many as you like; leave the list empty to keep the old random-look behaviour."
      >
        <div className="space-y-3">
          {(d.surpriseCodes ?? []).length ? null : (
            <p className="text-xs text-muted">No codes yet — the button keeps its old behaviour (random look).</p>
          )}
          {(d.surpriseCodes ?? []).map((c, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-elevated/60 p-2.5"
            >
              <div className="w-32 shrink-0">
                <SelectInput
                  label="Type"
                  value={c.kind}
                  options={[
                    { value: "url", label: "Link" },
                    { value: "phone", label: "Phone" },
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "email", label: "Email" },
                    { value: "text", label: "Plain text" },
                  ]}
                  onValueChange={(v) => patchSurprise(i, { kind: v as SurpriseCode["kind"] })}
                />
              </div>
              <div className="min-w-44 flex-1">
                <TextInput
                  label="Value"
                  value={c.value}
                  onValueChange={(v) => patchSurprise(i, { value: v })}
                  placeholder={c.kind === "url" ? "https://…" : c.kind === "email" ? "hello@you.com" : "+92 300 1234567"}
                />
              </div>
              <div className="w-36 shrink-0">
                <TextInput
                  label="Label (optional)"
                  value={c.label}
                  onValueChange={(v) => patchSurprise(i, { label: v })}
                  maxLength={40}
                />
              </div>
              <button
                type="button"
                aria-label="Remove code"
                onClick={() => brand.patch({ surpriseCodes: (d.surpriseCodes ?? []).filter((_, j) => j !== i) })}
                className="mb-1 inline-flex size-9 items-center justify-center rounded-md border border-border text-muted transition hover:border-danger/40 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              brand.patch({ surpriseCodes: [...(d.surpriseCodes ?? []), { kind: "url", value: "", label: "" }] })
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 text-xs font-semibold text-muted transition hover:border-accent hover:text-fg"
          >
            <Plus className="size-3.5" />
            Add code
          </button>
        </div>
      </Card>

      <Card
        title="Support & tips"
        desc="After someone downloads a QR, a small popup offers to send you a tip. Paste your Ko-fi (or any tip) link and edit the line. Leave the link empty to turn the popup off."
      >
        <TextInput
          label="Tip link (Ko-fi, Buy Me a Coffee, GitHub Sponsors…)"
          value={d.kofiUrl}
          onValueChange={(v) => brand.patch({ kofiUrl: v })}
          placeholder="https://ko-fi.com/qrwho"
          maxLength={400}
          hint="http(s) link only. Empty hides the popup."
        />
        <TextInput
          label="Support message"
          value={d.kofiMessage}
          onValueChange={(v) => brand.patch({ kofiMessage: v })}
          maxLength={200}
          hint='Shown in the post-download popup, e.g. "Enjoying QRWho? A coffee keeps it free for everyone."'
        />
        <button
          type="button"
          onClick={() => setPreviewSupport(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold transition hover:bg-surface-hover"
        >
          <Eye className="size-3.5" />
          Preview the popup visitors see
        </button>
      </Card>

      <Card title="Announcement bar" desc="A slim full-width banner shown above every page. Leave disabled for none.">
        <ToggleField label="Show announcement" checked={d.announcementEnabled} onCheckedChange={(v) => brand.patch({ announcementEnabled: v })} />
        <TextInput label="Text" value={d.announcementText} onValueChange={(v) => brand.patch({ announcementText: v })} maxLength={200} disabled={!d.announcementEnabled} />
        <TextInput label="Link (optional)" value={d.announcementLink} onValueChange={(v) => brand.patch({ announcementLink: v })} maxLength={400} placeholder="https://…" disabled={!d.announcementEnabled} />
        <SaveRow dirty={brand.dirty} saving={save.isPending} onSave={() => save.mutate(d)} onReset={brand.reset} />
      </Card>

      {previewSupport ? (
        <SupportPopup
          url={d.kofiUrl || "https://ko-fi.com/qrwho"}
          message={d.kofiMessage}
          onClose={() => setPreviewSupport(false)}
        />
      ) : null}
    </form>
  );
}

function dirtyBadge(dirty: boolean) {
  return dirty ? <Badge tone="warn">unsaved</Badge> : <Badge tone="ok">saved</Badge>;
}
