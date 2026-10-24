import { encodePayload } from "./encode";
import { buildPayload } from "./payload";
import { loadImage, renderQr } from "./render";
import { DEFAULT_SAMPLE_URL, emptyPayload, type Preset } from "./types";
import { verifyQr } from "./verify";

export const SAMPLE_URL = DEFAULT_SAMPLE_URL;

export interface SampleImage {
  preset: Preset;
  url: string;
  /** True only when jsQR decoded the exact rendered pixels back to the payload. */
  verified: boolean;
}

interface CacheEntry {
  url: string;
  verified: boolean;
}

/**
 * Gallery renders are deterministic (preset + destination + size), so results
 * are cached in memory and in sessionStorage: the wall pays the full
 * render + decode cost once per session and reloads paint instantly.
 */
const memCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

const STORE_PREFIX = "qrwho-sample:";

function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStore(key: string): CacheEntry | null {
  try {
    const raw = store()?.getItem(STORE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry> | null;
    if (parsed && typeof parsed.url === "string") {
      return { url: parsed.url, verified: Boolean(parsed.verified) };
    }
  } catch {
    /* corrupt entry — fall through and re-render */
  }
  return null;
}

function writeStore(key: string, entry: CacheEntry): void {
  try {
    // Best effort only: never blow the small sessionStorage quota on a sample.
    if (entry.url.length > 350_000) return;
    store()?.setItem(STORE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / privacy mode — the memory cache still holds it */
  }
}

/** Short deterministic key: preset identity + style + destination + size. */
function cacheKey(preset: Preset, px: number, url: string): string {
  const material = `${preset.id}|${preset.artUrl ?? ""}|${JSON.stringify(preset.style)}|${px}|${url}`;
  let hash = 5381;
  for (let i = 0; i < material.length; i += 1) hash = ((hash << 5) + hash + material.charCodeAt(i)) | 0;
  return `${(hash >>> 0).toString(36)}-${px}`;
}

/**
 * Serial render queue with idle yields. The gallery used to fire every render
 * at once, pinning the main thread for seconds — the support button, links and
 * the studio route all froze behind it. One job at a time with a breath in
 * between keeps the page interactive while the wall fills in progressively.
 */
let queueTail: Promise<void> = Promise.resolve();

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (
      window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }
    ).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 250 });
    else window.setTimeout(resolve, 24);
  });
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const out = queueTail.then(whenIdle).then(job);
  queueTail = out.then(
    () => undefined,
    () => undefined,
  );
  return out;
}

async function paintSample(preset: Preset, px: number, url: string): Promise<CacheEntry> {
  const payload = { ...emptyPayload(), kind: "url" as const, url };
  const text = buildPayload(payload).trim();
  const qr = encodePayload(payload, preset.style);
  const art = preset.artUrl ? await loadImage(preset.artUrl).catch(() => null) : null;
  const canvas = document.createElement("canvas");
  renderQr(canvas, qr, preset.style, { pixelSize: px, art, exportScale: true });
  const decoded = await verifyQr(canvas).catch(() => null);
  return { url: canvas.toDataURL("image/png"), verified: decoded === text };
}

/**
 * Render a preset to a bitmap and decode it with jsQR — the same pipeline the
 * studio uses — then return the PNG data URL. Used by the landing page so
 * every showcased code is a real, verified QR. Cached (memory + sessionStorage)
 * and queued one-at-a-time so the main thread stays responsive.
 */
export function renderSamplePreset(
  preset: Preset,
  px = 512,
  url: string = DEFAULT_SAMPLE_URL,
): Promise<SampleImage> {
  const dest = url.trim() || DEFAULT_SAMPLE_URL;
  const key = cacheKey(preset, px, dest);
  const toImage = (entry: CacheEntry): SampleImage => ({
    preset,
    url: entry.url,
    verified: entry.verified,
  });

  const cached = memCache.get(key) ?? readStore(key);
  if (cached) {
    memCache.set(key, cached);
    return Promise.resolve(toImage(cached));
  }
  const pending = inflight.get(key);
  if (pending) return pending.then(toImage);

  const job = enqueue(() => paintSample(preset, px, dest))
    .then((entry) => {
      memCache.set(key, entry);
      writeStore(key, entry);
      inflight.delete(key);
      return entry;
    })
    .catch((err: unknown) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, job);
  return job.then(toImage);
}
