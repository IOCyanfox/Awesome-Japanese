import { parseDuration } from "./duration.mjs";

// Pure: fetched per-channel data -> schedule.json object.
export function buildSchedule(channelsData, epoch, generatedAt) {
  const channels = {};
  for (const ch of channelsData) {
    const items = [];
    for (const v of ch.videos) {
      const duration = parseDuration(v.isoDuration);
      if (duration <= 0) continue; // unusable (live/upcoming/0) -> skip
      const rr = v.regionRestriction || {};
      items.push({
        videoId: v.videoId,
        title: v.title || "",
        duration,
        blocked: Array.isArray(rr.blocked) ? rr.blocked : [],
        allowed: Array.isArray(rr.allowed) ? rr.allowed : [],
      });
    }
    if (!items.length) continue;
    const total = items.reduce((s, it) => s + it.duration, 0);
    channels[ch.channelId] = { name: ch.name, total, items };
  }
  return { epoch, generatedAt, channels };
}
