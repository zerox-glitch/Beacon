/**
 * Built-in center logos for the studio's Logo mode.
 *
 * Two families live here:
 *  - APP_LOGOS — the 81 real transparent PNG logos hosted in /public/logos
 *    (brand logos, flower stickers, letter/sticker marks). Drawn by the studio
 *    exactly like an uploaded logo.
 *  - Legacy inline SVG marks (Payments/Connect/Fun/Cute/Useful) — simplified
 *    single-color-friendly pictograms, kept as data URLs (no hosting needed).
 *
 * The old built-in "Social" recreations were removed in favor of the real logos.
 */


export interface QrLogo {
  id: string;
  name: string;
  category: "Social" | "Payments" | "Connect" | "Fun" | "Cute" | "Useful" | "Marks";
  /** Inline SVG mark (legacy built-ins). */
  svg?: string;
  /** Hosted PNG logo in /public/logos (the real logo set). */
  src?: string;
}

/** Logo entry → drawable URL (data URL for SVG marks, /logos/… for PNGs). */
export function logoDataUrl(logo: QrLogo): string {
  return logo.src ?? `data:image/svg+xml;utf8,${encodeURIComponent(logo.svg ?? "")}`;
}

const bg = (shape: "circle" | "square", color: string, rx = 14) =>
  shape === "circle"
    ? `<circle cx="32" cy="32" r="30" fill="${color}"/>`
    : `<rect x="4" y="4" width="56" height="56" rx="${rx}" fill="${color}"/>`;

const txt = (s: string, x: number, y: number, size: number, fill = "#fff", extra = "") =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" ${extra}>${s}</text>`;

const PAYMENTS: QrLogo[] = [
  {
    id: "visa",
    name: "Visa",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#1A1F71", 10)}${txt("VISA", 32, 33, 16, "#fff", 'font-style="italic" letter-spacing="1"')}</svg>`,
  },
  {
    id: "mastercard",
    name: "Mastercard",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#fff", 10)}<circle cx="26" cy="32" r="13" fill="#EB001B"/><circle cx="38" cy="32" r="13" fill="#F79E1B"/><path d="M32 21.2a13 13 0 0 1 0 21.6a13 13 0 0 1 0-21.6z" fill="#FF5F00"/></svg>`,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#635BFF", 12)}${txt("S", 32, 33, 36)}</svg>`,
  },
  {
    id: "cashapp",
    name: "Cash App",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#00D632", 12)}${txt("$", 32, 33, 34)}</svg>`,
  },
  {
    id: "applepay",
    name: "Apple Pay",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#000000", 12)}<path d="M33.5 24c1-2.6 3.4-4.4 6-4.5c.2 2.9-1.4 5.6-4.3 6.5c-.5.2-1.4.3-1.9.1c.1.1.1.3.1.4c0 3.6-3 7.6-6 8.4c-.3 0-2 .5-3.9-.5c-1.8-.9-3.6-3-3.6-5.8c0-3.5 2.6-6.2 5.3-6.2c1.6 0 3 .8 3.9 1.5c1-.9 2.4-1.6 4.4-1.6z" fill="#fff" transform="translate(-4,-3) scale(.8)"/><path d="M36.5 31.5c1.6-.5 3.5.3 3.5 2.4c0 2.4-2.2 4.6-4.6 5.3c-.5.2-1.1.3-1.6.3c-1.5.1-2.4-.9-2.4-2.3c0-1.5.9-2.5 2.4-3z" fill="#fff" transform="translate(-4,-3) scale(.8)"/><text x="45" y="40" font-family="Arial" font-weight="600" font-size="13" fill="#fff" text-anchor="middle">pay</text></svg>`,
  },
  {
    id: "googlepay",
    name: "Google Pay",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#fff", 10)}<path d="M37 25.5A10 10 0 1 0 36 41" fill="none" stroke="#4285F4" stroke-width="5" stroke-linecap="round"/><path d="M36 41a10 10 0 0 0 9.5-7" fill="none" stroke="#34A853" stroke-width="5" stroke-linecap="round"/><path d="M36 48a10 10 0 0 0 7.5-3.3" fill="none" stroke="#FBBC04" stroke-width="5" stroke-linecap="round"/><path d="M36 54.5A10 10 0 0 0 45 44" fill="none" stroke="#EA4335" stroke-width="5" stroke-linecap="round"/><rect x="36" y="25" width="12" height="5" fill="#4285F4"/></svg>`,
  },
  {
    id: "upi",
    name: "UPI",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="upi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A2488"/><stop offset="1" stop-color="#F15BB5"/></linearGradient></defs>${bg("square", "url(#upi)", 12)}${txt("UPI", 32, 33, 15, "#fff", 'letter-spacing="1.5"')}</svg>`,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#0052FF")}${txt("$", 32, 33, 34)}</svg>`,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#2B84EA", 12)}${txt("R", 32, 33, 32)}</svg>`,
  },
];

const CONNECT: QrLogo[] = [
  {
    id: "wifi",
    name: "Wi-Fi",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#2563EB")}<path d="M10 28a30 30 0 0 1 44 0" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M17.5 36a20 20 0 0 1 29 0" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M25 44a10 10 0 0 1 14 0" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="51" r="3.4" fill="#fff"/></svg>`,
  },
  {
    id: "phone",
    name: "Phone",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#16A34A", 12)}<path transform="translate(8,8) scale(2)" fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
  },
  {
    id: "gmail",
    name: "Email",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#ffffff", 10)}<rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#E5E7EB" stroke-width="2"/><path d="M14 22l18 13 18-13v20a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="#EA4335"/><path d="M14 22l18 13 18-13" fill="none" stroke="#fff" stroke-width="3"/></svg>`,
  },
  {
    id: "sms",
    name: "SMS",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#0D9488", 12)}<path d="M14 20h36a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H26l-10 8v-8h-2a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#fff"/><circle cx="24" cy="32" r="3" fill="#0D9488"/><circle cx="32" cy="32" r="3" fill="#0D9488"/><circle cx="40" cy="32" r="3" fill="#0D9488"/></svg>`,
  },
  {
    id: "maps",
    name: "Location",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#ffffff", 10)}<path d="M32 12c-8.3 0-15 6.7-15 15c0 10.5 15 26 15 26s15-15.5 15-26c0-8.3-6.7-15-15-15z" fill="#EA4335"/><circle cx="32" cy="27" r="6" fill="#fff"/></svg>`,
  },
  {
    id: "calendar",
    name: "Event",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#ffffff", 10)}<rect x="10" y="14" width="44" height="40" rx="6" fill="#fff" stroke="#D1D5DB" stroke-width="2"/><path d="M10 20a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v8H10z" fill="#EF4444"/><rect x="18" y="10" width="4" height="10" rx="2" fill="#374151"/><rect x="42" y="10" width="4" height="10" rx="2" fill="#374151"/>${txt("17", 32, 40, 15, "#111827")}</svg>`,
  },
  {
    id: "contact",
    name: "Contact",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#4F46E5")}<circle cx="32" cy="25" r="8.5" fill="#fff"/><path d="M15 49c2.5-9 9-13 17-13s14.5 4 17 13z" fill="#fff"/></svg>`,
  },
  {
    id: "link",
    name: "Web Link",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#0EA5E9")}<path d="M25 39l-3.5 3.5a8 8 0 0 0 11.3 11.3l3.5-3.5M39 25l3.5-3.5A8 8 0 0 0 31.2 10.2L27.7 13.7M24 40l16-16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#0284C7")}<path d="M20 42a9 9 0 0 1 2.2-17.7A11.5 11.5 0 0 1 44.5 27a8.5 8.5 0 0 1-1.5 15z" fill="#fff"/></svg>`,
  },
  {
    id: "download",
    name: "Download",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#7C3AED", 12)}<path d="M32 16v20M24 29l8 8 8-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 46h28" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  },
  {
    id: "globe",
    name: "Website",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#059669")}<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="3.5"/><ellipse cx="32" cy="32" rx="8" ry="17" fill="none" stroke="#fff" stroke-width="3"/><path d="M15 32h34M17.5 23.5h29M17.5 40.5h29" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: "qr",
    name: "QR Code",
    category: "Connect",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#111827", 12)}<g fill="#fff"><rect x="14" y="14" width="13" height="13" rx="2"/><rect x="37" y="14" width="13" height="13" rx="2"/><rect x="14" y="37" width="13" height="13" rx="2"/><rect x="18" y="18" width="5" height="5" fill="#111827"/><rect x="41" y="18" width="5" height="5" fill="#111827"/><rect x="18" y="41" width="5" height="5" fill="#111827"/><rect x="37" y="37" width="5" height="5"/><rect x="46" y="46" width="5" height="5"/><rect x="37" y="46" width="5" height="5" opacity=".7"/><rect x="46" y="37" width="5" height="5" opacity=".7"/></g></svg>`,
  },
];

const FUN: QrLogo[] = [
  {
    id: "smiley",
    name: "Smiley",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#FACC15")}<circle cx="24" cy="27" r="3.6" fill="#78350F"/><circle cx="40" cy="27" r="3.6" fill="#78350F"/><path d="M20 37a13 13 0 0 0 24 0" fill="none" stroke="#78350F" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "devil",
    name: "Devil",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#F87171")}<path d="M19 26l9 5M45 26l-9 5" stroke="#7F1D1D" stroke-width="4" stroke-linecap="round"/><circle cx="23" cy="33" r="3.4" fill="#7F1D1D"/><circle cx="41" cy="33" r="3.4" fill="#7F1D1D"/><path d="M22 45a12 12 0 0 1 20 0" fill="none" stroke="#7F1D1D" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "heart",
    name: "Heart",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FFF1F2", 12)}<path d="M32 51C19 41 11 33.5 11 24a10.5 10.5 0 0 1 21-3.5A10.5 10.5 0 0 1 53 24c0 9.5-8 17-21 27z" fill="#EC4899"/></svg>`,
  },
  {
    id: "star",
    name: "Star",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FFF7ED", 12)}<path d="M32 13l5.8 12.6 13.7 1.5-10.2 9.4 2.8 13.5L32 43.7l-12.1 6.3 2.8-13.5-10.2-9.4 13.7-1.5z" fill="#F59E0B"/></svg>`,
  },
  {
    id: "bolt",
    name: "Bolt",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#111827", 12)}<path d="M36 10L16 37h11l-4 17 21-27H33z" fill="#FDE047"/></svg>`,
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FFF7ED", 12)}<path d="M32 9c6.5 6 9 14 9 22l-4.5 9h-9L23 31c0-8 2.5-16 9-22z" fill="#F97316"/><circle cx="32" cy="26" r="4" fill="#fff"/><path d="M23 31l-6 6 4 1 2-7zM41 31l6 6-4 1-2-7z" fill="#EA580C"/><path d="M28 43c1 3 2 5 4 8 2-3 3-5 4-8z" fill="#FBBF24"/></svg>`,
  },
  {
    id: "flower",
    name: "Flower",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FDF2F8", 12)}<g fill="#F472B6"><ellipse cx="32" cy="18" rx="7" ry="10"/><ellipse cx="45" cy="28" rx="7" ry="10" transform="rotate(72 45 28)"/><ellipse cx="40" cy="43" rx="7" ry="10" transform="rotate(144 40 43)"/><ellipse cx="24" cy="43" rx="7" ry="10" transform="rotate(216 24 43)"/><ellipse cx="19" cy="28" rx="7" ry="10" transform="rotate(288 19 28)"/></g><circle cx="32" cy="32" r="7.5" fill="#FDE047"/></svg>`,
  },
  {
    id: "cat",
    name: "Cat",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#111827", 12)}<path d="M16 26l4-12 10 6h4l10-6 4 12c2 3 3 6 3 10a19 19 0 0 1-38 0c0-4 1-7 3-10z" fill="#FBBF24"/><circle cx="25" cy="35" r="3" fill="#111827"/><circle cx="39" cy="35" r="3" fill="#111827"/><path d="M30 42h4l-2 3z" fill="#111827"/><path d="M12 40h8M44 40h8M14 45l7-2M50 45l-7-2" stroke="#FBBF24" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    id: "panda",
    name: "Panda",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#86EFAC")}<circle cx="17" cy="17" r="8" fill="#111827"/><circle cx="47" cy="17" r="8" fill="#111827"/><circle cx="32" cy="34" r="20" fill="#fff"/><ellipse cx="23" cy="32" rx="6" ry="7" fill="#111827" transform="rotate(-20 23 32)"/><ellipse cx="41" cy="32" rx="6" ry="7" fill="#111827" transform="rotate(20 41 32)"/><circle cx="24" cy="33" r="2" fill="#fff"/><circle cx="40" cy="33" r="2" fill="#fff"/><ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#111827"/><path d="M29 45a4 4 0 0 0 6 0" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "ghost",
    name: "Ghost",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#334155", 12)}<path d="M32 12c-9 0-15 7-15 16v20l5-4 5 4 5-4 5 4 5-4 5 4V28c0-9-6-16-15-16z" fill="#F8FAFC"/><circle cx="26" cy="28" r="3" fill="#334155"/><circle cx="38" cy="28" r="3" fill="#334155"/><path d="M28 36a5 5 0 0 0 8 0" stroke="#334155" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "pizza",
    name: "Pizza",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FFFBEB", 12)}<path d="M32 50L14 18a26 26 0 0 1 36 0z" fill="#FBBF24"/><path d="M14 18a26 26 0 0 1 36 0l-3.5 5.5A20 20 0 0 0 17.5 23.5z" fill="#F59E0B"/><circle cx="32" cy="24" r="3.4" fill="#EF4444"/><circle cx="24" cy="33" r="3.4" fill="#EF4444"/><circle cx="39" cy="33" r="3.4" fill="#EF4444"/><circle cx="31" cy="42" r="2.8" fill="#EF4444"/></svg>`,
  },
  {
    id: "coffee",
    name: "Coffee",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FEF3C7", 12)}<path d="M14 26h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" fill="#92400E"/><path d="M44 29h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#92400E" stroke-width="4"/><path d="M22 10c-2 3 2 4 0 8M31 10c-2 3 2 4 0 8M40 10c-2 3 2 4 0 8" stroke="#B45309" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "gamepad",
    name: "Game",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#EEF2FF", 12)}<path d="M20 24h24a10 10 0 0 1 10 10l-1.5 7a6.5 6.5 0 0 1-11 3.4L38.5 41h-13l-3 3.4A6.5 6.5 0 0 1 11.5 41L10 34a10 10 0 0 1 10-10z" fill="#4F46E5"/><path d="M19 29v10M14 34h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="31" r="2.6" fill="#F472B6"/><circle cx="48" cy="37" r="2.6" fill="#FDE047"/></svg>`,
  },
  {
    id: "music",
    name: "Music",
    category: "Fun",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#8B5CF6")}<path d="M25 44V20l18-5v22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="20" cy="44" rx="6" ry="5" fill="#fff"/><ellipse cx="38" cy="37" rx="6" ry="5" fill="#fff"/></svg>`,
  },
];

const CUTE: QrLogo[] = [
  {
    id: "bunny",
    name: "Bunny",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#FBCFE8")}<path d="M24 30c-3-8-4-16-1-19 3-2 7 3 9 11M40 30c3-8 4-16 1-19-3-2-7 3-9 11" fill="#fff"/><ellipse cx="32" cy="38" rx="15" ry="13" fill="#fff"/><circle cx="26" cy="36" r="2.4" fill="#334155"/><circle cx="38" cy="36" r="2.4" fill="#334155"/><path d="M30 42h4l-2 3z" fill="#F472B6"/><path d="M25 45c2 2 12 2 14 0" stroke="#F9A8D4" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "frog",
    name: "Frog",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#BBF7D0")}<circle cx="23" cy="22" r="8" fill="#4ADE80"/><circle cx="41" cy="22" r="8" fill="#4ADE80"/><circle cx="23" cy="22" r="3.4" fill="#fff"/><circle cx="41" cy="22" r="3.4" fill="#fff"/><circle cx="23" cy="22" r="1.5" fill="#052e16"/><circle cx="41" cy="22" r="1.5" fill="#052e16"/><ellipse cx="32" cy="40" rx="18" ry="14" fill="#4ADE80"/><path d="M22 40c4 5 16 5 20 0" stroke="#166534" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "fox",
    name: "Fox",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FFF7ED", 12)}<path d="M14 18l8 10h20l8-10-4 22c-2 7-7 10-14 10s-12-3-14-10z" fill="#F97316"/><path d="M22 28c2 8 4 12 10 12s8-4 10-12c-4-3-7-4-10-4s-6 1-10 4z" fill="#fff"/><circle cx="25" cy="34" r="2.4" fill="#111827"/><circle cx="39" cy="34" r="2.4" fill="#111827"/><path d="M30 42h4l-2 3z" fill="#111827"/></svg>`,
  },
  {
    id: "robot",
    name: "Robot",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#E0F2FE", 12)}<path d="M32 14v6" stroke="#64748B" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="12" r="3" fill="#F87171"/><rect x="16" y="20" width="32" height="26" rx="6" fill="#94A3B8"/><rect x="21" y="26" width="22" height="12" rx="4" fill="#0F172A"/><circle cx="27" cy="32" r="2.6" fill="#38BDF8"/><circle cx="37" cy="32" r="2.6" fill="#38BDF8"/><path d="M27 46v6M32 46v7M37 46v6" stroke="#64748B" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: "owl",
    name: "Owl",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FEF3C7", 12)}<ellipse cx="32" cy="36" rx="17" ry="19" fill="#A16207"/><circle cx="24" cy="30" r="8" fill="#FDE68A"/><circle cx="40" cy="30" r="8" fill="#FDE68A"/><circle cx="24" cy="30" r="3.6" fill="#111827"/><circle cx="40" cy="30" r="3.6" fill="#111827"/><path d="M29 38l3 4 3-4z" fill="#F59E0B"/><path d="M22 48h20" stroke="#713F12" stroke-width="2" stroke-dasharray="3 3"/></svg>`,
  },
  {
    id: "butterfly",
    name: "Butterfly",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FDF2F8", 12)}<path d="M30 32c-8-10-18-10-18-2s10 12 18 8M34 32c8-10 18-10 18-2s-10 12-18 8M30 34c-7 2-12 8-8 13 3 3 9-1 10-9M34 34c7 2 12 8 8 13-3 3-9-1-10-9" fill="#F472B6"/><rect x="30" y="22" width="4" height="24" rx="2" fill="#831843"/><path d="M30 22c-2-4-5-6-8-6M34 22c2-4 5-6 8-6" stroke="#831843" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "icecream",
    name: "Ice cream",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#ECFDF5", 12)}<path d="M20 28a12 12 0 0 1 24 0z" fill="#F9A8D4"/><path d="M20 30h24l-12 24z" fill="#D97706"/><path d="M24 36l16 0M27 42l10 0" stroke="#92400E" stroke-width="1.6" opacity=".5"/><circle cx="27" cy="22" r="2" fill="#FDE68A"/><circle cx="35" cy="24" r="2" fill="#FDE68A"/></svg>`,
  },
  {
    id: "cupcake",
    name: "Cupcake",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#EFF6FF", 12)}<path d="M18 34h28l-4 18h-20z" fill="#F59E0B"/><path d="M24 36l-2 14M32 36v14M40 36l2 14" stroke="#B45309" stroke-width="2" opacity=".6"/><path d="M16 34a6 6 0 0 1 4-11 8 8 0 0 1 15-3 7 7 0 0 1 11 5 6 6 0 0 1-1 9z" fill="#F9A8D4"/><circle cx="32" cy="14" r="4" fill="#EF4444"/></svg>`,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    category: "Cute",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#F0F9FF", 12)}<path d="M12 46a20 20 0 0 1 40 0" fill="none" stroke="#EF4444" stroke-width="4.5"/><path d="M17 46a15 15 0 0 1 30 0" fill="none" stroke="#F59E0B" stroke-width="4.5"/><path d="M22 46a10 10 0 0 1 20 0" fill="none" stroke="#22C55E" stroke-width="4.5"/><path d="M27 46a5 5 0 0 1 10 0" fill="none" stroke="#3B82F6" stroke-width="4.5"/><circle cx="14" cy="48" r="5" fill="#fff"/><circle cx="50" cy="48" r="5" fill="#fff"/></svg>`,
  },
];

const USEFUL: QrLogo[] = [
  {
    id: "briefcase",
    name: "Work",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#334155")}<rect x="24" y="16" width="16" height="8" rx="3" fill="#F8FAFC"/><rect x="12" y="24" width="40" height="26" rx="5" fill="#F8FAFC"/><rect x="12" y="34" width="40" height="6" fill="#94A3B8"/><rect x="29" y="33" width="6" height="8" rx="2" fill="#0F172A"/></svg>`,
  },
  {
    id: "store",
    name: "Store",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FEF2F2", 12)}<path d="M14 26l4-12h28l4 12c0 4-3 6-6 6s-6-2-6-6c0 4-3 6-6 6s-6-2-6-6c0 4-3 6-6 6s-6-2-6-6z" fill="#DC2626"/><path d="M18 32v18h28V32" fill="none" stroke="#DC2626" stroke-width="3.5"/><rect x="27" y="38" width="10" height="12" fill="#DC2626"/></svg>`,
  },
  {
    id: "cutlery",
    name: "Restaurant",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#FDE68A")}<path d="M24 14v10a4 4 0 0 1-4 4v4a4 4 0 0 1 4 4v14M24 14v30M20 14v12M28 14v12" stroke="#78350F" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M40 14c-4 0-6 5-6 10s2 8 6 8v18M40 14v18" stroke="#78350F" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: "medical",
    name: "Health",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#DC2626", 12)}<path d="M27 16h10v11h11v10H37v11H27V37H16V27h11z" fill="#fff"/></svg>`,
  },
  {
    id: "gradcap",
    name: "Education",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#1E3A8A")}<path d="M32 18L8 30l24 12 24-12z" fill="#fff"/><path d="M18 36v8c0 4 6 8 14 8s14-4 14-8v-8" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M52 30v12" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="44" r="2.5" fill="#FBBF24"/></svg>`,
  },
  {
    id: "gift",
    name: "Gift",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#FDF2F8", 12)}<rect x="14" y="26" width="36" height="8" rx="2" fill="#DB2777"/><rect x="16" y="34" width="32" height="18" rx="2" fill="#F472B6"/><rect x="29" y="26" width="6" height="26" fill="#FDF2F8"/><path d="M32 26c-6-8-14-6-12 0M32 26c6-8 14-6 12 0" fill="none" stroke="#DB2777" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: "bell",
    name: "Alerts",
    category: "Useful",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#F59E0B")}<path d="M32 14c-9 0-14 7-14 15v8l-5 8h38l-5-8v-8c0-8-5-15-14-15z" fill="#fff"/><path d="M27 47a5 5 0 0 0 10 0" fill="#fff"/><circle cx="32" cy="11" r="3" fill="#fff"/></svg>`,
  },
];

/** The 81 real transparent PNG logos from /public/logos. */
const APP_LOGOS: QrLogo[] = [
  { id: "linkedin", name: "LinkedIn", category: "Social", src: "/logos/linkedin.png" },
  { id: "facebook", name: "Facebook", category: "Social", src: "/logos/facebook.png" },
  { id: "instagram", name: "Instagram", category: "Social", src: "/logos/instagram.png" },
  { id: "tiktok", name: "TikTok", category: "Social", src: "/logos/tiktok.png" },
  { id: "twitter", name: "Twitter (bird)", category: "Social", src: "/logos/twitter.png" },
  { id: "x", name: "X (Twitter)", category: "Social", src: "/logos/x.png" },
  { id: "telegram", name: "Telegram", category: "Social", src: "/logos/telegram.png" },
  { id: "whatsapp", name: "WhatsApp", category: "Social", src: "/logos/whatsapp.png" },
  { id: "snapchat", name: "Snapchat", category: "Social", src: "/logos/snapchat.png" },
  { id: "discord", name: "Discord", category: "Social", src: "/logos/discord.png" },
  { id: "vk", name: "VK", category: "Social", src: "/logos/vk.png" },
  { id: "tumblr", name: "Tumblr", category: "Social", src: "/logos/tumblr.png" },
  { id: "reddit", name: "Reddit", category: "Social", src: "/logos/reddit.png" },
  { id: "quora", name: "Quora", category: "Social", src: "/logos/quora.png" },
  { id: "pinterest", name: "Pinterest", category: "Social", src: "/logos/pinterest.png" },
  { id: "messenger", name: "Messenger", category: "Social", src: "/logos/messenger.png" },
  { id: "line", name: "LINE", category: "Social", src: "/logos/line.png" },
  { id: "wechat", name: "WeChat", category: "Social", src: "/logos/wechat.png" },
  { id: "viber", name: "Viber", category: "Social", src: "/logos/viber.png" },
  { id: "skype-classic", name: "Skype (classic)", category: "Social", src: "/logos/skype-classic.png" },
  { id: "skype-modern", name: "Skype (modern)", category: "Social", src: "/logos/skype-modern.png" },
  { id: "paypal", name: "PayPal", category: "Payments", src: "/logos/paypal.png" },
  { id: "binance", name: "Binance", category: "Payments", src: "/logos/binance.png" },
  { id: "zoom", name: "Zoom", category: "Connect", src: "/logos/zoom.png" },
  { id: "google-meet", name: "Google Meet", category: "Connect", src: "/logos/google-meet.png" },
  { id: "teams", name: "Microsoft Teams", category: "Connect", src: "/logos/teams.png" },
  { id: "facetime", name: "FaceTime", category: "Connect", src: "/logos/facetime.png" },
  { id: "google", name: "Google", category: "Connect", src: "/logos/google.png" },
  { id: "chrome", name: "Chrome", category: "Connect", src: "/logos/chrome.png" },
  { id: "android", name: "Android", category: "Connect", src: "/logos/android.png" },
  { id: "apple", name: "Apple", category: "Connect", src: "/logos/apple.png" },
  { id: "openai", name: "OpenAI", category: "Connect", src: "/logos/openai.png" },
  { id: "google-play", name: "Google Play", category: "Connect", src: "/logos/google-play.png" },
  { id: "app-store", name: "App Store", category: "Connect", src: "/logos/app-store.png" },
  { id: "steam", name: "Steam", category: "Fun", src: "/logos/steam.png" },
  { id: "xbox", name: "Xbox", category: "Fun", src: "/logos/xbox.png" },
  { id: "playstation", name: "PlayStation", category: "Fun", src: "/logos/playstation.png" },
  { id: "twitch", name: "Twitch", category: "Fun", src: "/logos/twitch.png" },
  { id: "epic-games", name: "Epic Games", category: "Fun", src: "/logos/epic-games.png" },
  { id: "duolingo", name: "Duolingo", category: "Fun", src: "/logos/duolingo.png" },
  { id: "flower-calla-lily", name: "Calla lilies", category: "Cute", src: "/logos/flower-calla-lily.png" },
  { id: "flower-cherry-blossom", name: "Cherry blossom", category: "Cute", src: "/logos/flower-cherry-blossom.png" },
  { id: "flower-crocus", name: "Crocus", category: "Cute", src: "/logos/flower-crocus.png" },
  { id: "flower-dahlia", name: "Dahlia", category: "Cute", src: "/logos/flower-dahlia.png" },
  { id: "flower-dandelion", name: "Dandelion", category: "Cute", src: "/logos/flower-dandelion.png" },
  { id: "flower-echinacea", name: "Echinacea", category: "Cute", src: "/logos/flower-echinacea.png" },
  { id: "flower-gerbera", name: "Gerbera daisies", category: "Cute", src: "/logos/flower-gerbera.png" },
  { id: "flower-lavender", name: "Lavender", category: "Cute", src: "/logos/flower-lavender.png" },
  { id: "flower-lotus", name: "Lotus", category: "Cute", src: "/logos/flower-lotus.png" },
  { id: "flower-orchid", name: "Orchid", category: "Cute", src: "/logos/flower-orchid.png" },
  { id: "flower-petunia", name: "Petunia", category: "Cute", src: "/logos/flower-petunia.png" },
  { id: "flower-periwinkle", name: "Periwinkle", category: "Cute", src: "/logos/flower-periwinkle.png" },
  { id: "flower-pink-blossom", name: "Pink blossoms", category: "Cute", src: "/logos/flower-pink-blossom.png" },
  { id: "flower-plumeria", name: "Plumeria", category: "Cute", src: "/logos/flower-plumeria.png" },
  { id: "flower-red-ginger", name: "Red ginger", category: "Cute", src: "/logos/flower-red-ginger.png" },
  { id: "flower-sunflowers-1", name: "Sunflowers", category: "Cute", src: "/logos/flower-sunflowers-1.png" },
  { id: "flower-sunflowers-2", name: "Sunflowers 2", category: "Cute", src: "/logos/flower-sunflowers-2.png" },
  { id: "flower-tulips", name: "Tulips", category: "Cute", src: "/logos/flower-tulips.png" },
  { id: "airbnb", name: "Airbnb", category: "Useful", src: "/logos/airbnb.png" },
  { id: "amazon", name: "Amazon", category: "Useful", src: "/logos/amazon.png" },
  { id: "shopify", name: "Shopify", category: "Useful", src: "/logos/shopify.png" },
  { id: "etsy", name: "Etsy", category: "Useful", src: "/logos/etsy.png" },
  { id: "microsoft-store", name: "Microsoft Store", category: "Useful", src: "/logos/microsoft-store.png" },
  { id: "tripadvisor", name: "Tripadvisor", category: "Useful", src: "/logos/tripadvisor.png" },
  { id: "icon-black-at", name: "@ mark", category: "Marks", src: "/logos/icon-black-at.png" },
  { id: "icon-black-w", name: "W letter", category: "Marks", src: "/logos/icon-black-w.png" },
  { id: "icon-blue-dashed-bubble", name: "Chat bubble", category: "Marks", src: "/logos/icon-blue-dashed-bubble.png" },
  { id: "icon-blue-m-circle", name: "M circle", category: "Marks", src: "/logos/icon-blue-m-circle.png" },
  { id: "icon-blue-ring", name: "Blue ring", category: "Marks", src: "/logos/icon-blue-ring.png" },
  { id: "icon-color-blobs", name: "Color pinwheel", category: "Marks", src: "/logos/icon-color-blobs.png" },
  { id: "icon-green-up", name: "Up mark", category: "Marks", src: "/logos/icon-green-up.png" },
  { id: "icon-key-mark-dark", name: "Key mark", category: "Marks", src: "/logos/icon-key-mark-dark.png" },
  { id: "icon-navy-b-dot", name: "B letter", category: "Marks", src: "/logos/icon-navy-b-dot.png" },
  { id: "icon-orange-swoosh", name: "Swoosh", category: "Marks", src: "/logos/icon-orange-swoosh.png" },
  { id: "icon-pink-f", name: "F letter", category: "Marks", src: "/logos/icon-pink-f.png" },
  { id: "icon-pink-g", name: "G letter", category: "Marks", src: "/logos/icon-pink-g.png" },
  { id: "icon-purple-m", name: "M letter", category: "Marks", src: "/logos/icon-purple-m.png" },
  { id: "icon-red-bag", name: "Shopping bag", category: "Marks", src: "/logos/icon-red-bag.png" },
  { id: "icon-red-burst", name: "Burst", category: "Marks", src: "/logos/icon-red-burst.png" },
  { id: "icon-teal-k", name: "K letter", category: "Marks", src: "/logos/icon-teal-k.png" },
  { id: "icon-teal-tag", name: "Price tag", category: "Marks", src: "/logos/icon-teal-tag.png" },
];

export const LOGOS: QrLogo[] = [...APP_LOGOS, ...PAYMENTS, ...CONNECT, ...FUN, ...CUTE, ...USEFUL];

export const LOGO_CATEGORIES: QrLogo["category"][] = ["Social", "Payments", "Connect", "Fun", "Cute", "Useful", "Marks"];
