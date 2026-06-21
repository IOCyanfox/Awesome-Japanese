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

  // Modal controller (browser-only). onChange(key, value) fires after persist.
  function initUI(opts) {
    opts = opts || {};
    const modal = document.getElementById("settings-modal");
    const openBtn = document.getElementById("sb-settings");
    const closeBtn = document.getElementById("set-close");
    const seg = document.getElementById("set-theme");
    const cControls = document.getElementById("set-controls");
    const cGuide = document.getElementById("set-guide-hidden");
    const cRegion = document.getElementById("set-hide-region");
    if (!modal || !openBtn) return;

    function reflect() {
      const s = api.store.read();
      seg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("on", b.dataset.themePref === s.theme));
      cControls.checked = s.controls; cGuide.checked = s.guideHidden; cRegion.checked = s.hideRegion;
    }
    function open() { reflect(); modal.hidden = false; closeBtn.focus(); }
    function close() { modal.hidden = true; openBtn.focus(); }
    function set(key, value) { api.store.write({ [key]: value }); if (opts.onChange) opts.onChange(key, value); }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
    seg.addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn"); if (!b) return;
      seg.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("on", x === b));
      set("theme", b.dataset.themePref);
    });
    cControls.addEventListener("change", () => set("controls", cControls.checked));
    cGuide.addEventListener("change", () => set("guideHidden", cGuide.checked));
    cRegion.addEventListener("change", () => set("hideRegion", cRegion.checked));
    reflect();
  }
  function setRegionNote(cc) {
    const n = document.getElementById("set-region-note");
    if (n) n.textContent = cc ? ("Detected: " + cc) : "Region unknown — showing all.";
  }
  api.initUI = initUI; api.setRegionNote = setRegionNote;

  if (typeof globalThis !== "undefined") globalThis.SettingsLib = api;
  if (typeof window !== "undefined") window.Settings = api;
})();
