// tv/epg.js — TV-guide (番組表) grid: vertical time, channel columns, region-grouped.
(function () {
  "use strict";
  const PPM = 10;                // pixels per minute (roomy — most clips are short)
  const WINDOW_SEC = 2 * 3600;   // 2-hour window (header height = 56px, in CSS)
  const COL_W = 130;             // channel column width
  const MIN_BLOCK = 16;          // min program-block height

  const px = (sec) => (sec / 60) * PPM;
  function el(cls) { const d = document.createElement("div"); d.className = cls; return d; }
  function hhmm(sec) {
    const d = new Date(sec * 1000);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  // Channels grouped by region order, unknown -> "Other".
  function grouped(sched, order, ja) {
    const groups = {};
    for (const id of Object.keys(sched.channels)) {
      const g = sched.channels[id].group;
      const key = order.includes(g) ? g : "Other";
      (groups[key] ||= []).push(id);
    }
    const keys = [...order.filter((g) => groups[g]), ...(groups["Other"] ? ["Other"] : [])];
    return keys.map((k) => [k + (ja[k] ? " " + ja[k] : ""), groups[k]]);
  }

  function render(container) {
    const app = window.TVApp;
    const sched = app && app.getSchedule();
    if (!sched || !sched.channels) return;
    const now = Math.floor(Date.now() / 1000);
    const board = px(WINDOW_SEC);
    container.replaceChildren();
    container.style.setProperty("--half", px(1800) + "px"); // 30-min gridline spacing
    const inner = el("epg-inner");

    // time gutter (sticky left)
    const gutter = el("epg-gutter");
    const corner = el("epg-corner"); corner.textContent = "NOW";
    const times = el("epg-times"); times.style.height = board + "px";
    for (let t = Math.ceil(now / 1800) * 1800; t < now + WINDOW_SEC; t += 1800) {
      const lab = el("epg-time"); lab.style.top = px(t - now) + "px"; lab.textContent = hhmm(t);
      times.appendChild(lab);
    }
    gutter.append(corner, times); inner.appendChild(gutter);

    // region-grouped channel columns
    for (const [label, ids] of grouped(sched, app.GROUP_ORDER, app.GROUP_LABELS_JA)) {
      const sep = el("epg-region-sep"); const s = document.createElement("span"); s.textContent = label; sep.appendChild(s);
      inner.appendChild(sep);
      for (const id of ids) {
        const ch = sched.channels[id];
        const col = el("epg-col"); col.style.width = COL_W + "px";
        const head = el("epg-col-head");
        if (ch.icon) { const im = document.createElement("img"); im.src = ch.icon; im.alt = ""; im.loading = "lazy"; head.appendChild(im); }
        const nm = el("epg-col-name"); nm.textContent = ch.name; head.appendChild(nm);
        const track = el("epg-track"); track.style.height = board + "px";
        const progs = globalThis.ScheduleLib.programsInWindow(ch, sched.epoch, now, WINDOW_SEC);
        for (const p of progs) {
          const b = document.createElement("button");
          b.className = "epg-block" + (p.live ? " live" : ""); b.type = "button"; b.title = p.title;
          const top = Math.max(0, px(p.start - now));
          const bottom = Math.min(board, px(p.end - now)); // clip at the 2h edge
          b.style.top = top + "px";
          b.style.height = Math.max(MIN_BLOCK, bottom - top) + "px";
          const tt = el("epg-title"); tt.textContent = p.title; b.appendChild(tt);
          b.addEventListener("click", () => app.tune(id));
          track.appendChild(b);
        }
        col.append(head, track); inner.appendChild(col);
      }
    }
    container.appendChild(inner);
  }

  if (typeof window !== "undefined") window.EPG = { render };
})();
