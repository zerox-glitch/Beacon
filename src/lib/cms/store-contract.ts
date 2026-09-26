/**
 * Client-safe contracts that mirror the shapes `store.server.ts` returns.
 * UI imports types from here; the server store imports nothing from the UI.
 */
import type { MediaKind } from "./media-format.ts";

export interface MediaRow {
  id: string;
  kind: MediaKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  alt: string | null;
  url: string;
  createdAt: string;
}
