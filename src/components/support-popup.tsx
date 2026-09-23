/**
 * The "support QRWho" popup. Shown in the studio after a successful PNG/SVG
 * download when the admin configured a tip link (Admin → Branding → Support
 * & tips), and previewable from that same admin card. Small, non-blocking,
 * auto-dismisses — a gentle nudge, not a paywall.
 */
import { useEffect } from "react";
import { X } from "lucide-react";

export function SupportPopup({ url, message, onClose }: { url: string; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 12000);
    return () => window.clearTimeout(t);
  }, [onClose]);

  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Support QRWho"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border-strong bg-elevated p-5 text-center shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted transition hover:bg-surface hover:text-fg"
        >
          <X className="size-4" />
        </button>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xl">
          <span aria-hidden>☕</span>
        </div>
        <h3 className="mt-3 font-display text-xl italic">Enjoying QRWho?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{message}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
        >
          Buy us a coffee
          <span className="text-[11px] font-medium opacity-70">{host}</span>
        </a>
        <p className="mt-2.5 text-[11px] text-subtle">QRWho stays free — no accounts, no watermark, no expiry.</p>
      </div>
    </div>
  );
}
