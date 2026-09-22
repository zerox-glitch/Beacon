import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPayload } from "./payload.ts";
import { classifyScan, payloadFromScan } from "./scan-intent.ts";
import { emptyPayload, type Payload } from "./types.ts";

const P = (patch: Partial<Payload>): Payload => ({ ...emptyPayload(), ...patch });

test("scan-intent: decoded text round-trips through buildPayload", () => {
  const originals: Array<[string, Payload]> = [
    ["url", P({ kind: "url", url: "https://example.com/menu?tab=1" })],
    ["phone", P({ kind: "phone", phone: "+92 300 123 4567" })],
    ["sms", P({ kind: "sms", phone: "+92 300 123 4567", smsBody: "Hello world" })],
    ["email", P({ kind: "email", email: "owner@beacon.app" })],
    ["whatsapp", P({ kind: "whatsapp", whatsapp: "+92 300 123 4567", whatsappText: "Hi there" })],
    ["wifi", P({ kind: "wifi", wifiSsid: 'My;Net"wifi', wifiPassword: 'pa\\ss;word', wifiType: "WPA", wifiHidden: false })],
    [
      "vcard",
      P({
        kind: "vcard",
        firstName: "Ayesha",
        lastName: "Khan",
        org: "Beacon Studio",
        vphone: "+92 300 123 4567",
        vemail: "ayesha@beacon.app",
        vurl: "https://beacon.app",
      }),
    ],
    [
      "event",
      P({
        kind: "event",
        eventTitle: "Launch Night",
        eventLocation: "Lahore, PK",
        eventStart: "2026-10-01T18:30",
        eventEnd: "2026-10-01T21:00",
      }),
    ],
    ["geo", P({ kind: "geo", lat: "31.5204", lng: "74.3587", geoLabel: "Old City Gate" })],
  ];

  for (const [name, original] of originals) {
    const encoded = buildPayload(original);
    assert.ok(encoded, `${name}: buildPayload produced a payload`);
    const intent = classifyScan(encoded);
    assert.equal(intent.kind, original.kind, `${name}: kind matches (${encoded})`);
    const round = buildPayload({ ...emptyPayload(), ...intent });
    assert.equal(round, encoded, `${name}: round-trip stable`);
  }
});

test("scan-intent: plain text and bare domains", () => {
  assert.deepEqual(classifyScan("just some words, no scheme"), { kind: "text", text: "just some words, no scheme" });
  const bare = classifyScan("beacon.app/menu");
  assert.deepEqual(bare, { kind: "url", url: "beacon.app/menu" });
  assert.equal(classifyScan("").kind, "text");
});

test("scan-intent: legacy & foreign encodings land somewhere sane", () => {
  // Old encoders embedded mailto subject/body — compose-to-address only.
  assert.deepEqual(classifyScan("mailto:a@b.com?subject=Hi&body=Yo"), { kind: "email", email: "a@b.com" });
  // SMSTO:92300...:body
  const smsto = classifyScan("SMSTO:923001234567:Pick me up");
  assert.equal(smsto.kind, "sms");
  assert.equal(smsto.phone, "923001234567");
  assert.equal(smsto.smsBody, "Pick me up");
  // WEP wifi without an H field
  const wep = classifyScan("WIFI:T:WEP;S:cafe;P:1234;");
  assert.equal(wep.kind, "wifi");
  assert.equal(wep.wifiType, "WEP");
  assert.equal(wep.wifiSsid, "cafe");
  // vCard with only FN (no N:)
  const fn = classifyScan("BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nEMAIL:ada@example.com\r\nEND:VCARD");
  assert.equal(fn.kind, "vcard");
  assert.equal(fn.firstName, "Ada");
  assert.equal(fn.lastName, "Lovelace");
  assert.equal(fn.vemail, "ada@example.com");
  // wa.me without text
  const wa = classifyScan("https://wa.me/923001234567");
  assert.equal(wa.kind, "whatsapp");
  assert.equal(wa.whatsapp, "+923001234567");
});

test("scan-intent: payloadFromScan keeps unrelated fields", () => {
  const base = P({ kind: "url", url: "https://keep.me", text: "ignored" });
  const out = payloadFromScan("tel:123", base);
  assert.equal(out.kind, "phone");
  assert.equal(out.url, "https://keep.me"); // untouched fields survive
  assert.equal(out.phone, "123");
});
