import { test } from "node:test";
import assert from "node:assert";
import "./theme.js"; // sets globalThis.ThemeLib
const { resolveTheme } = globalThis.ThemeLib;

test("resolveTheme: explicit wins", () => {
  assert.strictEqual(resolveTheme("light", true), "light");
  assert.strictEqual(resolveTheme("dark", false), "dark");
});
test("resolveTheme: auto follows system", () => {
  assert.strictEqual(resolveTheme("auto", true), "dark");
  assert.strictEqual(resolveTheme("auto", false), "light");
});
test("resolveTheme: unknown -> auto behavior", () => {
  assert.strictEqual(resolveTheme(undefined, true), "dark");
  assert.strictEqual(resolveTheme(undefined, false), "light");
});
