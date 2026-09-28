/**
 * Frame unit tests (runs in plain `node --test`).
 *
 * Frames render inside the QR canvas margin (frames.ts). Verified here with a
 * mock 2D context: every frame definition draws without throwing, "none"
 * draws nothing, and the margin math keeps the frame OUT of the quiet zone.
 */
import { register } from "node:module";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

register(new URL("./ts-resolve.mjs", import.meta.url).href);

const { FRAME_IDS, FRAME_DEFS, frameDef, frameBandFor, drawFrame, drawFrameArt, setFrameArt, isDecorFrame } =
  await import("../src/lib/qr/frames.ts");

function mockCtx() {
  const calls = [];
  const handler = {
    get(target, prop) {
      if (prop === "calls") return calls;
      if (prop === "createLinearGradient") {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === "measureText") return () => ({ width: 10 });
      if (!(prop in target)) {
        target[prop] = (..._args) => {
          if (typeof prop === "string" && !prop.startsWith("is")) calls.push(prop);
        };
        return target[prop];
      }
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  };
  return new Proxy({}, handler);
}

describe("frameBandFor", () => {
  it("none adds no margin", () => {
    assert.equal(frameBandFor("none", 1000), 0);
  });
  it("frames reserve a consistent margin band", () => {
    for (const id of FRAME_IDS) {
      if (id === "none") continue;
      const b1 = frameBandFor(id, 1000);
      const b2 = frameBandFor(id, 4096);
      const expect = isDecorFrame(id)
        ? Math.max(18, Math.round(1000 * 0.1)) // decorative ring — wide enough to show the art
        : Math.max(10, Math.round(1000 * 0.045));
      assert.equal(b1, expect);
      assert.ok(isDecorFrame(id) ? b1 / 1000 <= 0.11 : true, "decor border stays reasonably thin");
      assert.ok(b2 > b1, "margin scales with size");
    }
  });
});

describe("drawFrame", () => {
  for (const id of FRAME_IDS) {
    it(`"${id}" renders without throwing`, () => {
      const px = 1000;
      const band = frameBandFor(id, px);
      const origin = band + 40;
      const body = px - (band + 40) * 2;
      const ctx = mockCtx();
      drawFrame(ctx, id, { px, band, origin, body, fg: "#141412", bg: "#f4f1ea" });
      if (id === "none") {
        assert.equal(ctx.calls.length, 0, "none draws nothing");
      } else if (isDecorFrame(id)) {
        // Decorative art frames paint under the code via drawFrameArt —
        // drawFrame must stay a no-op so nothing overlays the modules.
        assert.equal(ctx.calls.length, 0, `${id} overlays nothing`);
        setFrameArt(id, {});
        const art = mockCtx();
        drawFrameArt(art, id, px);
        assert.ok(art.calls.includes("drawImage"), `${id} paints its artwork under the card`);
      } else {
        assert.ok(ctx.calls.length > 0, `${id} must draw something`);
        assert.ok(ctx.calls.includes("save") && ctx.calls.includes("restore"));
      }
    });
  }

  it("every definition has a label + hint for the studio picker", () => {
    for (const f of FRAME_DEFS) {
      assert.ok(f.label.length > 0 && f.hint.length > 0, f.id);
      assert.equal(frameDef(f.id).id, f.id);
    }
    assert.equal(FRAME_DEFS.length, FRAME_IDS.length);
  });

  it("unknown frames fall back to none (def lookup)", () => {
    assert.equal(frameDef("definitely-not-a-frame").id, "none");
  });
});
