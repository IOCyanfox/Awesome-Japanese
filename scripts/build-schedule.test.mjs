import { test } from "node:test";
import assert from "node:assert";
import { buildSchedule, keepVideo, mergeSources } from "./build-schedule.mjs";

test("keepVideo: drops zero/negative duration", () => {
  assert.strictEqual(keepVideo(0, "landscape"), false);
});
test("buildSchedule carries group through", () => {
  const out = buildSchedule([{ channelId: "UCg", name: "G", group: "Kanto", videos: [
    { videoId: "v", title: "t", isoDuration: "PT2M", embeddable: true },
  ]}], 1700000000, 1);
  assert.strictEqual(out.channels["UCg"].group, "Kanto");
});
test("keepVideo: keeps long videos regardless of orientation", () => {
  assert.strictEqual(keepVideo(600, undefined), true);
  assert.strictEqual(keepVideo(600, "vertical"), true); // >180 can't be a Short
});
test("keepVideo: drops confirmed vertical Shorts", () => {
  assert.strictEqual(keepVideo(100, "vertical"), false);
  assert.strictEqual(keepVideo(30, "vertical"), false);
});
test("keepVideo: keeps confirmed landscape clips even if short", () => {
  assert.strictEqual(keepVideo(38, "landscape"), true);
});
test("keepVideo: unknown orientation -> duration floor (drop <=60s)", () => {
  assert.strictEqual(keepVideo(30, undefined), false); // likely a Short
  assert.strictEqual(keepVideo(90, undefined), true);  // probably a real clip
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

test("buildSchedule drops non-embeddable videos (status.embeddable === false)", () => {
  const out = buildSchedule([{ channelId: "UCe", name: "E", videos: [
    { videoId: "ok", title: "ok", isoDuration: "PT2M", embeddable: true },
    { videoId: "no", title: "no", isoDuration: "PT2M", embeddable: false },
    { videoId: "unknown", title: "u", isoDuration: "PT2M" }, // undefined -> kept (fail-open)
  ]}], 1700000000, 1);
  assert.deepStrictEqual(out.channels["UCe"].items.map((i) => i.videoId), ["ok", "unknown"]);
});

test("buildSchedule drops zero-duration items", () => {
  const out = buildSchedule([{ channelId: "UCz", name: "Z", videos: [
    { videoId: "good", title: "g", isoDuration: "PT30S" },
    { videoId: "bad", title: "b", isoDuration: "P0D" },
  ]}], 1700000000, 1);
  assert.strictEqual(out.channels["UCz"].items.length, 1);
  assert.strictEqual(out.channels["UCz"].total, 30);
});

// helper: video oldest->newest order, ISO publishedAt
const v = (id, pub) => ({ videoId: id, isoDuration: "PT2M", publishedAt: pub });

test("mergeSources: chronological interleave across sources (oldest->newest)", () => {
  const primary = [v("A", "2026-01-01T00:00:00Z"), v("B", "2026-01-03T00:00:00Z")];
  const news    = [v("X", "2026-01-02T00:00:00Z"), v("Y", "2026-01-04T00:00:00Z")];
  const out = mergeSources(primary, [news], { maxPrimary: 40, maxSub: 18 }).map((x) => x.videoId);
  assert.deepStrictEqual(out, ["A", "X", "B", "Y"]);
});

test("mergeSources: per-source cap keeps the NEWEST maxSub from each sub", () => {
  const primary = [v("P1", "2026-01-01T00:00:00Z")];
  const sub = [v("s1","2026-02-01T00:00:00Z"), v("s2","2026-02-02T00:00:00Z"), v("s3","2026-02-03T00:00:00Z"), v("s4","2026-02-04T00:00:00Z")];
  const out = mergeSources(primary, [sub], { maxPrimary: 40, maxSub: 2 }).map((x) => x.videoId);
  assert.deepStrictEqual(out, ["P1", "s3", "s4"]);
});

test("mergeSources: missing publishedAt sorts as oldest, stable order", () => {
  const primary = [v("A", "2026-01-05T00:00:00Z"), { videoId: "N1", isoDuration: "PT2M" }, { videoId: "N2", isoDuration: "PT2M" }];
  const out = mergeSources(primary, [], { maxPrimary: 40, maxSub: 18 }).map((x) => x.videoId);
  assert.deepStrictEqual(out, ["N1", "N2", "A"]);
});
