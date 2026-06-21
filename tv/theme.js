// tv/theme.js — theme preference (auto/light/dark) -> applied data-theme.
(function () {
  "use strict";
  function resolveTheme(pref, prefersDark) {
    if (pref === "light" || pref === "dark") return pref;
    return prefersDark ? "dark" : "light"; // auto / unknown
  }
  let mq = null, onChange = null;
  function apply(pref) {
    const m = (typeof matchMedia === "function") ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
    document.documentElement.dataset.theme = resolveTheme(pref, m.matches);
    if (mq && onChange && mq.removeEventListener) { mq.removeEventListener("change", onChange); }
    mq = null; onChange = null;
    if (pref === "auto" && m.addEventListener) { // re-apply when the OS theme flips
      mq = m;
      onChange = () => { document.documentElement.dataset.theme = resolveTheme("auto", mq.matches); };
      mq.addEventListener("change", onChange);
    }
  }
  const api = { resolveTheme, apply };
  if (typeof globalThis !== "undefined") globalThis.ThemeLib = api;
  if (typeof window !== "undefined") window.Theme = api;
})();
