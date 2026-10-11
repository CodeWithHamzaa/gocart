import { isIP } from 'node:net'
import { headers } from 'next/headers'

// M33/M36, tightened in M52 (ADR-033): client IP for rate limiting, shared by the
// order-placement and order-lookup server actions. Server-only (reads request headers).
//
// Production: the only way to reach the app is the Cloudflare Tunnel (docker-compose.prod.yml:
// no published ports), so cf-connecting-ip was written by Cloudflare's edge and a visitor cannot
// set it. Only that header is trusted, and only when it is a valid IPv4/IPv6 address.
// x-forwarded-for is ignored: Cloudflare appends to a client-supplied value, so its first entry
// stays attacker-controlled. A missing or malformed header yields the shared 'unknown' key,
// which fails closed (a stricter shared limit, never a bypass).
//
// This does NOT hold if a second ingress to the app is ever added (a published port, another
// tunnel route, another member of the app's network), or if the zone removes visitor IP headers.
//
// IPv6 clients are keyed by their /64 prefix (one visitor routinely controls a whole /64, so
// per-address keys would let them mint unlimited buckets). IPv4-mapped IPv6 is keyed as the
// IPv4 address. Zoned addresses (%eth0) are rejected.
//
// Outside production (dev, tests) the old lenient behaviour is kept so local runs work.
// normalizeIp validates with isIP (non-production keeps the raw value, cut to 64 characters).
// Production keys: IPv4 as is, IPv6 as its /64, IPv4-mapped IPv6 as the IPv4 address; zoned or
// garbage values give 'unknown'; x-forwarded-for is never read.
// Expands an IPv6 address to 8 groups of 16 bits, or null if it is not valid. Assumes isIP() === 6.
function ipv6Groups(addr: string): number[] | null {
  let text = addr.toLowerCase()
  const dotted = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    const o = dotted[2].split('.').map(Number)
    text = `${dotted[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail].map((g) =>
    parseInt(g, 16),
  )
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null
}

// Valid address -> rate-limit key ('a.b.c.d' or 'x:x:x:x::/64'); anything else -> null.
export function normalizeIp(raw: string): string | null {
  if (raw.includes('%')) return null
  const kind = isIP(raw)
  if (kind === 4) return raw
  if (kind !== 6) return null
  const g = ipv6Groups(raw)
  if (!g) return null
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`
  }
  return `${g.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64`
}

export function selectClientIp(get: (name: string) => string | null, production: boolean): string {
  const cf = get('cf-connecting-ip')?.trim()
  if (production) return (cf && normalizeIp(cf)) || 'unknown'
  if (cf) return cf.slice(0, 64)
  const forwarded = get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded.slice(0, 64)
  return 'unknown'
}

export async function getClientIp(): Promise<string> {
  const h = await headers()
  return selectClientIp((name) => h.get(name), process.env.NODE_ENV === 'production')
}

// M52b (ADR-035 decision 3): the address sent to Turnstile siteverify as `remoteip`. Only in
// production, and only the raw cf-connecting-ip when it is a valid address (same validation
// as normalizeIp) — never the /64 rate-limit key, never 'unknown', never x-forwarded-for.
// Otherwise null, and remoteip is left out of the request.
export function selectVerifyIp(get: (name: string) => string | null, production: boolean): string | null {
  if (!production) return null
  const cf = get('cf-connecting-ip')?.trim()
  return cf && normalizeIp(cf) ? cf : null
}

export async function getVerifyIp(): Promise<string | null> {
  const h = await headers()
  return selectVerifyIp((name) => h.get(name), process.env.NODE_ENV === 'production')
}
