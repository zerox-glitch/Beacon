/**
 * Finder-silhouette battery lookup tests (plain `node --test`).
 *
 * safeFinder() maps a (frame, ball) pick to the closest pair the camera
 * battery proved on a template. The table is generated (see
 * scripts/finder-battery.mjs). NOTE: tuneDirection no longer routes picks
 * through this battery — explicit picks render exactly as chosen (the app's
 * drawEye rule) and scan quality is guarded by the meter + Fix scan. The
 * battery remains as a lookup resource; these tests pin its contracts.
 */
import { register } from "node:module";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

register(new URL("./ts-resolve.mjs", import.meta.url).href);

const { safeFinder, FINDER_BATTERY, FRAME_ORDER, BALL_ORDER, BEST_BALL } = await import(
  "../src/lib/qr/art/finder-battery.ts"
);
const { tuneDirection } = await import("../src/lib/qr/art/tune.ts");
const { getArtDirection } = await import("../src/lib/qr/art-directions.ts");

const TID = "digital-glass"; // a battery row with rich frame/ball coverage
const dir = { id: TID, name: "Digital Glass" };
const baseStyle = { artDirection: TID };

describe("safeFinder", () => {
  it("keeps an exact pair the battery passed on the template", () => {
    // Find a pair that actually passes on this template (not a hardcoded
    // guess) and assert the lookup returns it unchanged.
    const mask = FINDER_BATTERY[TID][FRAME_ORDER.indexOf("square")];
    const ball = BALL_ORDER.find((b, i) => mask & (1 << i));
    assert.ok(ball, "precondition: a square-frame ball passes on digital-glass");
    assert.deepEqual(safeFinder(TID, "square", ball), { frame: "square", ball });
  });

  it("gives a bare frame pick the battery's best ball for that frame", () => {
    const r = safeFinder(TID, "diamond", undefined);
    assert.equal(r.frame, "diamond");
    assert.equal(r.ball, BEST_BALL.diamond);
  });

  it("never returns a pair the battery rejected on the template", () => {
    const frames = [...FRAME_ORDER];
    const balls = [...BALL_ORDER, undefined];
    for (const f of frames)
      for (const b of balls) {
        const r = safeFinder(TID, f, b);
        if (r.frame === null) continue;
        if (r.ball === undefined) continue;
        const mask = FINDER_BATTERY[TID][FRAME_ORDER.indexOf(r.frame)];
        assert.ok(
          mask & (1 << BALL_ORDER.indexOf(r.ball)),
          `${f}+${b} → ${r.frame}+${r.ball} must be battery-passed on ${TID}`,
        );
      }
  });

  it("returns null when no silhouette passes on the template", () => {
    // tmpl-wechat is the one battery row with no passing frames.
    assert.ok(FINDER_BATTERY["tmpl-wechat"], "precondition: wechat row exists");
    assert.ok(FINDER_BATTERY["tmpl-wechat"].every((m) => m === 0));
    assert.deepEqual(safeFinder("tmpl-wechat", "circle", "square"), { frame: null, ball: undefined });
  });

  it("trusts the pick on a template with no battery row", () => {
    assert.deepEqual(safeFinder("no-such-template", "diamond", "hex"), {
      frame: "diamond",
      ball: "hex",
    });
  });

  it("always resolves target to a circle ball", () => {
    for (const b of BALL_ORDER) {
      const r = safeFinder(TID, "target", b);
      assert.equal(r.frame, "target");
      assert.equal(r.ball, "circle");
    }
  });
});

describe("tuneDirection eye/pupil picks", () => {
  it("sets finderFrame/finderBall for an explicit eye pick", () => {
    const tuned = tuneDirection({ ...dir }, {
      ...baseStyle,
      eyeShape: "hex",
      eyePicked: true,
      ballShape: "square",
      ballPicked: true,
    });
    assert.equal(typeof tuned.finderFrame, "string");
    assert.ok(tuned.finderFrame);
  });

  it("leaves the template's finder alone for seeded no-pick values", () => {
    // Presets seed square/square WITHOUT picked markers — that must NOT
    // restyle the template (this is what keeps validate:art at 75/6/0).
    const tuned = tuneDirection({ ...dir }, { ...baseStyle, eyeShape: "square", ballShape: "square" });
    assert.equal(tuned.finderFrame, undefined);
    assert.equal(tuned.finderBall, undefined);
  });

  it("applies the pick exactly even on a zero-passing template", () => {
    // tmpl-wechat has no battery-passing silhouette — the old policy dropped
    // the pick there, which read as "the pupil pickers don't work". Picks now
    // always render as chosen (the mobile app's drawEye rule); scan quality
    // is guarded by the scan meter + Fix scan instead of by surprise.
    const wechatDir = getArtDirection("tmpl-wechat") ?? { id: "tmpl-wechat", name: "WeChat" };
    const tuned = tuneDirection({ ...wechatDir, id: "tmpl-wechat" }, {
      ...baseStyle,
      artDirection: "tmpl-wechat",
      eyeShape: "circle",
      eyePicked: true,
    });
    assert.equal(tuned.finderFrame, "circle");
  });
});
