/**
 * Admin shell: session gate + tabbed dashboard. Panels never mount until the
 * server confirms `adminMe` (identity + cms_admin membership), and every panel
 * mutation re-verifies independently on the server — client gating is UX,
 * not security.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ShieldAlert,
  Gauge,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  SearchCode,
  ShieldCheck,
  TextCursorInput,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { adminSignOut, getSetupStatus } from "@/lib/cms/admin-api";
import { setAdminBearer } from "@/lib/cms/admin-bearer";
import { ensureCms } from "@/lib/cms/runtime";
import { QueryClientProvider } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { makeAdminQueryClient, useAdminSession } from "./session";
import { LoginCard, SetupCard } from "./auth-cards";
import { AdminTopBar } from "./ui";
import { OverviewPanel } from "./panels/overview";
import { BrandingPanel } from "./panels/branding";
import { MediaPanel } from "./panels/media";
import { TemplatesPanel } from "./panels/templates";
import { SeoPanel } from "./panels/seo";
import { ContentPanel } from "./panels/content";
import { SecurityPanel } from "./panels/security";

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "templates", label: "QR templates", icon: LayoutTemplate },
  { id: "seo", label: "SEO", icon: SearchCode },
  { id: "content", label: "Site content", icon: TextCursorInput },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

function useHashTab(defaultTab: TabId = "overview"): [TabId, (t: TabId) => void] {
  const read = (): TabId => {
    const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#\/?/, "");
    return (TABS.some((t) => t.id === h) ? h : defaultTab) as TabId;
  };
  const [tab, setTab] = useState<TabId>(read);
  useEffect(() => {
    const on = () => setTab(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (t: TabId) => {
    window.location.hash = `/${t}`;
    setTab(t);
  };
  return [tab, set];
}

function useSetupAvailable(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    getSetupStatus()
      .then((s) => live && setV(s.setupAvailable))
      .catch(() => live && setV(false));
    return () => {
      live = false;
    };
  }, []);
  return v;
}

function Dashboard() {
  const { me } = useAdminSession();
  const qc = useQueryClient();
  const [tab, setTab] = useHashTab();
  const [brand, setBrand] = useState<{ logoUrl: string; siteName: string }>({
    logoUrl: "/logo.png",
    siteName: "QRWho",
  });

  // Brand chip + public-site runtime stay in sync with the saved CMS state.
  useEffect(() => {
    let live = true;
    void ensureCms(true).then(() => {
      if (!live) return;
      void import("@/lib/cms/runtime").then(({ getCmsState }) => {
        const { brand: b } = getCmsState();
        if (live) setBrand({ logoUrl: b.logoUrl, siteName: b.siteName });
      });
    });
    return () => {
      live = false;
    };
  }, [tab]);

  async function signOut() {
    try {
      await adminSignOut();
    } catch {
      /* session may already be gone — always clear locally */
    }
    setAdminBearer(null);
    await qc.invalidateQueries({ queryKey: ["admin-me"] });
    toast.success("Signed out of the admin panel");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AdminTopBar logoUrl={brand.logoUrl} siteName={brand.siteName} signedInAs={me?.name ?? null} onSignOut={signOut} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-3 py-5 sm:px-5 lg:flex-row lg:gap-7">
        <nav className="flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-48 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Admin sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition lg:w-full",
                tab === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </nav>
        <main className="min-w-0 flex-1 space-y-5">
          {tab === "overview" ? <OverviewPanel /> : null}
          {tab === "branding" ? <BrandingPanel /> : null}
          {tab === "media" ? <MediaPanel /> : null}
          {tab === "templates" ? <TemplatesPanel /> : null}
          {tab === "seo" ? <SeoPanel /> : null}
          {tab === "content" ? <ContentPanel /> : null}
          {tab === "security" ? <SecurityPanel /> : null}
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { me, isLoading } = useAdminSession();
  const setupAvailable = useSetupAvailable();

  if (isLoading || (me === null && setupAvailable === null)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="size-4 animate-spin" />
          Checking your admin session…
        </div>
      </div>
    );
  }
  if (me) return <Dashboard />;
  if (setupAvailable) return <AuthLayout><SetupCard /></AuthLayout>;
  return <AuthLayout><LoginCard /></AuthLayout>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg bg-[radial-gradient(60%_50%_at_50%_0%,rgb(143_166_122/0.08),transparent)] px-4 py-10">
      <div className="text-center">
        <img src="/logo.png" alt="" className="mx-auto size-12 rounded-xl border border-border" />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">QRWho · Restricted area</p>
      </div>
      {children}
      <div className="w-full max-w-md rounded-xl border-2 border-danger/40 bg-danger/5 px-4 py-3 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-danger">
          <ShieldAlert className="size-3.5" /> Authorized personnel only
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-danger/85">
          This is a private, monitored system. Every visit and every access attempt — successful or
          denied — is captured with IP address, device signature and precise timestamps and is
          retained for abuse reporting. Unauthorized entry, scanning or password guessing are
          criminal offences under the Computer Fraud and Abuse Act, the EU Convention on Cybercrime
          and equivalent computer-misuse laws in your jurisdiction, and they are investigated and
          reported — never ignored. If you are not the site owner, close this page now.
        </p>
      </div>
    </div>
  );
}

export function AdminShell() {
  const [client] = useState(makeAdminQueryClient);
  return (
    <QueryClientProvider client={client}>
      <Gate />
      <Toaster theme="dark" position="bottom-center" richColors={false} />
    </QueryClientProvider>
  );
}
