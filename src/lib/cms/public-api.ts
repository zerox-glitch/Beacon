/**
 * Public (read-only) CMS surface. Server functions, GET — no auth, no secrets.
 * Hidden templates are already filtered server-side (store.listTemplateRows),
 * so they never appear in this payload.
 */
import { createServerFn } from "@tanstack/react-start";

export const getPublicCms = createServerFn({ method: "GET" }).handler(async () => {
  const store = await import("./store.server");
  return store.getPublicBundle();
});

/** SSR-safe per-page SEO meta (title/description/robots/og/canonical). */
export const getPageSeo = createServerFn({ method: "GET" })
  .validator((v: unknown) => (typeof v === "string" && v.length <= 200 ? v : "/"))
  .handler(async ({ data }) => {
    const store = await import("./store.server");
    const [seo, brand] = await Promise.all([store.getSeo(), store.getBrand()]);
    return store.computePageMeta(seo, brand, data);
  });
