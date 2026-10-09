// M33: tiny in-process sliding-window rate limiter (ADR-026 decision 6). Built here
// as a shared helper because M36's guest order lookup (ADR-024) must reuse it.
// In-process state is acceptable under ADR-015's single-VPS baseline; it must be
// revisited (shared store) if the app ever runs as more than one instance.

type Options = {
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSec: number
}

type Entry = {
  stamps: number[] // ms timestamps of allowed hits, oldest first
  windowMs: number // this entry's own window, so limiters can share the map
}

const hits = new Map<string, Entry>()
const MAX_KEYS = 10_000
const MAX_KEY_LENGTH = 128
const SWEEP_INTERVAL_MS = 1000
let lastSweep = 0

function isExpired(entry: Entry, now: number): boolean {
  const newest = entry.stamps[entry.stamps.length - 1]
  return newest === undefined || now - newest >= entry.windowMs
}

function sweep(now: number) {
  // At most once per second, so a map sitting at the cap is not O(n) on every call.
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, entry] of hits) {
    if (isExpired(entry, now)) hits.delete(key)
  }
}

function evictOldestUntilBelowCap() {
  // Map preserves insertion order; re-set on each allowed hit keeps it roughly LRU.
  for (const key of hits.keys()) {
    if (hits.size < MAX_KEYS) break
    hits.delete(key)
  }
}

export function rateLimit(rawKey: string, { limit, windowMs }: Options): RateLimitResult {
  const key = rawKey.slice(0, MAX_KEY_LENGTH)
  const now = Date.now()
  sweep(now)

  const existing = hits.get(key)
  const recent = (existing?.stamps ?? []).filter((stamp) => now - stamp < windowMs)

  if (recent.length >= limit) {
    // Denied hits do not extend the lockout: nothing is appended.
    if (existing) existing.stamps = recent
    const retryAfterMs = recent[0] + windowMs - now
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  recent.push(now)
  // Delete then set moves the key to the end of insertion order.
  hits.delete(key)
  if (hits.size >= MAX_KEYS) evictOldestUntilBelowCap()
  hits.set(key, { stamps: recent, windowMs })
  return { allowed: true, retryAfterSec: 0 }
}
