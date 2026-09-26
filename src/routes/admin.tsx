import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/shell";

/**
 * The CMS. One route, hash-tabbed panels. Nothing here is indexable, and the
 * only data it can ever show or change is gated by `adminMiddleware`
 * server-side (session + cms_admin membership). Unauthenticated visitors —
 * including the server rendering this page — see a sign-in card and nothing
 * else: no loaders touch admin data.
 */
export const Route = createFileRoute("/admin")({
  component: AdminShell,
  head: () => ({
    meta: [
      { title: "QRWho — Admin panel" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
});
