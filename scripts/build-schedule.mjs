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

const EPOCH = 1700000000; // FIXED — never change; keeps the shared clock continuous.
const MAX_ITEMS = 40;     // recent uploads per channel (window)
const CHANNELS = [
  { channelId: "UCip8ve30-AoX2y2OtAAmqFA", name: "NHK (Japanese)" },
  { channelId: "UCkLqBWFde2ZJZfqojgpDqyA", name: "日テレ公式チャンネル" },
  { channelId: "UCxpIo6FFB7gMQz2Fy2X8XdQ", name: "TBS公式 YouTuboo" },
  { channelId: "UC7_mFzmj89tqAqgpl5695QQ", name: "フジテレビ公式" },
  { channelId: "UCrEU0b3lpZyrFh7VImwWkxA", name: "tvasahi (テレビ朝日)" },
  { channelId: "UCrDj5t8Q9ZFSGft7a3PWl9g", name: "テレ東公式 TV TOKYO" },
];
const API = "https://www.googleapis.com/youtube/v3";

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// Recent upload video IDs (newest-first from API), trimmed to MAX_ITEMS.
async function uploadIds(channelId, key) {
  const list = "UU" + channelId.slice(2);
  const url = `${API}/playlistItems?part=contentDetails&maxResults=${MAX_ITEMS}&playlistId=${list}&key=${key}`;
  const d = await getJson(url);
  return (d.items || []).map((i) => i.contentDetails.videoId);
}

// title + duration + regionRestriction for up to 50 ids per call.
async function videoDetails(ids, key) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).join(",");
    const url = `${API}/videos?part=snippet,contentDetails&id=${batch}&key=${key}`;
    const d = await getJson(url);
    for (const v of d.items || []) {
      out[v.id] = {
        title: v.snippet?.title || "",
        isoDuration: v.contentDetails?.duration || "",
        regionRestriction: v.contentDetails?.regionRestriction,
      };
    }
  }
  return out;
}

async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not set");
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg > -1 ? process.argv[outArg + 1] : "tv/schedule.json";

  const channelsData = [];
  for (const ch of CHANNELS) {
    const ids = (await uploadIds(ch.channelId, key)).reverse(); // oldest -> newest
    const details = await videoDetails(ids, key);
    // If an id was deleted/privated between the two calls, details[id] is
    // undefined → the spread is a no-op → no isoDuration → dropped by .filter. OK.
    const videos = ids.map((id) => ({ videoId: id, ...details[id] })).filter((v) => v.isoDuration);
    channelsData.push({ channelId: ch.channelId, name: ch.name, videos });
  }
  const schedule = buildSchedule(channelsData, EPOCH, Math.floor(Date.now() / 1000));
  const { writeFileSync } = await import("node:fs");
  writeFileSync(outPath, JSON.stringify(schedule));
  console.log(`Wrote ${outPath}: ${Object.keys(schedule.channels).length} channels`);
}

// Run main() only when invoked directly (not when imported by tests).
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
