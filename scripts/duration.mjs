// scripts/duration.mjs — ISO-8601 (YouTube contentDetails.duration) -> seconds.
export function parseDuration(iso) {
  if (!iso || typeof iso !== "string") return 0;
  const m = iso.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, h, mn, s] = m;
  return (Number(h) || 0) * 3600 + (Number(mn) || 0) * 60 + (Number(s) || 0);
}
