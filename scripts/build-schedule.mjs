import { parseDuration } from "./duration.mjs";
import { spawn } from "node:child_process";

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
const SHORTS_DURATION_MAX = 180; // only videos this short can be Shorts; skip the check for longer ones

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

const SHORTS_FALLBACK_MAX = 60; // when orientation is unknown, treat <= this as a Short

// Pure: should a video be kept (not a Short)? orientation is "vertical" |
// "landscape" | undefined (yt-dlp couldn't classify it).
//   - duration <= 0           -> drop (unusable: live/upcoming)
//   - duration > SHORTS_MAX   -> keep (too long to be a Short)
//   - vertical                -> drop (confirmed Short)
//   - landscape               -> keep (confirmed normal video)
//   - unknown                 -> duration floor: drop only the very short ones
export function keepVideo(durationSeconds, orientation) {
  if (durationSeconds <= 0) return false;
  if (durationSeconds > SHORTS_DURATION_MAX) return true;
  if (orientation === "vertical") return false;
  if (orientation === "landscape") return true;
  return durationSeconds > SHORTS_FALLBACK_MAX;
}

// Classify video orientation with yt-dlp (works from datacenter/CI IPs where
// scraping is bot-blocked). Returns { id: "vertical"|"landscape" }; ids yt-dlp
// can't extract are simply absent (callers treat absent as "unknown").
function ytDlpOrientations(videoIds) {
  return new Promise((resolve) => {
    if (!videoIds.length) return resolve({});
    const args = ["--skip-download", "--no-warnings", "--ignore-errors",
      "--print", "%(id)s %(width)s %(height)s", "--", ...videoIds];
    let p;
    try { p = spawn("yt-dlp", args); }
    catch (e) { return resolve({}); } // yt-dlp missing -> all unknown
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("error", () => resolve({}));
    p.on("close", () => {
      const map = {};
      for (const line of out.split("\n")) {
        const [id, w, h] = line.trim().split(/\s+/);
        if (id && /^\d+$/.test(w) && /^\d+$/.test(h)) {
          map[id] = Number(h) > Number(w) ? "vertical" : "landscape";
        }
      }
      resolve(map);
    });
  });
}

async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not set");
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg > -1 ? process.argv[outArg + 1] : "tv/schedule.json";

  // 1) Fetch each channel's recent uploads + details.
  const raw = [];
  for (const ch of CHANNELS) {
    const ids = (await uploadIds(ch.channelId, key)).reverse(); // oldest -> newest
    const details = await videoDetails(ids, key);
    // If an id was deleted/privated between the two calls, details[id] is
    // undefined → the spread is a no-op → no isoDuration → dropped by .filter. OK.
    const videos = ids.map((id) => ({ videoId: id, ...details[id] })).filter((v) => v.isoDuration);
    raw.push({ channelId: ch.channelId, name: ch.name, videos });
  }

  // 2) Classify orientation for all short-enough candidates in one yt-dlp pass.
  const candidates = raw.flatMap((ch) => ch.videos)
    .filter((v) => { const s = parseDuration(v.isoDuration); return s > 0 && s <= SHORTS_DURATION_MAX; })
    .map((v) => v.videoId);
  const orient = await ytDlpOrientations([...new Set(candidates)]);
  const verticalCount = Object.values(orient).filter((o) => o === "vertical").length;
  console.log(`Orientation: ${Object.keys(orient).length}/${candidates.length} classified, ${verticalCount} vertical`);

  // 3) Drop Shorts, keep the rest.
  const channelsData = raw.map((ch) => ({
    channelId: ch.channelId,
    name: ch.name,
    videos: ch.videos.filter((v) => keepVideo(parseDuration(v.isoDuration), orient[v.videoId])),
  }));

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
