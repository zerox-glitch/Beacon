import type { BrandDoc, CategoryDoc, ContentDoc, SamplesDoc, SeoDoc } from "@/lib/cms/schemas";
import type { MediaRow } from "@/lib/cms/store-contract";
import type { TemplateRow } from "@/lib/cms/catalog-merge";

/** Shape of `getAdminSettings()` — every panel reads/writes a slice of it. */
export type AdminSettings = {
  brand: BrandDoc;
  content: ContentDoc;
  seo: SeoDoc;
  templates: Array<TemplateRow & { updatedAt: string }>;
  categories: CategoryDoc;
  samples: SamplesDoc;
  admin: { userId: string; name: string; email: string; createdAt: string } | null;
  media: MediaRow[];
  meta?: { dbSource: "neon" | "pglite" };
};
