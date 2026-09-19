import type { Payload } from "./types";

function digits(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function wifiEscape(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function icsDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export function buildPayload(p: Payload): string {
  switch (p.kind) {
    case "url": {
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
      const to = p.email.trim();
      if (!to) return "";
      const q = new URLSearchParams();
      if (p.emailSubject.trim()) q.set("subject", p.emailSubject.trim());
      if (p.emailBody.trim()) q.set("body", p.emailBody.trim());
      const qs = q.toString();
      return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
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
      const type = p.wifiType === "nopass" ? "nopass" : p.wifiType;
      const pass = type === "nopass" ? "" : p.wifiPassword;
      return `WIFI:T:${type};S:${wifiEscape(ssid)};P:${wifiEscape(pass)};H:${p.wifiHidden ? "true" : "false"};;`;
    }
    case "geo": {
      const lat = p.lat.trim();
      const lng = p.lng.trim();
      if (!lat || !lng) return "";
      const label = p.geoLabel.trim();
      return label ? `geo:${lat},${lng}?q=${encodeURIComponent(label)}` : `geo:${lat},${lng}`;
    }
    case "vcard": {
      const first = p.firstName.trim();
      const last = p.lastName.trim();
      const fn = [first, last].filter(Boolean).join(" ");
      if (!fn && !p.vphone && !p.vemail) return "";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${last};${first};;;`,
        `FN:${fn || "Contact"}`,
      ];
      if (p.org.trim()) lines.push(`ORG:${p.org.trim()}`);
      if (p.vphone.trim()) lines.push(`TEL;TYPE=CELL:${digits(p.vphone)}`);
      if (p.vemail.trim()) lines.push(`EMAIL:${p.vemail.trim()}`);
      if (p.vurl.trim()) lines.push(`URL:${p.vurl.trim()}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    case "event": {
      const title = p.eventTitle.trim();
      if (!title) return "";
      const start = icsDate(p.eventStart);
      const end = icsDate(p.eventEnd);
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${title}`,
      ];
      if (start) lines.push(`DTSTART:${start}`);
      if (end) lines.push(`DTEND:${end}`);
      if (p.eventLocation.trim()) lines.push(`LOCATION:${p.eventLocation.trim()}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      return lines.join("\n");
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
