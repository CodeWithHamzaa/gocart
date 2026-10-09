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

// key -> timestamps (ms) of allowed hits still inside the window
const hits = new Map<string, number[]>()
const MAX_KEYS = 10_000
let lastSweep = 0

function sweep(now: number, windowMs: number) {
  // Drop keys whose newest hit is outside the window; cheap, at most once per window.
  if (now - lastSweep < windowMs && hits.size < MAX_KEYS) return
  lastSweep = now
  for (const [key, stamps] of hits) {
    if (stamps.length === 0 || now - stamps[stamps.length - 1] >= windowMs) hits.delete(key)
  }
  // Hard cap as a last resort against a flood of distinct keys.
  if (hits.size >= MAX_KEYS) hits.clear()
}

export function rateLimit(key: string, { limit, windowMs }: Options): RateLimitResult {
  const now = Date.now()
  sweep(now, windowMs)

  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs)

  if (recent.length >= limit) {
    hits.set(key, recent)
    const retryAfterMs = recent[0] + windowMs - now
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  recent.push(now)
  hits.set(key, recent)
  return { allowed: true, retryAfterSec: 0 }
}
