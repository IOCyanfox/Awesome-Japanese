// tv/settings.js — device-persisted settings model (+ modal controller, Task 4).
(function () {
  "use strict";
  const DEFAULTS = { theme: "auto", controls: true, guideHidden: false, hideRegion: true };
  const KEY = { theme: "tv-theme", controls: "tv-controls", guideHidden: "tv-guide-hidden", hideRegion: "tv-hide-region" };

  function makeStore(storage) {
    function read() {
      const out = { ...DEFAULTS };
      try {
        for (const k of Object.keys(DEFAULTS)) {
          const raw = storage.getItem(KEY[k]);
          if (raw === null || raw === undefined) continue;
          out[k] = (k === "theme") ? raw : raw === "true";
        }
      } catch (e) { return { ...DEFAULTS }; }
      return out;
    }
    function write(patch) {
      try { for (const k of Object.keys(patch)) if (KEY[k]) storage.setItem(KEY[k], String(patch[k])); } catch (e) {}
    }
    return { read, write };
  }

  const browserStore = (typeof localStorage !== "undefined")
    ? localStorage : { getItem: () => null, setItem: () => {} };
  const api = { makeStore, DEFAULTS, store: makeStore(browserStore) };
  if (typeof globalThis !== "undefined") globalThis.SettingsLib = api;
  if (typeof window !== "undefined") window.Settings = api;
})();
