import { useRef, useState } from "react";
import { Check, Copy, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMedia, uploadMedia } from "@/lib/cms/admin-api";
import { Badge, Card, DangerNote, SelectInput } from "@/components/admin/ui";
import { toast } from "sonner";
import { useAdminMutation, useAdminSettings } from "@/components/admin/session";
import type { AdminSettings } from "@/components/admin/types";

const MAX_BYTES = 4 * 1024 * 1024;

export function MediaPanel() {
  const { data, isLoading } = useAdminSettings<AdminSettings>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"image" | "logo" | "og" | "art">("image");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useAdminMutation(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_BYTES) throw new Error(`“${file.name}” is over the 4 MB limit`);
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
      return uploadMedia({ data: { filename: file.name, kind, alt: "", dataBase64: btoa(bin) } });
    },
    { success: "Image uploaded", invalidate: ["admin-media"] },
  );
  const remove = useAdminMutation(
    async (id: string) => {
      try {
        await deleteMedia({ data: { id } });
      } catch (err) {
        throw new Error((err as Error).message || "Delete failed");
      }
    },
    { success: "Image deleted", invalidate: ["admin-media"] },
  );

  const media = data?.media ?? [];

  return (
    <div className="space-y-5">
      <Card
        title="Media library"
        desc="Logos, share-card art and template artwork, stored in the database (never on disk) and served from /api/media/<id> with an immutable cache."
        actions={
          <Button type="button" size="sm" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            <Upload className="size-3.5" />
            {upload.isPending ? "Uploading…" : "Upload image"}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <SelectInput
            label="Upload as"
            value={kind}
            onValueChange={(v) => setKind(v as typeof kind)}
            options={[
              { value: "image", label: "Image" },
              { value: "logo", label: "Logo" },
              { value: "og", label: "Share card (OG)" },
              { value: "art", label: "Template artwork" },
            ]}
          />
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted">
              PNG · JPEG · WebP · GIF, max 4 MB. Real file type is verified from magic bytes —
              renamed or spoofed files are rejected. SVG is disabled on purpose (script-in-image
              XSS).
            </p>
            {error ? <p className="text-[11px] text-danger">{error}</p> : null}
            <DangerNote>Images here are publicly fetchable by URL (that is how the site renders them). Do not upload anything private.</DangerNote>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload.mutate(f);
          }}
        />
      </Card>

      <Card title={`Stored images (${media.length})`}>
        {isLoading ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : media.length === 0 ? (
          <p className="text-xs text-subtle">Nothing uploaded yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((m) => (
              <li key={m.id} className="group space-y-2 rounded-lg border border-border bg-surface p-2">
                <div className="aspect-square overflow-hidden rounded bg-elevated">
                  <img src={m.url} alt={m.alt ?? m.filename} loading="lazy" className="size-full object-contain" />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="min-w-0 truncate text-[11px] font-medium text-fg" title={m.filename}>
                    {m.filename}
                  </p>
                  <Badge>{m.kind}</Badge>
                </div>
                <p className="text-[10px] text-subtle">{(m.sizeBytes / 1024).toFixed(0)} KB</p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 flex-1 text-[11px]"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${window.location.origin}${m.url}`);
                      setCopied(m.id);
                      toast.success("URL copied");
                      window.setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1200);
                    }}
                  >
                    {copied === m.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                    Copy URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-danger"
                    title="Delete"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete “${m.filename}”? References in branding/SEO will block deletion until reassigned.`)) {
                        remove.mutate(m.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
