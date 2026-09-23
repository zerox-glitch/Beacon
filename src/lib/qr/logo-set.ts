/**
 * 50 built-in center logos for the studio's Logo mode — social apps, payment
 * apps, Wi-Fi / web / utility marks, and a few cartoons & memes.
 *
 * Every logo is an inline SVG (64×64) converted to a data URL at call time,
 * so nothing needs to be hosted: the studio's `loadImage` draws them exactly
 * like any uploaded logo, and they work in PNG export (rasterized on the
 * same canvas) and in the 2048px print path.
 *
 * The marks are simplified, single-color-friendly recreations meant to be
 * instantly recognizable at QR center size — not pixel-perfect brand art.
 */

export interface QrLogo {
  id: string;
  name: string;
  category: "Social" | "Payments" | "Connect" | "Fun";
  svg: string;
}

/** SVG string → data URL (safe for <img>, canvas drawImage, and exports). */
export function logoDataUrl(logo: QrLogo): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(logo.svg)}`;
}

const bg = (shape: "circle" | "square", color: string, rx = 14) =>
  shape === "circle"
    ? `<circle cx="32" cy="32" r="30" fill="${color}"/>`
    : `<rect x="4" y="4" width="56" height="56" rx="${rx}" fill="${color}"/>`;

const txt = (s: string, x: number, y: number, size: number, fill = "#fff", extra = "") =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" ${extra}>${s}</text>`;

const SOCIAL: QrLogo[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#25D366")}<path d="M32 15c-9.4 0-17 7.4-17 16.5 0 3 .9 5.8 2.4 8.3L15 50l10.6-2.7c2.6 1.4 5.6 2.2 8.9 2.2 9.4 0 17-7.4 17-16.6S41.4 15 32 15z" fill="#fff"/><path d="M27.5 25.5c-.5-1-1-1-1.5-1h-1.3c-.5 0-1.2.2-1.8.9-.6.7-2.4 2.3-2.4 5.7s2.5 6.6 2.8 7c.3.4 3.8 6 9.3 8.3 4.6 2 5.5 1.6 6.5 1.5 1-.1 3.2-1.3 3.6-2.6.4-1.3.4-2.4.3-2.6-.1-.2-.5-.4-1-.6l-3.6-1.7c-.5-.2-.9-.3-1.2.3l-1.2 1.8c-.2.3-.5.4-.9.1-1.3-.6-3.2-1.7-5-3.4-1.4-1.3-2.3-2.9-2.6-3.4-.3-.5 0-.8.2-1l.8-.9c.2-.3.3-.5.5-.8.1-.3.1-.5 0-.8l-1.7-3.8z" fill="#25D366"/></svg>`,
  },
  {
    id: "instagram",
    name: "Instagram",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".35" stop-color="#FA7E1E"/><stop offset=".6" stop-color="#D62976"/><stop offset=".8" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs>${bg("square", "url(#ig)", 14)}<rect x="14" y="14" width="36" height="36" rx="10" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="32" cy="32" r="8.5" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="42.5" cy="21.5" r="2.8" fill="#fff"/></svg>`,
  },
  {
    id: "facebook",
    name: "Facebook",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#1877F2")}<path d="M35.5 50v-15h5l1-6h-6V26c0-1.8.7-3 3-3h3.2v-5.3s-2.4-.4-4.7-.4c-4.8 0-7.9 2.9-7.9 8.1V29h-5v6h5v15z" fill="#fff"/></svg>`,
  },
  {
    id: "x",
    name: "X (Twitter)",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#0F1419", 12)}<path d="M21 20l22 24M43 20L21 44" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#010101", 12)}<g transform="translate(1.6,-1.4)"><path d="M39.5 19v15.5a8 8 0 1 1-7-8" fill="none" stroke="#25F4EE" stroke-width="5" stroke-linecap="round"/></g><g transform="translate(-1.6,1.4)"><path d="M39.5 19v15.5a8 8 0 1 1-7-8" fill="none" stroke="#FE2C55" stroke-width="5" stroke-linecap="round"/></g><path d="M39.5 19v15.5a8 8 0 1 1-7-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M39.5 19c.8 3.4 3.4 5.8 7.5 6.2" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="16" width="52" height="32" rx="9" fill="#FF0000"/><path d="M27 24l14 8-14 8z" fill="#fff"/></svg>`,
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#229ED9")}<path d="M48 18L14 31.5c-1.8.7-1.7 2.7 0 3.4l8.4 3.1 3.2 9.6c.5 1.5 2 1.8 3.1.6l4.6-4.8 7.6 5.6c1.3 1 3 .4 3.4-1.2l5-23.5c.4-2-1.5-3.3-3.3-2.3zM25.6 37.9l12.3-9.6-9.6 11.5-.6 4.7z" fill="#fff"/></svg>`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#0A66C2", 12)}<circle cx="21.5" cy="21.5" r="3.6" fill="#fff"/><rect x="18" y="28" width="7" height="18" fill="#fff"/><path d="M31 28h6.5v3c2-2.2 5-3.4 8-2.6 3.8 1 5.5 3.8 5.5 8v9.6h-7v-8.2c0-2.4-1-3.8-3-3.8-2.2 0-3.5 1.5-3.5 4v8h-6.5z" fill="#fff"/></svg>`,
  },
  {
    id: "snapchat",
    name: "Snapchat",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#FFFC00")}<path d="M32 15c6.8 0 10.8 4.8 10.8 11.4v5.6c0 1.9 1.4 3 3 3.4-1 1.4-2.4 1.9-3.9 1.9-1.4 0-2.4.5-2.9 1.5-1 1.5-2.6 2-5 1.5-.9-.2-2.1-.2-3 0-2.4.5-4 0-5-1.5-.5-1-1.5-1.5-2.9-1.5-1.5 0-2.9-.5-3.9-1.9 1.6-.4 3-1.5 3-3.4v-5.6C21.2 19.8 25.2 15 32 15z" fill="#fff"/></svg>`,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#E60023")}${txt("P", 32, 33, 34)}</svg>`,
  },
  {
    id: "discord",
    name: "Discord",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#5865F2", 14)}<path d="M20 25c4.5-2.8 19.5-2.8 24 0l3.2 12.4c-2.2 2.8-5.4 4.8-8.6 5.8l-1-2c-3.6 1-7.4 1-11 0l-1 2c-3.2-1-6.4-3-8.6-5.8z" fill="#fff"/><circle cx="26.5" cy="32.5" r="3.2" fill="#5865F2"/><circle cx="37.5" cy="32.5" r="3.2" fill="#5865F2"/></svg>`,
  },
  {
    id: "reddit",
    name: "Reddit",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#FF4500")}<path d="M32 29.5L41 19.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="42" cy="18.5" r="2.5" fill="#fff"/><ellipse cx="32" cy="36" rx="11.5" ry="8" fill="#fff"/><circle cx="26.5" cy="35" r="2.6" fill="#FF4500"/><circle cx="37.5" cy="35" r="2.6" fill="#FF4500"/><path d="M26 40.5c3.6 2 8.4 2 12 0" stroke="#FF4500" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "threads",
    name: "Threads",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#111111", 12)}<path d="M39.5 25.5c-2.5-3.4-7-4.4-11-3c-5.5 1.8-7.8 7-6.5 12.5c1.3 5.5 5.8 8.8 11.3 7.8c3.3-.6 5.5-2.8 5.5-5.8c0-3.2-2.4-5-5.6-5c-4.3 0-7.4 3.3-7.4 8.3c0 6.5 4.3 10.7 10.7 10.7c5 0 8.8-2.5 9.8-6.8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "tumblr",
    name: "Tumblr",
    category: "Social",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#36465D", 12)}<path d="M31 16v10.5c-3 2-6.8 2.2-9.5 1.2v6.6c3.4 1.1 6.4 1 9.5.3v11.6c0 4.6 2.2 7 5.6 7.9v5.9c-8.4-1-12.6-5.4-12.6-12.6V36.6h-6.6v-7h6.6V16z" fill="#fff"/></svg>`,
  },
];

const PAYMENTS: QrLogo[] = [
  {
    id: "paypal",
    name: "PayPal",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("circle", "#003087")}<path d="M38 18h-8c-5 0-8 3-8 8s3 8 8 8h4l2-16z" fill="#009CDE"/><path d="M34.5 22h-6c-4 0-6.5 2.5-6.5 6.5S24.5 35 28.5 35h5l1.5-9.5-1 9.5h-4l-2 8H18z" fill="#fff" opacity=".9"/><path d="M30 18v18h-5V18z" fill="#fff"/><path d="M30 18h7c4.5 0 7 2.6 7 6.5S41.5 31 37 31h-5l1.5-10.5" fill="none" stroke="#fff" stroke-width="0"/></svg>`,
  },
  {
    id: "visa",
    name: "Visa",
    category: "Payments",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg("square", "#1A1F71", 10)}${txt("VISA", 32, 33, 16, "#fff", 'font-style="italic" letter-spacing="1')}</svg>`,
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

export const LOGOS: QrLogo[] = [...SOCIAL, ...PAYMENTS, ...CONNECT, ...FUN];

export const LOGO_CATEGORIES: QrLogo["category"][] = ["Social", "Payments", "Connect", "Fun"];
