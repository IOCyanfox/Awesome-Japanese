// tv/region.js — best-effort, keyless IP -> country code. Fail-open.
// NB: detection only this iteration; nothing is filtered yet.
(function () {
  "use strict";
  async function detectCountry() {
    try {
      const r = await fetch("https://get.geojs.io/v1/ip/country.json", { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return null;
      const d = await r.json();
      return (d && d.country) ? String(d.country).toUpperCase() : null; // e.g. "JP"
    } catch (e) { return null; }
  }
  if (typeof window !== "undefined") {
    window.Region = { detectCountry };
  }
})();
