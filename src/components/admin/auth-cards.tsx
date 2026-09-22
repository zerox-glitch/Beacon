/**
 * First-run setup + sign-in cards. Both talk to admin server functions only;
 * neither renders until the server confirms the setup state, so nobody can
 * probe "is setup still open" from the markup.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSignIn, adminSetup, LOCKOUT_MESSAGE_PREFIX } from "@/lib/cms/admin-api";
import { setAdminBearer } from "@/lib/cms/admin-bearer";
import { assessPassword } from "@/lib/cms/policy";
import { cn } from "@/lib/utils";

function StrengthMeter({ password, name, email }: { password: string; name: string; email: string }) {
  const a = assessPassword(password, [name, email.split("@")[0] ?? ""]);
  const label = ["Too weak", "Weak", "Fair", "Strong", "Excellent"][a.score] ?? "—";
  const tone = ["bg-danger", "bg-danger", "bg-warn", "bg-ok", "bg-ok"][a.score] ?? "bg-danger";
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", a.score > i ? tone : "bg-border")} />
        ))}
      </div>
      <p className={cn("text-[11px]", a.ok ? "text-ok" : "text-warn")}>
        {a.ok ? `✓ ${label}` : a.issues[0] ?? label}
      </p>
    </div>
  );
}

export function SetupCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    adminName: "",
    email: "",
    password: "",
    confirm: "",
    setupKey: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    const a = assessPassword(form.password, [form.adminName, form.email.split("@")[0] ?? ""]);
    if (!a.ok) {
      toast.error(a.issues[0] ?? "Password rejected");
      return;
    }
    setBusy(true);
    try {
      const res = await adminSetup({ data: form });
      setAdminBearer(res.token);
      toast.success(`Admin “${res.name}” created — panel locked to your account`);
      await qc.invalidateQueries({ queryKey: ["admin-me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md space-y-5 rounded-2xl border border-border bg-elevated p-6 shadow-2xl">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
        <div>
          <h1 className="font-display text-xl italic tracking-tight text-fg">First-run setup</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Create the single admin account for this site. Until you finish, anyone who reaches
            this URL could claim it — do it now, with a strong unique password. After the claim,
            account creation is closed permanently.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-name">Admin name</Label>
        <Input id="setup-name" autoFocus value={form.adminName} onChange={(e) => set("adminName")(e.target.value)} placeholder="e.g. Studio Owner" required minLength={2} maxLength={60} />
        <p className="text-[11px] text-subtle">Shown in the panel and audit log. Not a login handle.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="setup-email">Sign-in email</Label>
        <Input id="setup-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="you@yourdomain.com" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="setup-pass">Strong password</Label>
        <Input id="setup-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password")(e.target.value)} required maxLength={200} />
        <StrengthMeter password={form.password} name={form.adminName} email={form.email} />
        <p className="text-[11px] text-subtle">
          Min 12 chars with mixed classes (≈60 bits), or a 24+ char passphrase. No self-service
          reset — store it in your password manager.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="setup-confirm">Repeat password</Label>
        <Input id="setup-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm")(e.target.value)} required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="setup-key">
          <span className="inline-flex items-center gap-1.5">
            Setup key <KeyRound className="size-3 text-subtle" />
          </span>
        </Label>
        <Input id="setup-key" type="password" autoComplete="off" value={form.setupKey} onChange={(e) => set("setupKey")(e.target.value)} placeholder="Only if ADMIN_SETUP_KEY is set on the server" />
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Locking the panel…" : "Create admin & lock setup"}
      </Button>
    </form>
  );
}

export function LoginCard() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = window.setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [lockSeconds]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await adminSignIn({ data: { email, password } });
      setAdminBearer(res.token);
      toast.success(`Welcome back, ${res.name}`);
      await qc.invalidateQueries({ queryKey: ["admin-me"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      if (message.startsWith(LOCKOUT_MESSAGE_PREFIX)) {
        setLockSeconds(Number.parseInt(message.slice(LOCKOUT_MESSAGE_PREFIX.length), 10) || 60);
        toast.error("Too many failed attempts — account locked temporarily");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-5 rounded-2xl border border-border bg-elevated p-6 shadow-2xl">
      <div>
        <h1 className="font-display text-xl italic tracking-tight text-fg">Admin sign in</h1>
        <p className="mt-1 text-xs text-muted">QRWho control panel — authorized admin only.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-pass">Password</Label>
        <Input id="login-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={200} />
      </div>
      {lockSeconds > 0 ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          Locked after repeated failures — retry in {Math.ceil(lockSeconds)}s.
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy || lockSeconds > 0}>
        {busy ? "Checking…" : "Sign in"}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-subtle">
        Failed attempts are throttled per IP and per account (5 failures → 15 min lock).
      </p>
    </form>
  );
}
