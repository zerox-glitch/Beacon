import type { QrStyle } from "./types";

export type UseCaseId =
  | "phone"
  | "card"
  | "menu"
  | "poster"
  | "packaging"
  | "storefront"
  | "event"
  | "social";

export interface UseCaseRec {
  id: UseCaseId;
  label: string;
  hint: string;
  caption: string;
  exportPx: number;
  printNote: string;
  patch: Partial<QrStyle>;
}

/** Print size at 300 DPI from a square PNG. */
export function printInches(px: number, dpi = 300): string {
  const inches = px / dpi;
  return `${inches.toFixed(1)}″ at ${dpi} dpi`;
}

export const USE_CASES: UseCaseRec[] = [
  {
    id: "phone",
    label: "Phone screen",
    hint: "Stories, chats, lock-screen",
    caption: "",
    exportPx: 1080,
    printNote: "1080px · on-screen only",
    patch: { quietZone: 2, ecc: "M", contrast: 0.68, minVersion: 5, transparentBg: false },
  },
  {
    id: "card",
    label: "Business card",
    hint: "Keep it tiny and high-contrast",
    caption: "",
    exportPx: 1200,
    printNote: printInches(1200),
    patch: { quietZone: 3, ecc: "H", contrast: 0.86, dotScale: 0.82, minVersion: 5, transparentBg: false },
  },
  {
    id: "menu",
    label: "Restaurant menu",
    hint: "Table tents and paper menus",
    caption: "SCAN FOR MENU",
    exportPx: 2048,
    printNote: printInches(2048),
    patch: { quietZone: 3, ecc: "H", contrast: 0.8, minVersion: 6, transparentBg: false },
  },
  {
    id: "poster",
    label: "Poster / flyer",
    hint: "Walls, A3, event boards",
    caption: "SCAN ME",
    exportPx: 4096,
    printNote: printInches(4096),
    patch: { quietZone: 4, ecc: "H", contrast: 0.84, minVersion: 6, transparentBg: false },
  },
  {
    id: "packaging",
    label: "Packaging",
    hint: "Boxes, bottles, hangtags",
    caption: "",
    exportPx: 2048,
    printNote: printInches(2048),
    patch: { quietZone: 4, ecc: "H", contrast: 0.9, dotScale: 0.86, minVersion: 7, transparentBg: false },
  },
  {
    id: "storefront",
    label: "Storefront",
    hint: "Window vinyl, larger throw",
    caption: "SCAN ME",
    exportPx: 4096,
    printNote: printInches(4096),
    patch: { quietZone: 4, ecc: "H", contrast: 0.88, minVersion: 6, transparentBg: false },
  },
  {
    id: "event",
    label: "Event",
    hint: "Tickets, badges, invites",
    caption: "SCAN TO JOIN",
    exportPx: 2048,
    printNote: printInches(2048),
    patch: { quietZone: 3, ecc: "H", contrast: 0.8, minVersion: 6, transparentBg: false },
  },
  {
    id: "social",
    label: "Social post",
    hint: "Square 1080 for feeds",
    caption: "",
    exportPx: 1080,
    printNote: "1080×1080 · Instagram / TikTok",
    patch: { quietZone: 2, ecc: "Q", contrast: 0.72, minVersion: 5, transparentBg: false },
  },
];

export function useCaseById(id: UseCaseId): UseCaseRec {
  return USE_CASES.find((u) => u.id === id) ?? USE_CASES[0]!;
}
