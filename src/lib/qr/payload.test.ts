/**
 * Phone-scanner compatibility tests for the QR payload builders. These pin
 * down the formats camera apps actually accept (CRLF vCard/iCal, ZXing Wi-Fi
 * field omission, bare mailto, RFC 5870 geo) — regressions here turn scans
 * into raw-text walls on real phones.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildPayload } from "./payload.ts";
import type { Payload } from "./types.ts";

const base = {
  kind: "text",
  url: "",
  text: "",
  phone: "",
  smsBody: "",
  email: "",
  emailSubject: "",
  emailBody: "",
  whatsapp: "",
  whatsappText: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiType: "WPA",
  wifiHidden: false,
  lat: "",
  lng: "",
  geoLabel: "",
  firstName: "",
  lastName: "",
  org: "",
  vphone: "",
  vemail: "",
  vurl: "",
  eventTitle: "",
  eventStart: "",
  eventEnd: "",
  eventLocation: "",
} as unknown as Payload;

const p = (over: Partial<Payload>): string => buildPayload({ ...base, ...over } as Payload);

describe("wifi payload (ZXing de-facto spec)", () => {
  it("omits H unless hidden, single-; closed optional tail", () => {
    assert.equal(p({ kind: "wifi", wifiSsid: "Hamza", wifiPassword: "hamza868" }), "WIFI:T:WPA;S:Hamza;P:hamza868;;");
    assert.equal(p({ kind: "wifi", wifiSsid: "X", wifiPassword: "y", wifiHidden: true }), "WIFI:T:WPA;S:X;P:y;H:true;;");
  });
  it("open networks carry no password field", () => {
    assert.equal(p({ kind: "wifi", wifiSsid: "Cafe", wifiType: "nopass", wifiPassword: "ignored" }), "WIFI:T:nopass;S:Cafe;;");
  });
  it("escapes reserved characters", () => {
    // ssid contains ; and "; password contains a literal backslash.
    const v = p({ kind: "wifi", wifiSsid: 'my;net"1', wifiPassword: "a\\b" });
    assert.equal(v, 'WIFI:T:WPA;S:my\\;net\\"1;P:a\\\\b;;');
  });
  it("empty ssid yields nothing", () => assert.equal(p({ kind: "wifi" }), ""));
});

describe("vcard payload", () => {
  it("uses CRLF line endings (iOS importer requirement)", () => {
    const v = p({ kind: "vcard", firstName: "hamza", lastName: "s" });
    assert.ok(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
    assert.ok(v.endsWith("\r\nEND:VCARD"));
    assert.ok(v.includes("FN:hamza s"));
  });
  it("escapes commas/semicolons in text values and normalizes the URL", () => {
    const v = p({ kind: "vcard", firstName: "A", org: "Acme; Inc, Corp", vurl: "chronolyte.com" });
    assert.ok(v.includes("ORG:Acme\\; Inc\\, Corp"), v);
    assert.ok(v.includes("URL:https://chronolyte.com"), v);
  });
});

describe("event payload (iCalendar)", () => {
  it("includes UID, DTSTAMP, PRODID and CRLF so calendars offer an import button", () => {
    const v = p({ kind: "event", eventTitle: "studio", eventStart: "2026-09-23T03:25", eventLocation: "newyork" });
    assert.ok(v.includes("BEGIN:VCALENDAR\r\n"));
    assert.ok(v.includes("PRODID:-//QRWho//QR Studio//EN"));
    assert.match(v, /UID:qrwho-[0-9a-z]+@qrwho\.studio/);
    assert.ok(v.includes("DTSTAMP:20000101T000000Z"));
    assert.ok(v.includes("SUMMARY:studio"));
    assert.ok(v.includes("DTSTART:20260923T032500Z"));
    assert.ok(v.includes("LOCATION:newyork"));
  });
  it("is deterministic: same content → identical payload (stable QR, no duplicate events)", () => {
    const args = { kind: "event" as const, eventTitle: "Launch", eventStart: "2026-01-01T10:00" };
    assert.equal(p(args), p(args));
  });
});

describe("email payload", () => {
  it("is a bare mailto — legacy subject/body never bloat the QR", () => {
    assert.equal(
      p({ kind: "email", email: "a@b.com", emailSubject: "Hi", emailBody: "long ".repeat(50) }),
      "mailto:a@b.com",
    );
  });
});

describe("geo payload", () => {
  it("percent-encodes the label and normalizes coords", () => {
    assert.equal(p({ kind: "geo", lat: " 37.78 ", lng: "-122.48", geoLabel: "New York" }), "geo:37.78,-122.48?q=New%20York");
    assert.equal(p({ kind: "geo", lat: "1", lng: "2" }), "geo:1,2");
  });
  it("rejects out-of-range coords and falls back to a maps search link", () => {
    const v = p({ kind: "geo", lat: "abc", lng: "999", geoLabel: "HQ" });
    assert.ok(v.includes("google.com/maps/search"), v);
    assert.ok(v.includes("query=HQ"), v);
  });
});

describe("link + comms payloads", () => {
  it("prefixes bare domains with https:// but preserves custom schemes", () => {
    assert.equal(p({ kind: "url", url: "example.com/x" }), "https://example.com/x");
    assert.equal(p({ kind: "url", url: "geo:1,2" }), "geo:1,2");
  });
  it("tel strips formatting; sms encodes the body", () => {
    assert.equal(p({ kind: "phone", phone: "+1 (555) 010-0" }), "tel:+15550100");
    assert.ok(p({ kind: "sms", phone: "555", smsBody: "hi there" }).endsWith("?body=hi%20there"));
  });
});
