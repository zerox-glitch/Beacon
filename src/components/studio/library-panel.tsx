import { FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScanDecode } from "@/components/qr/scan-decode";
import { classifyScan } from "@/lib/qr/scan-intent";
import { useStudio } from "@/lib/store";

export function LibraryPanel() {
  return (
    <div className="flex flex-col gap-8">
      <HistorySection />
      <DecodeSection />
    </div>
  );
}

function HistorySection() {
  const history = useStudio((s) => s.history);
  const load = useStudio((s) => s.loadHistoryItem);
  const remix = useStudio((s) => s.remixHistoryItem);
  const remove = useStudio((s) => s.deleteHistoryItem);

  return (
    <section>
      <p className="mb-1 text-xs font-semibold tracking-wide text-fg">Recent · this browser</p>
      <p className="mb-3 text-[11px] leading-snug text-muted">
        Saved when you download. Stays on this device — nothing is uploaded.
      </p>
      {history.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-elevated/60 px-4 text-center">
          <FolderOpen className="size-5 text-muted" />
          <p className="text-xs text-muted">No downloads yet. Save PNG to pin a remix here.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-2"
            >
              {h.thumb ? (
                <img src={h.thumb} alt="" className="size-12 rounded-md object-cover" />
              ) : (
                <span className="size-12 rounded-md bg-surface" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-fg">{h.label}</p>
                <p className="text-[10px] text-muted">
                  {new Date(h.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="h-8 rounded-md px-2 text-[11px] font-semibold text-fg hover:bg-surface"
                onClick={() => {
                  load(h.id);
                  toast.success("Loaded");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="h-8 rounded-md px-2 text-[11px] font-semibold text-fg hover:bg-surface"
                onClick={() => {
                  remix(h.id);
                  toast.success("Remixed look — paste a new destination");
                }}
              >
                Remix
              </button>
              <button
                type="button"
                className="size-8 rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                aria-label="Delete"
                onClick={() => remove(h.id)}
              >
                <Trash2 className="mx-auto size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DecodeSection() {
  return (
    <ScanDecode
      heading="Decode a QR"
      hint="Runs locally with jsQR — same engine as Fix scan. Not a phone-camera test."
      primary={(result) => (
        <button
          type="button"
          onClick={() => loadScanned(result)}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent px-2.5 text-[11px] font-bold text-accent-fg"
        >
          Make a new QR
        </button>
      )}
    />
  );
}

/** Scan → typed fields: the studio fills the matching use-case form, not just a blob. */
function loadScanned(result: string) {
  const intent = classifyScan(result);
  const setKind = useStudio.getState().setKind;
  const patchPayload = useStudio.getState().patchPayload;
  setKind(intent.kind);
  patchPayload(intent);
  toast.success("Loaded as a new QR");
}

