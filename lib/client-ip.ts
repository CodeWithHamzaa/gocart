import { headers } from 'next/headers'

// M33/M36: client IP for rate limiting, shared by the order-placement and order-lookup
// server actions. Server-only (reads request headers).
//
// Trusting cf-connecting-ip / x-forwarded-for is only safe once the origin is
// firewalled to Cloudflare (tracked for M49-M52); otherwise a caller can set these
// headers and the first X-Forwarded-For entry is client-controlled.
// Truncated defensively: a legitimate IPv6 address is at most 45 characters.
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const cf = h.get('cf-connecting-ip')?.trim()
  if (cf) return cf.slice(0, 64)
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded.slice(0, 64)
  return 'unknown'
}
