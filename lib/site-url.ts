// The site's public origin, driven only by NEXT_PUBLIC_SITE_URL so the (not yet final)
// domain can be swapped by changing the environment, never the code. When unset or
// invalid it falls back to the local dev origin; set it for any real deployment.
// Safe in server and client code; returns an origin with no trailing slash.
const FALLBACK = 'http://localhost:3000'

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return FALLBACK
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return FALLBACK
    return url.origin
  } catch {
    return FALLBACK
  }
}
