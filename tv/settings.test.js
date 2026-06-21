import { test } from "node:test";
import assert from "node:assert";
import "./settings.js"; // sets globalThis.SettingsLib
const { makeStore, DEFAULTS } = globalThis.SettingsLib;

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test("Settings: defaults when empty", () => {
  const s = makeStore(fakeStorage());
  assert.deepStrictEqual(s.read(), DEFAULTS);
});
test("Settings: write patch persists + round-trips", () => {
  const store = fakeStorage();
  makeStore(store).write({ theme: "dark", controls: false });
  const s2 = makeStore(store);
  assert.strictEqual(s2.read().theme, "dark");
  assert.strictEqual(s2.read().controls, false);
  assert.strictEqual(s2.read().hideRegion, true); // untouched default
});
test("Settings: tolerates a throwing store (private mode)", () => {
  const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
  const s = makeStore(bad);
  assert.deepStrictEqual(s.read(), DEFAULTS);
  s.write({ theme: "light" }); // must not throw
});
