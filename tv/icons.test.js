import { test } from "node:test";
import assert from "node:assert";
import "./icons.js"; // sets globalThis.IconLib
const { initials, hueFromString } = globalThis.IconLib;

test("initials: latin -> up to 3 letters", () => {
  assert.strictEqual(initials("ANN News (TV Asahi)"), "ANN");
});
test("initials: CJK -> first 2 chars", () => {
  assert.strictEqual(initials("日テレNEWS"), "日テ");
});
test("initials: strips a leading 【…】 tag", () => {
  assert.strictEqual(initials("【公式】OTV沖縄テレビ"), "OTV");
});
test("initials: empty -> ?", () => {
  assert.strictEqual(initials(""), "?");
  assert.strictEqual(initials(undefined), "?");
});
test("hueFromString: deterministic, in [0,360)", () => {
  const h = hueFromString("ANN");
  assert.strictEqual(h, hueFromString("ANN"));
  assert.ok(h >= 0 && h < 360);
});
