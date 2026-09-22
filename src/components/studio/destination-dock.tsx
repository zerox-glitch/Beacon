import type { ChangeEvent } from "react";
import { DOCK_FIELDS, kindMeta, PRIMARY_KINDS, MORE_KINDS, type DockField } from "@/lib/qr/kinds";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Payload, PayloadKind } from "@/lib/qr/types";

export function DestinationDock() {
  const payload = useStudio((s) => s.payload);
  const setKind = useStudio((s) => s.setKind);
  const patch = useStudio((s) => s.patchPayload);
  const setMobileTab = useStudio((s) => s.setMobileTab);
  const meta = kindMeta(payload.kind);
  const value = String(payload[meta.field] ?? "");
  const extra = DOCK_FIELDS[payload.kind] ?? [];

  function onKind(id: PayloadKind) {
    setKind(id);
    setMobileTab("content");
  }

  return (
    <div className="mx-auto w-full max-w-[230px] sm:max-w-[300px] md:max-w-[380px] lg:max-w-[420px]">
      <p className="mb-1 hidden px-0.5 text-[10px] font-semibold tracking-wide text-fg/80 sm:mb-1.5 sm:block sm:text-[11px]">
        1 · Paste what this QR opens
      </p>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {PRIMARY_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => onKind(k.id)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold",
              payload.kind === k.id
                ? "border-accent bg-accent text-accent-fg"
                : "border-white/20 bg-bg/80 text-fg/85 hover:bg-white/10",
            )}
          >
            {k.label}
          </button>
        ))}
        <select
          aria-label="More QR types"
          value={MORE_KINDS.some((k) => k.id === payload.kind) ? payload.kind : ""}
          onChange={(e) => {
            if (e.target.value) onKind(e.target.value as PayloadKind);
          }}
          className={cn(
            "h-8 shrink-0 rounded-full border bg-bg/80 px-2 text-[11px] font-semibold",
            MORE_KINDS.some((k) => k.id === payload.kind)
              ? "border-accent bg-accent text-accent-fg"
              : "border-white/20 text-fg/85",
          )}
        >
          <option value="">More…</option>
          {MORE_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <input
        value={value}
        placeholder={meta.placeholder}
        aria-label={meta.label}
        className="mt-1.5 h-11 w-full rounded-xl border border-white/20 bg-bg/90 px-3 text-sm text-fg shadow-lg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent/40"
        onChange={(e) => patch({ [meta.field]: e.target.value } as Partial<Payload>)}
      />

      {/* Multi-field types: every field sits right above the QR — the same
          store the side panel edits, so both stay in sync. */}
      {extra.length > 0 && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {extra.map((f) => (
            <DockInput key={String(f.field)} f={f} payload={payload} patch={patch} />
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "h-8 w-full rounded-lg border border-white/15 bg-bg/85 px-2 text-xs text-fg outline-none placeholder:text-muted/80 focus-visible:ring-2 focus-visible:ring-accent/40";

function DockInput({
  f,
  payload,
  patch,
}: {
  f: DockField;
  payload: Payload;
  patch: (p: Partial<Payload>) => void;
}) {
  if (f.check) {
    const on = Boolean(payload[f.field]);
    return (
      <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-bg/85 px-2 text-xs font-medium text-fg/85">
        <input
          type="checkbox"
          checked={on}
          className="size-3.5 accent-[var(--accent,#a3c46a)]"
          onChange={(e) => patch({ [f.field]: e.target.checked } as Partial<Payload>)}
        />
        {f.label}
      </label>
    );
  }
  if (f.options) {
    return (
      <select
        aria-label={f.label}
        value={String(payload[f.field] ?? "")}
        className={inputCls}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => patch({ [f.field]: e.target.value } as Partial<Payload>)}
      >
        {f.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={f.type ?? "text"}
      aria-label={f.label}
      placeholder={f.placeholder}
      value={String(payload[f.field] ?? "")}
      className={inputCls}
      onChange={(e: ChangeEvent<HTMLInputElement>) => patch({ [f.field]: e.target.value } as Partial<Payload>)}
    />
  );
}
