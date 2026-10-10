import type { APIRequestContext } from '@playwright/test'

// Admin access for the tests that have to create records (a product, a category) through the
// API. On a fresh database (CI) the first admin is registered here; against a database that
// already has users, set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. Returns null when neither is
// possible, and the test then skips — it never pretends.
export async function adminHeaders(request: APIRequestContext): Promise<{ Authorization: string } | null> {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com'
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'E2e-Pass-12345!'
  const res = process.env.E2E_ADMIN_EMAIL
    ? await request.post('/api/users/login', { data: { email, password } })
    : await request.post('/api/users/first-register', { data: { email, password } })
  if (!res.ok()) return null
  return { Authorization: `JWT ${(await res.json()).token}` }
}
