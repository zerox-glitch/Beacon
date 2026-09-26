/**
 * Admin client foundation: react-query wiring, session state, and the single
 * place that reacts to a lost/invalid admin session (clears the bearer token
 * and drops the UI back to the sign-in card). Server-side, EVERY function
 * re-verifies the session + membership — this client logic is UX only.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminMe } from "@/lib/cms/admin-api";
import { setAdminBearer } from "@/lib/cms/admin-bearer";
import { ensureCms } from "@/lib/cms/runtime";

export const ADMIN_REQUIRED = "Admin session required";

export function makeAdminQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 10_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Normalize any thrown value into a display message; sign the UI out on 401. */
function handleAdminError(err: unknown, signedOut: () => void): string {
  const message = err instanceof Error ? err.message : String(err ?? "Request failed");
  if (message.includes(ADMIN_REQUIRED) || message.includes("not the site admin")) {
    signedOut();
    return "Your admin session expired — sign in again.";
  }
  return message;
}

export function useAdminSession() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-me"],
    queryFn: async () => {
      try {
        const me = await adminMe();
        if (!me) setAdminBearer(null);
        return me;
      } catch {
        setAdminBearer(null);
        return null;
      }
    },
  });
  const signedOut = () => {
    setAdminBearer(null);
    void qc.invalidateQueries({ queryKey: ["admin-me"] });
  };
  return { me: query.data ?? null, isLoading: query.isPending, error: query.error, signedOut };
}

/** Mutation wrapper: toast on error, refresh public site + admin data after writes. */
export function useAdminMutation<TInput, TVar = void>(
  fn: (input: TInput) => Promise<TVar>,
  opts: { success?: string; invalidate?: readonly string[] } = {},
) {
  const qc = useQueryClient();
  const { signedOut } = useAdminSession();
  return useMutation({
    mutationFn: async (input: TInput) => {
      try {
        const result = await fn(input);
        return result;
      } catch (err) {
        throw new Error(handleAdminError(err, signedOut));
      }
    },
    onSuccess: () => {
      if (opts.success) toast.success(opts.success);
      // The public site runtime + every admin panel refetch from these keys.
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: ["admin-audit"] });
      void qc.invalidateQueries({ queryKey: ["admin-me"] });
      if (opts.invalidate) {
        for (const key of opts.invalidate) void qc.invalidateQueries({ queryKey: [key] });
      }
      void ensureCms(true);
    },
    onError: (err: Error) => toast.error(err.message || "Request failed"),
  });
}

/** Whole-settings snapshot used by every panel (one round trip, shared cache). */
export function useAdminSettings<T>() {
  return useQuery<T, Error>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { getAdminSettings } = await import("@/lib/cms/admin-api");
      return (await getAdminSettings()) as T;
    },
  });
}
