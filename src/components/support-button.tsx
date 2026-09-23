import { Coffee } from "lucide-react";
import { useCms } from "@/lib/cms/runtime";

/**
 * The always-visible "support QRWho" button (top right of the landing header
 * and the studio header). Rendered only once the admin has configured a tip
 * link (Admin → Branding → Support & tips); hidden otherwise. Glows with the
 * theme accent; the coffee sits in its own halo.
 */
export function SupportButton() {
  const { brand, status } = useCms();
  if (status !== "ready" || !brand.kofiUrl) return null;
  let host = "";
  try {
    host = new URL(brand.kofiUrl).host;
  } catch {
    host = brand.kofiUrl;
  }
  return (
    <a
      href={brand.kofiUrl}
      target="_blank"
      rel="noreferrer"
      title={`Support QRWho · ${host}`}
      className="group relative inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border border-accent/50 bg-elevated pl-2.5 pr-4 text-sm font-bold tracking-wide text-fg shadow-[0_0_18px_-6px_var(--color-accent),inset_0_0_14px_-8px_var(--color-accent)] transition duration-300 hover:border-accent hover:shadow-[0_0_28px_-4px_var(--color-accent),inset_0_0_18px_-6px_var(--color-accent)]"
    >
      <span className="relative flex size-7 items-center justify-center rounded-full bg-accent/15">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-accent/45 opacity-60 blur-md transition duration-300 group-hover:opacity-100"
        />
        <Coffee className="relative size-4 text-accent" />
      </span>
      <span>Support</span>
    </a>
  );
}
