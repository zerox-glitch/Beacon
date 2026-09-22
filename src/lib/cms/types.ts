/**
 * Shared CMS type contracts — safe to import from BOTH the client bundle and
 * server modules (no runtime deps). The server store implements these; the
 * public API returns them; UI consumes them.
 */
import type { BrandDoc, CategoryDoc, ContentDoc, SeoDoc } from "./schemas";
import type { TemplateRow } from "./catalog-merge";

/** Per-page SEO head payload (server-computed, SSR-safe). */
export interface PageMeta {
  title: string;
  description: string;
  keywords: string;
  /** robots directive — includes `noindex` when the admin disables indexing. */
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  themeColor: string;
  icon: string;
  siteName: string;
}

/** What the public site receives. Hidden templates are NEVER included. */
export interface PublicBundle {
  brand: BrandDoc;
  content: ContentDoc;
  seo: SeoDoc;
  templates: TemplateRow[];
  /** Gallery category rename/order layer (see catalog-merge). */
  categories: CategoryDoc;
  /** Template the admin pinned to open the studio with; null = stock style. */
  defaultTemplate: string | null;
}
