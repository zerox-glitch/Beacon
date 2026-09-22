/**
 * Admin panel primitives — dark, dense, keyboard-friendly. Built on the app's
 * existing ui kit (Button/Input/…) and design tokens so the panel feels like
 * part of the product, and every control maps 1:1 onto a validated API call.
 */
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Card({
  title,
  desc,
  children,
  actions,
  className,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-elevated", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {desc ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{desc}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-subtle">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onValueChange,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  value,
  onValueChange,
  rows = 3,
  mono = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(mono && "font-mono text-xs leading-relaxed")}
      />
    </Field>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint ? <p className="text-[11px] leading-relaxed text-subtle">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function SelectInput({
  label,
  value,
  onValueChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SaveRow({
  dirty,
  saving,
  onSave,
  onReset,
  note,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset?: () => void;
  note?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-elevated/95 px-4 py-3 backdrop-blur">
      <p className="text-[11px] text-subtle">{dirty ? note ?? "Unsaved changes" : note ?? "All changes saved"}</p>
      <div className="flex items-center gap-2">
        {dirty && onReset ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "danger" | "accent";
}) {
  const tones: Record<string, string> = {
    muted: "border-border bg-surface text-muted",
    ok: "border-ok/40 bg-ok/10 text-ok",
    warn: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger",
    accent: "border-accent/40 bg-accent/10 text-accent",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={cn("my-8 w-full rounded-xl border border-border-strong bg-elevated shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function DangerNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs leading-relaxed text-danger">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

/** Small brand chip in the admin top bar. */
export function AdminWordmark({ logoUrl, siteName }: { logoUrl: string; siteName: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <img src={logoUrl || "/logo.png"} alt="" className="size-8 shrink-0 rounded-lg border border-border" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-fg">{siteName || "QRWho"}</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Admin</p>
      </div>
    </div>
  );
}

export function AdminTopBar({
  logoUrl,
  siteName,
  signedInAs,
  onSignOut,
}: {
  logoUrl: string;
  siteName: string;
  signedInAs: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-elevated px-4 py-2.5">
      <AdminWordmark logoUrl={logoUrl} siteName={siteName} />
      <div className="flex items-center gap-2">
        {signedInAs ? (
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
            <span className="size-1.5 rounded-full bg-ok" />
            {signedInAs}
          </span>
        ) : null}
        <Link to="/" className="text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline">
          View site
        </Link>
        {signedInAs ? (
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>
    </header>
  );
}

/** Collapsible section (SEO pages etc.). */
export function Disclosure({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-fg hover:bg-surface"
      >
        {title}
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-3 border-t border-border p-3">{children}</div> : null}
    </div>
  );
}
