import { QrCodeDataType } from "uqr";
import type { EncodedQr } from "./encode";

/** Functional anatomy of one module. Decorative drawing must honor this. */
export type CellRole =
  | "finder"
  | "separator"
  | "timing"
  | "alignment"
  | "format"
  | "version"
  | "data";

export function isFinderIsland(x: number, y: number, size: number): boolean {
  return (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
}

export function cellRole(qr: EncodedQr, x: number, y: number): CellRole {
  const size = qr.size;
  if (isFinderIsland(x, y, size)) {
    const inFinder =
      (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    return inFinder ? "finder" : "separator";
  }
  const t = qr.types[y]![x]!;
  if (t === QrCodeDataType.Timing) return "timing";
  if (t === QrCodeDataType.Alignment) return "alignment";
  if (t === QrCodeDataType.Position) return "finder";
  if (t === QrCodeDataType.Function) {
    const nearTl = x < 9 && y < 9;
    const nearTr = x >= size - 8 && y < 9;
    const nearBl = x < 9 && y >= size - 8;
    if (nearTl || nearTr || nearBl) return "format";
    if (size >= 45 && ((x < 6 && y >= size - 11) || (y < 6 && x >= size - 11))) return "version";
    return "format";
  }
  return "data";
}

export function isProtectedRole(role: CellRole): boolean {
  return role !== "data";
}

export function isDark(qr: EncodedQr, x: number, y: number): boolean {
  return Boolean(qr.data[y]?.[x]);
}
