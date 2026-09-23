import { useState } from "react";
import { saveBrandDoc } from "@/lib/cms/admin-api";
import type { BrandDoc } from "@/lib/cms/schemas";
import { Badge, Card, SaveRow, TextInput, ToggleField } from "../ui";
import { ImagePicker } from "../image-picker";
import { useAdminMutation, useAdminSettings } from "../session";
import { useDoc } from "../use-doc";
import type { AdminSettings } from "../types";

export function BrandingPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const brand = useDoc<BrandDoc>(data?.brand);
  const [themeDraft, setThemeDraft] = useState<string | null>(null);
  const save = useAdminMutation(
    (doc: BrandDoc) => saveBrandDoc({ data: doc }),
    { success: "Branding saved — live on the public site", invalidate: ["admin-brand"] },
  );
  if (!data || !brand.draft) return null;
  const d = brand.draft;
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
      </Card>

      <Card title="Announcement bar" desc="A slim full-width banner shown above every page. Leave disabled for none.">
        <ToggleField label="Show announcement" checked={d.announcementEnabled} onCheckedChange={(v) => brand.patch({ announcementEnabled: v })} />
        <TextInput label="Text" value={d.announcementText} onValueChange={(v) => brand.patch({ announcementText: v })} maxLength={200} disabled={!d.announcementEnabled} />
        <TextInput label="Link (optional)" value={d.announcementLink} onValueChange={(v) => brand.patch({ announcementLink: v })} maxLength={400} placeholder="https://…" disabled={!d.announcementEnabled} />
        <SaveRow dirty={brand.dirty} saving={save.isPending} onSave={() => save.mutate(d)} onReset={brand.reset} />
      </Card>
    </form>
  );
}

function dirtyBadge(dirty: boolean) {
  return dirty ? <Badge tone="warn">unsaved</Badge> : <Badge tone="ok">saved</Badge>;
}
