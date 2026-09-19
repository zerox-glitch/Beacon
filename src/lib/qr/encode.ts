import { encode, type QrCodeGenerateResult } from "uqr";
import { buildPayload } from "./payload";
import type { Payload, QrStyle } from "./types";

export type EncodedQr = QrCodeGenerateResult;

export function encodePayload(payload: Payload, style: QrStyle): EncodedQr {
  const text = buildPayload(payload).trim() || "https://grok.com";
  const pictured = style.imageMode !== "none";
  return encode(text, {
    ecc: pictured ? "H" : style.ecc,
    boostEcc: pictured,
    minVersion: pictured ? Math.max(style.minVersion, 4) : 1,
    border: 0,
  });
}

export function tryEncodePayload(
  payload: Payload,
  style: QrStyle,
): { ok: true; qr: EncodedQr } | { ok: false; error: string } {
  try {
    return { ok: true, qr: encodePayload(payload, style) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not encode this content.";
    return { ok: false, error: message };
  }
}
