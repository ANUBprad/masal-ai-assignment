const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MEMORY_CAP = 5000;
const USAGE_WARN_EVERY = 500;

const hits = new Map<string, number[]>();
let served = 0;

// Trust assumption: on Vercel's default edge, Vercel overwrites x-forwarded-for
// from the TCP connection to prevent spoofing, so the leftmost entry is the real
// client. Behind another CDN or a self-hosted origin that does not overwrite the
// header, x-forwarded-for is client-controllable and this bucket key is bypassable;
// x-real-ip is Vercel's set-from-connection equivalent. See docs/architecture.md.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

// ponytail: in-memory, per-instance limiter. It resets on cold start and is not
// shared across serverless instances, so it only blunts casual abuse of the public
// demo. Upgrade to a shared store (Vercel KV / Upstash) for a global cap. `served`
// is a coarse quota signal for the shared free-tier key, not real metrics.
export function allowRequest(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MEMORY_CAP) hits.clear();
  served += 1;
  if (served % USAGE_WARN_EVERY === 0) {
    console.warn(`[masal-ai] ${served} AI requests served this instance; check the Gemini free-tier quota.`);
  }
  return true;
}
