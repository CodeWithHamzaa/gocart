// M52b/ADR-036: client-side idempotency key for one checkout attempt. Safe in client code (no
// imports). 128 random bits from the browser's CSPRNG: unguessable, so the key itself is what lets
// a retry find the order it created. Matches IDEMPOTENCY_KEY_PATTERN in lib/order-guard.ts.
export function newIdempotencyKey(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes) // throws if there is no CSPRNG: better no key than a weak one
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
