import type { APIRequestContext } from '@playwright/test'

// Admin access for the tests that have to create records (a product, a category) through the
// API. On a fresh database (CI) the first admin is registered the first time this is called;
// against a database that already has users, set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
//
// The result is cached for the whole run: registration only works once (the second attempt is
// refused because a user now exists), so without the cache the second test to ask would find no
// admin and skip — and a skipped test reports as green, which is how coverage quietly disappears.
// For the same reason, when no admin can be obtained in CI this THROWS instead of returning null:
// locally a skip is fine, in CI it is a failure.

type Headers = { Authorization: string }
let cached: Promise<Headers | null> | undefined

async function obtain(request: APIRequestContext): Promise<Headers | null> {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com'
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'E2e-Pass-12345!'
  const res = process.env.E2E_ADMIN_EMAIL
    ? await request.post('/api/users/login', { data: { email, password } })
    : await request.post('/api/users/first-register', { data: { email, password } })
  if (!res.ok()) return null
  return { Authorization: `JWT ${(await res.json()).token}` }
}

export async function adminHeaders(request: APIRequestContext): Promise<Headers | null> {
  cached ??= obtain(request)
  const headers = await cached
  if (!headers && process.env.CI) {
    throw new Error(
      'CI could not obtain an admin (first-register failed: is the database not fresh?). ' +
        'These tests must run in CI, not skip.',
    )
  }
  return headers
}
