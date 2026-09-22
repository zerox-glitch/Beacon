import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Draft-state for a settings document: mirrors the saved value until the admin
 * edits it, exposes `dirty`, resets on discard, and re-syncs when the server
 * snapshot changes (e.g. after a save from another tab).
 */
export function useDoc<T extends object>(saved: T | undefined) {
  const [draft, setDraft] = useState<T | null>(saved ?? null);
  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const dirty = useMemo(
    () => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false),
    [draft, saved],
  );

  const patch = useCallback((p: Partial<T>) => {
    setDraft((d) => ({ ...(d ?? ({} as T)), ...p }));
  }, []);

  return {
    draft: (draft ?? saved) as T | null,
    patch,
    setDraft,
    dirty,
    reset: useCallback(() => setDraft(saved ?? null), [saved]),
  };
}
