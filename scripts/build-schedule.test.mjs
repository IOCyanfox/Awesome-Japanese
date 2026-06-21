import { test } from "node:test";
import assert from "node:assert";
import { buildSchedule, orientationFromPlayerResponse } from "./build-schedule.mjs";

test("orientation: vertical when height > width (Short)", () => {
  const pr = { streamingData: { formats: [{ width: 360, height: 640 }] } };
  assert.strictEqual(orientationFromPlayerResponse(pr), "vertical");
});
test("orientation: landscape when width > height", () => {
  const pr = { streamingData: { formats: [{ width: 640, height: 360 }] } };
  assert.strictEqual(orientationFromPlayerResponse(pr), "landscape");
});
test("orientation: reads adaptiveFormats when formats empty", () => {
  const pr = { streamingData: { adaptiveFormats: [{ mimeType: "audio" }, { width: 1920, height: 1080 }] } };
  assert.strictEqual(orientationFromPlayerResponse(pr), "landscape");
});
test("orientation: null when no sized format", () => {
  assert.strictEqual(orientationFromPlayerResponse({ streamingData: {} }), null);
  assert.strictEqual(orientationFromPlayerResponse({}), null);
});

const channelsData = [
  { channelId: "UCaaa", name: "Chan A", videos: [
    { videoId: "v1", title: "One", isoDuration: "PT1M", regionRestriction: undefined },
    { videoId: "v2", title: "Two", isoDuration: "PT2M", regionRestriction: { blocked: ["US"] } },
  ]},
];

test("buildSchedule shapes schedule.json", () => {
  const out = buildSchedule(channelsData, 1700000000, 1782000000);
  assert.strictEqual(out.epoch, 1700000000);
  assert.strictEqual(out.generatedAt, 1782000000);
  const c = out.channels["UCaaa"];
  assert.strictEqual(c.name, "Chan A");
  assert.strictEqual(c.total, 180);
  assert.deepStrictEqual(c.items[0], { videoId: "v1", title: "One", duration: 60, blocked: [], allowed: [] });
  assert.deepStrictEqual(c.items[1], { videoId: "v2", title: "Two", duration: 120, blocked: ["US"], allowed: [] });
});

test("buildSchedule drops zero-duration items", () => {
  const out = buildSchedule([{ channelId: "UCz", name: "Z", videos: [
    { videoId: "good", title: "g", isoDuration: "PT30S" },
    { videoId: "bad", title: "b", isoDuration: "P0D" },
  ]}], 1700000000, 1);
  assert.strictEqual(out.channels["UCz"].items.length, 1);
  assert.strictEqual(out.channels["UCz"].total, 30);
});
