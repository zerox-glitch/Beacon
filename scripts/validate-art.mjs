/**
 * ART QR STYLE SYSTEM — offline validation harness.
 *
 *   npm run validate:art                  # every direction (styles + templates), full battery
 *   npm run validate:art -- --one=art-deco
 *   npm run validate:art -- --verbose     # print every relax rung
 *   npm run validate:art -- --px=1024     # validate the real export size
 *
 * Renders every art direction through the *same* deterministic pipeline the
 * browser uses (uqr → buildArtPlan → rasterizeArtPlan), then runs the camera
 * battery: native decode, downscaled decode (75/50/33%), blur, contrast
 * variation, perspective variation and JPEG frame compression. Anything that
 * fails walks the relax ladder until it passes, and the report says exactly how
 * far it had to walk — that is the "automatically reduce artistic intensity
 * until it passes, but never all the way to a boring QR" rule, made
 * measurable.
 *
 * Runs in plain node: no DOM, no canvas, no Vite.
 */
import { register } from "node:module";

register(new URL("./ts-resolve.mjs", import.meta.url).href);

const jsQR = (await import("jsqr")).default;
const { encode } = await import("uqr");
const { ART_DIRECTIONS, inkRepairReport } = await import("../src/lib/qr/art-directions.ts");
const { validateArtDirection, summarize } = await import("../src/lib/qr/art/validate.ts");
const { emptyPayload, DEFAULT_STYLE } = await import("../src/lib/qr/types.ts");

const argv = process.argv.slice(2);
const flag = (name) => argv.some((a) => a === `--${name}`);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const PX = Number(opt("px", 512));
const SS = Number(opt("ss", 2));
const ONLY = opt("one", null);
const VERBOSE = flag("verbose");

const URL_PAYLOAD = "https://qrwho.vercel.app/studio?ref=art-system";
const payload = { ...emptyPayload(), kind: "url", url: URL_PAYLOAD };

const decode = (bm) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;

function styleFor(id) {
  return {
    ...DEFAULT_STYLE,
    imageMode: "none",
    quietZone: 3,
    minVersion: 5,
    ecc: "Q",
    maskPattern: -1,
    artDirection: id,
  };
}

/* Harness self-check: a hand-built conventional QR must decode here, otherwise
 * a FAIL in the table below would mean nothing. */
{
  const qr = encode(URL_PAYLOAD, { ecc: "Q", minVersion: 5, border: 0 });
  const qz = 3;
  const n = qr.size + qz * 2;
  const cell = Math.max(2, Math.floor(PX / n));
  const size = cell * n;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 250;
    data[i + 3] = 255;
  }
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.data[y][x]) continue;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const idx = ((y + qz) * cell + dy) * size * 4 + ((x + qz) * cell + dx) * 4;
          data[idx] = data[idx + 1] = data[idx + 2] = 16;
        }
      }
    }
  }
  const got = decode({ data, w: size, h: size });
  if (got !== URL_PAYLOAD) {
    console.error(`harness self-check FAILED: plain QR decoded as ${JSON.stringify(got)}`);
    process.exit(2);
  }
  console.log(`harness self-check ok (${size}px plain QR decoded)\n`);
}

const dirs = ONLY
  ? ART_DIRECTIONS.filter((d) => d.id === ONLY || d.name.toLowerCase() === ONLY.toLowerCase())
  : ART_DIRECTIONS;
if (!dirs.length) {
  console.error(`no direction matched ${ONLY}`);
  process.exit(2);
}

const rows = [];
const failures = [];
const t0 = Date.now();

for (const dir of dirs) {
  const started = Date.now();
  const result = validateArtDirection({
    payload,
    style: styleFor(dir.id),
    decode,
    px: PX,
    ss: SS,
  });
  const row = summarize(result, dir);
  row.ms = Date.now() - started;
  rows.push(row);
  if (!result.ok) failures.push({ dir, result });
  const mark = result.ok ? (result.rung === 0 ? " ok  " : ` ok+${result.rung} `) : " FAIL ";
  console.log(
    `${mark} ${dir.name.padEnd(20)} ${dir.category.padEnd(7)} rung=${result.rung} robust=${result.robustness.toFixed(2)} sep=${row.separation.toFixed(2)} lod=${row.level} ppm=${row.ppm.toFixed(1)} ${row.ms}ms`,
  );
  if (VERBOSE) {
    for (const a of result.attempts) {
      console.log(
        `        rung ${a.rung} ${a.note.padEnd(42)} native=${a.native ? "y" : "n"} robust=${a.robustness.toFixed(2)} camera=${a.cameraRobust ? "y" : "n"} failed=[${a.failed.join(" ")}] audit=${a.audit.ok ? "ok" : a.audit.problems.join("; ")}`,
      );
    }
  }
}

const repairs = inkRepairReport();
console.log("");
console.log(`— ${rows.length} directions in ${((Date.now() - t0) / 1000).toFixed(1)}s at ${PX}px (ss=${SS}) —`);
console.log(`passed as authored : ${rows.filter((r) => r.ok && r.rung === 0).length}`);
console.log(`passed after relax : ${rows.filter((r) => r.ok && r.rung > 0).length}`);
console.log(`failed             : ${rows.filter((r) => !r.ok).length}`);
if (repairs.length) {
  console.log("");
  console.log("luminance gate repairs (the colour rule, applied automatically):");
  for (const r of repairs) console.log(`  ${r.name}: ${r.repairs.join("; ")}`);
}
if (failures.length) {
  console.log("");
  console.log("failures:");
  for (const { dir, result } of failures) {
    const last = result.attempts[result.attempts.length - 1];
    console.log(
      `  ${dir.name}: ${last ? last.audit.problems.join("; ") || `still failing [${last.failed.join(" ")}]` : "no attempts"}`,
    );
  }
  process.exit(1);
}
