/**
 * Finder-silhouette camera battery.
 *
 * For every art template × every (frame × ball) combination the Design-tab
 * eye/pupil pickers can produce, render the code at 512px with that exact
 * classic silhouette finder and decode it with the non-negotiable camera
 * variants (identity / 50% / JPEG). The pass matrix becomes
 * src/lib/qr/art/finder-battery.ts (FINDER_BATTERY), which tuneDirection
 * consults so a user's pick always resolves to a silhouette the battery
 * proved on THAT template.
 *
 * Parent:  node --experimental-strip-types scripts/finder-battery.mjs [workers]
 * Worker:  (spawned internally, FINDERSLICE=wi/total)
 */
import { register } from "node:module";
register(new URL("./ts-resolve.mjs", import.meta.url).href);
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const PAYLOAD = "https://qrwho.vercel.app/r/beacon-demo-fall-2026?src=qr&utm=1";
const PX = 512;
const OUT_DIR = "/tmp/sm/fb";
const WORKERS = Number(process.argv[2] ?? 8);

const jsQR = (await import("jsqr")).default;
const { encode } = await import("uqr");
const { artDirectionPresets, getArtDirection } = await import("../src/lib/qr/art-directions.ts");
const { buildArtPlan } = await import("../src/lib/qr/art/art-plan.ts");
const { rasterizeArtPlan } = await import("../src/lib/qr/art/rasterize.ts");
const { cameraVariants, CAMERA_ROBUST_REQUIRED } = await import("../src/lib/qr/photo/camera-sim.ts");
const { FRAME_ORDER, BALL_ORDER } = await import("../src/lib/qr/art/finder-battery.ts");

const dec = (bm) => jsQR(bm.data, bm.w, bm.h, { inversionAttempts: "attemptBoth" })?.data ?? null;
const variants = cameraVariants().filter((v) => CAMERA_ROBUST_REQUIRED.includes(v.id));
const presets = artDirectionPresets();
const qr = encode(PAYLOAD, { ecc: "Q", boostEcc: false, minVersion: 1, border: 0 });

const triples = [];
for (const p of presets) {
  const dir = getArtDirection(p.style.artDirection);
  for (const frame of FRAME_ORDER) {
    if (frame === "target") {
      triples.push([dir.id, "target", "circle"]);
      continue;
    }
    for (const ball of BALL_ORDER) triples.push([dir.id, frame, ball]);
  }
}

function runTriple([tid, frame, ball]) {
  const preset = presets.find((p) => getArtDirection(p.style.artDirection)?.id === tid);
  const dir = getArtDirection(preset.style.artDirection);
  const style = {
    ...preset.style,
    eyeShape: frame,
    eyePicked: true,
    ballShape: ball,
    ballPicked: true,
  };
  const plan = buildArtPlan({ qr, style, direction: dir, px: PX, relax: 0, cameraSafe: false });
  const bm = rasterizeArtPlan(plan, { ss: 2 });
  const ok = variants.every((v) => dec(v.apply(bm)) === PAYLOAD);
  return { tid, frame, ball, ok };
}

// ---------------------------------------------------------------- worker ---
const sliceEnv = process.env.FINDERSLICE;
if (sliceEnv) {
  const [wi, total] = sliceEnv.split("/").map(Number);
  const rows = triples.filter((_, idx) => idx % total === wi);
  const out = [];
  for (const row of rows) out.push(runTriple(row));
  const file = path.join(OUT_DIR, `w${wi}.jsonl`);
  writeFileSync(file, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------- parent ---
mkdirSync(OUT_DIR, { recursive: true });
for (let i = 0; i < WORKERS; i++) {
  if (existsSync(path.join(OUT_DIR, `w${i}.jsonl`)))
    writeFileSync(path.join(OUT_DIR, `w${i}.jsonl`), "");
}
console.log(
  `${presets.length} templates × ${FRAME_ORDER.length} frames × ${BALL_ORDER.length} balls = ${triples.length} combos, ${WORKERS} procs, ${PX}px, identity+s50+jpeg`,
);

const t0 = Date.now();
await Promise.all(
  Array.from({ length: WORKERS }, (_, wi) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["--experimental-strip-types", process.argv[1]], {
        env: { ...process.env, FINDERSLICE: `${wi}/${WORKERS}` },
        stdio: ["ignore", "ignore", "inherit"],
      });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker ${wi} exited ${code}`))));
    }),
  ),
);
const ms = Date.now() - t0;

const results = [];
for (let i = 0; i < WORKERS; i++) {
  const file = path.join(OUT_DIR, `w${i}.jsonl`);
  for (const line of readFileSync(file, "utf8").split("\n")) if (line.trim()) results.push(JSON.parse(line));
}

const masks = {};
for (const { tid, frame, ball, ok } of results) {
  if (!masks[tid]) masks[tid] = new Array(FRAME_ORDER.length).fill(0);
  if (ok) masks[tid][FRAME_ORDER.indexOf(frame)] |= 1 << BALL_ORDER.indexOf(ball);
}
const pass = results.filter((r) => r.ok).length;
console.log(`done in ${(ms / 1000).toFixed(0)}s — ${pass}/${results.length} (frame, ball) pairs camera-pass`);
for (const f of FRAME_ORDER) {
  const rows = results.filter((r) => r.frame === f);
  console.log(`  ${f.padEnd(15)} ${rows.filter((r) => r.ok).length}/${rows.length}`);
}

const entries = Object.entries(masks)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([tid, m]) => `  ${JSON.stringify(tid)}: [${m.join(", ")}],`)
  .join("\n");
const table = `// GENERATED by scripts/finder-battery.mjs — do not edit by hand.\n// ${presets.length} templates × (frame × ball), ${PX}px, identity+s50+jpeg.\n// Bit i of mask f = BALL_ORDER[i] passes under FRAME_ORDER[f] on this template.\nexport const FINDER_BATTERY: Record<string, number[]> = {\n${entries}\n};`;

const p = new URL("../src/lib/qr/art/finder-battery.ts", import.meta.url);
let src = readFileSync(p, "utf8");
// Replace either the empty placeholder or a previously generated table (idempotent).
const re =
  /(?:^\/\/[^\n]*\n)*export const FINDER_BATTERY: Record<string, number\[\]> = \{[\s\S]*?\n\};\n/m;
if (!re.test(src)) throw new Error("FINDER_BATTERY block not found");
src = src.replace(re, table + "\n");
writeFileSync(p, src);
writeFileSync("/tmp/sm/finder-battery-table.ts", table);
console.log("wrote src/lib/qr/art/finder-battery.ts + /tmp/sm/finder-battery-table.ts");
