import { Coffee } from "lucide-react";
import { useCms } from "@/lib/cms/runtime";

/**
 * The always-visible "support QRWho" button (top right of the landing header
 * and the studio header). Rendered only once the admin has configured a tip
 * link (Admin → Branding → Support & tips); hidden otherwise.
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
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-accent/50 bg-accent/10 px-3 text-xs font-bold text-fg transition hover:bg-accent hover:text-accent-fg sm:h-9"
    >
      <Coffee className="size-3.5" />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}
