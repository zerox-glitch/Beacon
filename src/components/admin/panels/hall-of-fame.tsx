/**
 * Hall of Fame — the supporters' circles on /hall-of-fame.
 *
 * When someone supports QRWho (the coffee / tip link), their name is added
 * here by hand in one of four exclusive circles. The circle is the title the
 * member keeps — "Chromatic", "Prism", "Aurora", "Spark" — so the panel is a
 * simple list editor: add a member, pick the circle, order within the circle,
 * save. Everything renders on the public page exactly as ordered here.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Crown, Flame, Gem, Plus, Sparkles, Trash2 } from "lucide-react";
import { saveHallOfFameDoc } from "@/lib/cms/admin-api";
import { HALL_OF_FAME_CIRCLES, type HallOfFameCircle, type HallOfFameDoc, type HallOfFameMember } from "@/lib/cms/schemas";
import { Button } from "@/components/ui/button";
import { Card, Modal, Note } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { useAdminMutation, useAdminSettings } from "../session";
import type { AdminSettings } from "../types";

const CIRCLE_META: Record<HallOfFameCircle, { name: string; short: string; desc: string; Icon: typeof Crown }> = {
  chromatic: {
    name: "The Chromatic Circle",
    short: "Chromatic",
    desc: "The innermost circle — grandest patrons. They carry the entire spectrum.",
    Icon: Crown,
  },
  prism: {
    name: "The Prism Circle",
    short: "Prism",
    desc: "Generous supporters who split the grey light into color.",
    Icon: Gem,
  },
  aurora: {
    name: "The Aurora Circle",
    short: "Aurora",
    desc: "Kind supporters who lit up the sky for everyone after them.",
    Icon: Sparkles,
  },
  spark: {
    name: "The Spark Circle",
    short: "Spark",
    desc: "Every colorful world begins with one spark. The first step into the circle.",
    Icon: Flame,
  },
};

const EMPTY: HallOfFameDoc = { members: [] };

function newMember(circle: HallOfFameCircle, name: string, note: string, link: string): HallOfFameMember {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name, circle, note, link };
}

export function HallOfFamePanel() {
  const { data } = useAdminSettings<AdminSettings>();

  const effective = docOrEmpty(data?.hallOfFame);
  const [draft, setDraft] = useState<HallOfFameDoc | null>(null);
  const active = draft ?? effective;
  const dirty = JSON.stringify(active) !== JSON.stringify(effective);

  const save = useAdminMutation((doc: HallOfFameDoc) => saveHallOfFameDoc({ data: doc }), {
    success: "Hall of Fame saved — live on the site",
  });

  const [adding, setAdding] = useState<HallOfFameCircle | null>(null);
  const [form, setForm] = useState({ name: "", note: "", link: "" });

  if (!data) return null;

  const setMembers = (members: HallOfFameMember[]) => setDraft({ members });

  const patchAt = (idx: number, patch: Partial<HallOfFameMember>) =>
    setMembers(active.members.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const removeAt = (idx: number) => setMembers(active.members.filter((_, i) => i !== idx));

  // Move within the same circle only — circles keep their own order.
  const move = (idx: number, dir: -1 | 1) => {
    const member = active.members[idx];
    if (!member) return;
    const inCircle = active.members
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.circle === member.circle);
    const pos = inCircle.findIndex(({ i }) => i === idx);
    const other = inCircle[pos + dir];
    if (!other) return;
    const arr = [...active.members];
    arr[idx] = other.m;
    arr[other.i] = member;
    setMembers(arr);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) save.mutate(active);
      }}
    >
      <Card
        title="Hall of Fame"
        desc="The permanent supporters of QRWho. When someone buys a coffee, add their name here and pick the circle that becomes their title. Names render on /hall-of-fame exactly in this order, and stay until you remove them."
      >
        <div className="space-y-4">
          {HALL_OF_FAME_CIRCLES.map((circle) => {
            const meta = CIRCLE_META[circle];
            const Icon = meta.Icon;
            const rows = active.members
              .map((m, i) => ({ m, i }))
              .filter(({ m }) => m.circle === circle);
            return (
              <div key={circle} className="space-y-2 rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold text-fg">
                    <Icon className="size-4 text-accent" />
                    {meta.name}
                    <span className="font-normal text-subtle">
                      — {meta.desc} ({rows.length} {rows.length === 1 ? "member" : "members"})
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm({ name: "", note: "", link: "" });
                      setAdding(circle);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add member
                  </Button>
                </div>
                {rows.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-[11px] text-subtle">
                    No members yet — the first name here takes the title “{meta.short}”.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {rows.map(({ m, i }, pos) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-elevated p-2">
                        <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-3">
                          <Input
                            value={m.name}
                            onChange={(e) => patchAt(i, { name: e.target.value })}
                            placeholder="Name (as it should appear)"
                            maxLength={60}
                            className="h-8 text-xs"
                          />
                          <Input
                            value={m.note}
                            onChange={(e) => patchAt(i, { note: e.target.value })}
                            placeholder="Optional note (dedication, hello…)"
                            maxLength={120}
                            className="h-8 text-xs"
                          />
                          <Input
                            value={m.link}
                            onChange={(e) => patchAt(i, { link: e.target.value })}
                            placeholder="Optional link (https://…)"
                            maxLength={300}
                            className="h-8 font-mono text-[11px]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" disabled={pos === 0} onClick={() => move(i, -1)} aria-label="Move up">
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" disabled={pos === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => removeAt(i)} aria-label="Remove member">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <Note>
          <Crown className="mr-1 inline size-3.5 align-[-2px]" />
          Each circle is the title its members keep — the public page shows the circle badge next to
          every name. Save after adding names; the page updates immediately.
        </Note>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          {dirty ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(effective)}>
              Reset
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save Hall of Fame"}
          </Button>
        </div>
      </Card>

      <Modal
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={`Add a member to ${adding ? CIRCLE_META[adding].name : ""}`}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!adding || !form.name.trim()) return;
            setMembers([...active.members, newMember(adding, form.name.trim(), form.note.trim(), form.link.trim())]);
            setAdding(null);
          }}
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg">Name</p>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Exactly as it should appear"
              maxLength={60}
              autoFocus
            />
            <p className="text-[11px] text-subtle">
              This is their title: “{adding ? CIRCLE_META[adding].short : ""}” — shown permanently on the Hall of Fame.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg">Note (optional)</p>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="A dedication or one-liner under the name"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg">Link (optional)</p>
            <Input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://their-site.com"
              maxLength={300}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!form.name.trim()}>
              Add to the circle
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  );
}

/** Stable default so the dirty check never trips on undefined. */
function docOrEmpty(doc: HallOfFameDoc | undefined): HallOfFameDoc {
  return doc ?? EMPTY;
}
