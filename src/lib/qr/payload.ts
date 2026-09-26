import type { Payload } from "./types";

/**
 * QR payload builders.
 *
 * Compatibility rules the phone scanners actually enforce (learned the hard
 * way — a payload that is *almost* right renders as a wall of raw text in the
 * camera sheet instead of an action card):
 *  - vCard / iCalendar: lines MUST be CRLF-terminated (RFC 6350 §3.1,
 *    RFC 5545 §3.1); iOS's Contact/Calendar importers reject LF-only bodies.
 *    VEVENT additionally requires UID + DTSTAMP + PRODID for the "Add to
 *    calendar" button to appear at all.
 *  - Wi-Fi (ZXing/Measr de-facto spec): optional fields are OMITTED, not set
 *    to `false` — `H:false` trips some Samsung readers; open networks carry
 *    no `P:`; the payload ends with the empty E:/I: fields `;;`.
 *  - geo: RFC 5870 with a percent-encoded `q=` label; non-numeric input
 *    degrades to a Google Maps *search* link (still one scan → maps).
 *  - email: the QR opens the composer for that address and nothing else.
 *    Subject/body were removed on purpose — embedding a body blows the QR
 *    density up (weak, unscannable art codes) for marginal gain.
 */

function digits(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function wifiEscape(value: string): string {
  return value.replace(/([\\;,:")])/g, "\\$1");
}

/** RFC 6350 §3.3 / RFC 5545 TEXT escaping. */
function vtext(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

/** Stable id for VEVENT.UID: same content → same UID (so re-scanning an
 *  already-imported event updates it instead of creating a duplicate). */
function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** CRLF — non-negotiable for vCard/iCalendar parsers. */
function crlf(lines: string[]): string {
  return lines.join("\r\n");
}

export function buildPayload(p: Payload): string {
  switch (p.kind) {
    case "url":
    case "pdf":
    case "menu":
    case "review":
    case "payment":
    case "app":
    case "social": {
      const url = p.url.trim();
      if (!url) return "";
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
      return `https://${url}`;
    }
    case "text":
      return p.text;
    case "phone": {
      const n = digits(p.phone);
      return n ? `tel:${n}` : "";
    }
    case "sms": {
      const n = digits(p.phone);
      if (!n) return "";
      const body = p.smsBody.trim();
      return body ? `sms:${n}?body=${encodeURIComponent(body)}` : `sms:${n}`;
    }
    case "email": {
      // Single address → the scan opens the mail composer. Legacy
      // emailSubject/emailBody values are intentionally ignored (kept in the
      // store only so older saved items still load).
      const to = p.email.trim();
      return to ? `mailto:${to}` : "";
    }
    case "whatsapp": {
      const n = digits(p.whatsapp).replace(/^\+/, "");
      if (!n) return "";
      const t = p.whatsappText.trim();
      return t
        ? `https://wa.me/${n}?text=${encodeURIComponent(t)}`
        : `https://wa.me/${n}`;
    }
    case "wifi": {
      const ssid = p.wifiSsid.trim();
      if (!ssid) return "";
      const type = p.wifiType;
      const pass = type === "nopass" ? "" : p.wifiPassword;
      let out = `WIFI:T:${type};S:${wifiEscape(ssid)};`;
      if (pass) out += `P:${wifiEscape(pass)};`;
      if (p.wifiHidden) out += "H:true;";
      // ZXing's convention: every field self-terminates, then one final ';'
      // closes the empty optional E:/I: tail.
      return `${out};`;
    }
    case "geo": {
      const lat = Number(p.lat.trim());
      const lng = Number(p.lng.trim());
      const label = p.geoLabel.trim();
      const coordsOk =
        Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      if (coordsOk && label) return `geo:${lat},${lng}?q=${encodeURIComponent(label)}`;
      if (coordsOk) return `geo:${lat},${lng}`;
      // Garbage coordinates: a maps search still gives the scanner a button.
      if (label) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
      return "";
    }
    case "vcard": {
      const first = p.firstName.trim();
      const last = p.lastName.trim();
      const fn = [first, last].filter(Boolean).join(" ");
      if (!fn && !p.vphone && !p.vemail) return "";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${vtext(p.lastName)};${vtext(p.firstName)};;;`,
        `FN:${vtext(fn) || "Contact"}`,
      ];
      if (p.org.trim()) lines.push(`ORG:${vtext(p.org)}`);
      if (p.vphone.trim()) lines.push(`TEL;TYPE=CELL:${digits(p.vphone)}`);
      if (p.vemail.trim()) lines.push(`EMAIL;TYPE=INTERNET:${p.vemail.trim()}`);
      if (p.vurl.trim()) {
        const u = p.vurl.trim();
        lines.push(`URL:${/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`}`);
      }
      lines.push("END:VCARD");
      return crlf(lines);
    }
    case "event": {
      const title = p.eventTitle.trim();
      if (!title) return "";
      const start = icsDate(p.eventStart);
      const end = icsDate(p.eventEnd);
      const loc = vtext(p.eventLocation);
      const uidSeed = `${title}|${start}|${end}|${loc}`;
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//QRWho//QR Studio//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:qrwho-${contentHash(uidSeed)}@qrwho.studio`,
        // Deterministic DTSTAMP: fixed anchor (importers only need it present).
        "DTSTAMP:20000101T000000Z",
        `SUMMARY:${vtext(title)}`,
      ];
      if (start) lines.push(`DTSTART:${start}`);
      if (end) lines.push(`DTEND:${end}`);
      if (loc) lines.push(`LOCATION:${loc}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      return crlf(lines);
    }
    default:
      return "";
  }
}

export function payloadLabel(p: Payload): string {
  const text = buildPayload(p);
  if (!text) return "Empty";
  if (text.length <= 42) return text;
  return `${text.slice(0, 40)}…`;
}
