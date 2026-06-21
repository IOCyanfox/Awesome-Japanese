import { test } from "node:test";
import assert from "node:assert";
import { parseDuration } from "./duration.mjs";

test("parses H:M:S", () => assert.strictEqual(parseDuration("PT1H2M3S"), 3723));
test("parses minutes+seconds", () => assert.strictEqual(parseDuration("PT4M5S"), 245));
test("parses seconds only", () => assert.strictEqual(parseDuration("PT45S"), 45));
test("parses hours only", () => assert.strictEqual(parseDuration("PT2H"), 7200));
test("parses zero/empty as 0", () => { assert.strictEqual(parseDuration("P0D"), 0); assert.strictEqual(parseDuration(""), 0); assert.strictEqual(parseDuration(undefined), 0); });
