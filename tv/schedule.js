// tv/schedule.js — pure simulated-live scheduling math.
(function () {
  "use strict";
  function currentProgram(sched, epoch, nowSeconds) {
    if (!sched || !sched.items || !sched.items.length || !sched.total) return null;
    const total = sched.total;
    let elapsed = ((nowSeconds - epoch) % total + total) % total; // always [0,total)
    let acc = 0;
    for (let i = 0; i < sched.items.length; i++) {
      const it = sched.items[i];
      if (elapsed < acc + it.duration) {
        return { videoId: it.videoId, title: it.title || "", index: i, offset: Math.floor(elapsed - acc) };
      }
      acc += it.duration;
    }
    const last = sched.items[sched.items.length - 1];
    return { videoId: last.videoId, title: last.title || "", index: sched.items.length - 1, offset: 0 };
  }
  const api = { currentProgram };
  if (typeof globalThis !== "undefined") globalThis.ScheduleLib = api;
})();
