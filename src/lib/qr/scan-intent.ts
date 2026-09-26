/**
 * Scan → studio payload. The inverse of `buildPayload`: takes the raw text a
 * QR decoder produced and maps it onto the studio's typed payload fields, so a
 * scanned old code lands as an EDITABLE one (fields filled, not just a blob
 * of text). Everything here is pure + unit-tested; the UI in
 * `components/qr/scan-decode` just wires it up.
 */
import type { Payload, PayloadKind } from "./types";

export type ScanIntent = Partial<Payload> & { kind: PayloadKind };

/* ------------------------------- unescaping ------------------------------- */

/** ZXing-style backslash escapes used inside WIFI: fields (`\;` `\:` `\"` `\\`). */
function wifiUnescape(v: string): string {
  return v.replace(/\\([\\;:,"])/g, "$1");
}

/** vCard/iCal TEXT escaping (`\\n` newline, `\\,` `\\;` `\\\\`). */
function textUnescape(v: string): string {
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === "\\" && i + 1 < v.length) {
      const n = v[i + 1];
      if (n === "n" || n === "N") {
        out += "\n";
        i++;
        continue;
      }
      if (n === "\\" || n === "," || n === ";") {
        out += n;
        i++;
        continue;
      }
    }
    out += c;
  }
  return out;
}

/** Strip `;TYPE=CELL`-style parameter lists from a vCard line's name segment. */
function vValue(line: string): string {
  const idx = line.indexOf(":");
  return idx < 0 ? "" : textUnescape(line.slice(idx + 1)).trim();
}

function digits(v: string): string {
  return v.replace(/[^\d+]/g, "");
}

/** `20260131T100000Z` / `20260131T100000` → the studio's datetime-local value. */
function icsToInput(v: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})[T ](\d{2})(\d{2})/.exec(v.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

/* -------------------------------- parsers -------------------------------- */

function parseWifi(raw: string): ScanIntent | null {
  const body = raw.slice(5).replace(/;+$/, ";");
  // Field = LETTER:value up to the next UNESCAPED semicolon.
  const out: ScanIntent = { kind: "wifi", wifiSsid: "", wifiPassword: "", wifiType: "WPA", wifiHidden: false };
  let sawS = false;
  const re = /([A-Z]):((?:[^;\\]|\\.)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const val = wifiUnescape(m[2] ?? "");
    switch (m[1]) {
      case "S":
        out.wifiSsid = val;
        sawS = true;
        break;
      case "P":
        out.wifiPassword = val;
        break;
      case "T":
        if (val === "WEP" || val === "nopass" || val === "WPA") out.wifiType = val;
        break;
      case "H":
        out.wifiHidden = val === "true";
        break;
      default:
        break;
    }
  }
  if (!sawS && !out.wifiPassword) return null;
  if (!out.wifiType || out.wifiType === "nopass") out.wifiPassword = out.wifiPassword || "";
  return out;
}

function parseVcard(text: string): ScanIntent {
  const lines = text.split(/\r\n|\n|\r/);
  const get = (name: RegExp) => lines.find((l) => name.test(l));
  const n = vValue(get(/^N[:;]/) ?? "");
  let firstName = "";
  let lastName = "";
  if (n) {
    const parts = n.split(";");
    lastName = parts[0] ?? "";
    firstName = parts[1] ?? "";
  }
  if (!lastName && !firstName) {
    const fn = vValue(get(/^FN[:;]/) ?? "");
    const sp = fn.lastIndexOf(" ");
    if (fn) {
      firstName = sp > 0 ? fn.slice(0, sp) : fn;
      lastName = sp > 0 ? fn.slice(sp + 1) : "";
    }
  }
  const out: ScanIntent = {
    kind: "vcard",
    firstName,
    lastName,
    org: vValue(get(/^ORG[:;]/) ?? "").split(";")[0] ?? "",
    vphone: digits(vValue(get(/^TEL/) ?? "")),
    vemail: vValue(get(/^EMAIL/) ?? "").split("?")[0] ?? "",
    vurl: vValue(get(/^URL[:;]/) ?? ""),
  };
  return out;
}

function parseVevent(text: string): ScanIntent {
  const lines = text.split(/\r\n|\n|\r/);
  const get = (name: RegExp) => lines.find((l) => name.test(l));
  return {
    kind: "event",
    eventTitle: vValue(get(/^SUMMARY/) ?? ""),
    eventLocation: vValue(get(/^LOCATION/) ?? ""),
    eventStart: icsToInput(vValue(get(/^DTSTART/) ?? "")),
    eventEnd: icsToInput(vValue(get(/^DTEND/) ?? "")),
  };
}

function parseGeo(raw: string): ScanIntent | null {
  const m = /^geo:([-\d.]+),([-\d.]+)(?:\?(?:.*?q=([^&]*))?)?/i.exec(raw);
  if (!m) return null;
  return {
    kind: "geo",
    lat: m[1] ?? "",
    lng: m[2] ?? "",
    geoLabel: m[3] ? safeDecode(m[3]) : "",
  };
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

/* ------------------------------- classifier ------------------------------- */

/** Turn decoded QR text into a typed, editable studio payload. */
export function classifyScan(raw: string): ScanIntent {
  const text = raw.trim();
  if (!text) return { kind: "text", text: "" };
  const up = text.toUpperCase();

  if (up.startsWith("WIFI:")) return parseWifi(text) ?? { kind: "text", text };
  if (up.startsWith("BEGIN:VCARD")) return parseVcard(text);
  if (up.startsWith("BEGIN:VCALENDAR")) {
    const ev = parseVevent(text);
    return ev.eventTitle ? ev : { kind: "text", text };
  }
  if (up.startsWith("MAILTO:")) {
    const addr = text.slice(7).split(/[?#]/)[0] ?? "";
    return addr ? { kind: "email", email: safeDecode(addr) } : { kind: "text", text };
  }
  if (up.startsWith("TEL:")) return { kind: "phone", phone: digits(text.slice(4)) };
  if (up.startsWith("SMSTO:")) {
    const [num, ...rest] = text.slice(6).split(":");
    return { kind: "sms", phone: digits(num ?? ""), smsBody: rest.join(":") };
  }
  if (up.startsWith("SMS:") || up.startsWith("MATMSG:")) {
    const m = /^SMS:([^?]+)(?:\?(?:body|utf8)=([\s\S]*))?$/i.exec(text);
    if (m) return { kind: "sms", phone: digits(m[1] ?? ""), smsBody: safeDecode(m[2] ?? "") };
  }
  if (up.startsWith("GEO:")) return parseGeo(text) ?? { kind: "text", text };
  const wa = /^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)\//i.exec(text);
  if (wa) {
    const num = /\/(\d{6,15})(?:\?|$|\/)/.exec(text)?.[1] ?? "";
    const q = /[?&]text=([^&]*)/i.exec(text);
    return num ? { kind: "whatsapp", whatsapp: `+${num}`, whatsappText: q ? safeDecode(q[1] ?? "") : "" } : { kind: "url", url: text };
  }
  if (/^https?:\/\//i.test(text)) return { kind: "url", url: text };
  // A bare domain the builder would have prefixed with https:// comes back as
  // one; mirror the studio's long-standing "looks like a link" heuristic.
  if (!/\s/.test(text) && /^[^\s]+\.[a-z]{2,}([/:?#].*)?$/i.test(text)) return { kind: "url", url: text };
  return { kind: "text", text };
}

/** Studio payload merge point: full Payload from decoded text. */
export function payloadFromScan(raw: string, base: Payload): Payload {
  return { ...base, ...classifyScan(raw) };
}
