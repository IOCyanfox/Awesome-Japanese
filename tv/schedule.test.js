import { test } from "node:test";
import assert from "node:assert";
import "./schedule.js"; // sets globalThis.ScheduleLib
const { currentProgram } = globalThis.ScheduleLib;

const sched = { total: 180, items: [
  { videoId: "v1", title: "One", duration: 60 },
  { videoId: "v2", title: "Two", duration: 120 },
] };
const EPOCH = 1000;

test("start of loop -> first item, offset 0", () => {
  assert.deepStrictEqual(currentProgram(sched, EPOCH, 1000), { videoId: "v1", title: "One", index: 0, offset: 0 });
});
test("inside first item", () => {
  assert.strictEqual(currentProgram(sched, EPOCH, 1030).offset, 30);
});
test("exact boundary -> next item offset 0", () => {
  assert.deepStrictEqual(currentProgram(sched, EPOCH, 1060), { videoId: "v2", title: "Two", index: 1, offset: 0 });
});
test("loop wrap", () => {
  const p = currentProgram(sched, EPOCH, 1000 + 180 + 5); // one full loop + 5s
  assert.deepStrictEqual(p, { videoId: "v1", title: "One", index: 0, offset: 5 });
});
test("now before epoch handled (no negative offset)", () => {
  const p = currentProgram(sched, EPOCH, 1000 - 10); // 10s before epoch -> 170 into loop
  assert.ok(p.offset >= 0 && p.videoId);
});
test("empty schedule -> null", () => {
  assert.strictEqual(currentProgram({ total: 0, items: [] }, EPOCH, 1234), null);
});
