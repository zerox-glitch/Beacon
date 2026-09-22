import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveContentDoc } from "@/lib/cms/admin-api";
import type { ContentDoc } from "@/lib/cms/schemas";
import { Card, Note, SaveRow, TextAreaField, TextInput } from "../ui";
import { useAdminMutation, useAdminSettings } from "../session";
import { useDoc } from "../use-doc";
import type { AdminSettings } from "../types";

export function ContentPanel() {
  const { data } = useAdminSettings<AdminSettings>();
  const content = useDoc<ContentDoc>(data?.content);
  const save = useAdminMutation((doc: ContentDoc) => saveContentDoc({ data: doc }), {
    success: "Site content saved",
  });
  if (!data || !content.draft) return null;
  const d = content.draft;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (content.dirty) save.mutate(d);
      }}
    >
      <Card
        title="Landing page copy"
        desc="The hero paragraph, calls to action and the rotating word list on the public landing page."
      >
        <TextAreaField label="Hero subtitle" value={d.heroSubtitle} onValueChange={(v) => content.patch({ heroSubtitle: v })} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Primary CTA" value={d.ctaPrimary} onValueChange={(v) => content.patch({ ctaPrimary: v })} maxLength={60} />
          <TextInput label="Secondary CTA" value={d.ctaSecondary} onValueChange={(v) => content.patch({ ctaSecondary: v })} maxLength={60} />
        </div>
        <TextInput
          label="Rotating words"
          value={d.heroWords}
          onValueChange={(v) => content.patch({ heroWords: v })}
          hint='Comma-separated. The hero cycles "Turn any <word> into a QR…" through these.'
          maxLength={400}
        />
        <TextAreaField label="Privacy line" value={d.privacyLine} onValueChange={(v) => content.patch({ privacyLine: v })} rows={2} />
        <SaveRow dirty={content.dirty} saving={save.isPending} onSave={() => save.mutate(d)} onReset={content.reset} />
      </Card>

      <RawJsonCard value={d} onApply={(v) => content.setDraft(v as ContentDoc)} />
    </form>
  );
}

/** Power-user JSON editor for the same document. */
export function RawJsonCard({ value, onApply }: { value: unknown; onApply: (v: unknown) => void }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = text ?? JSON.stringify(value, null, 2);
  return (
    <Card
      title="Raw JSON"
      desc="Edit the underlying data object directly. Parsed and validated by the server on save — invalid documents are rejected."
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(JSON.stringify(value, null, 2));
              setError(null);
            }}
          >
            Re-sync
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              try {
                const parsed = JSON.parse(shown) as unknown;
                onApply(parsed);
                setError(null);
                setText(null);
              } catch (err) {
                setError((err as Error).message || "Invalid JSON");
              }
            }}
          >
            Apply to form
          </Button>
        </div>
      }
    >
      <Textarea value={shown} onChange={(e) => setText(e.target.value)} rows={12} className="font-mono text-[11px] leading-relaxed" />
      {error ? <p className="text-[11px] text-danger">JSON error: {error}</p> : null}
      <Note>“Apply to form” only updates the draft — nothing is written until you press Save.</Note>
    </Card>
  );
}
