import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// M52b / ADR-036 (strict policy): when Cloudflare's Turnstile script cannot load, the widget
// reports `failed` within 10 s, the submit buttons STAY DISABLED, the page says the check could not
// load and to contact the store, and no order is created. There is no unverified path.
// Does not depend on Cloudflare: page.route blocks challenges.cloudflare.com. Expects the same
// build as the golden path (a Turnstile site key inlined), otherwise the widget is `disabled`.
// Also checks that no indexable page loads anything from Cloudflare's challenge host.

const CHALLENGE_HOST = 'https://challenges.cloudflare.com/**'
const status = (page: Page) => page.locator('[data-turnstile-status]')

test('Turnstile unreachable: no order and no lookup can be made', async ({ page, request }) => {
  // Cart: the script request fails outright (blocked host, DNS failure).
  await page.route(CHALLENGE_HOST, (route) => route.abort('connectionrefused'))

  const lamp = (
    await (await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')).json()
  ).docs[0]
  const digits = String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
  const phone = `03${digits}`

  await page.goto(`/product/${lamp.id}`)
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await page.goto('/cart')
  await page.getByText('Add Address').click()
  for (const [name, value] of Object.entries({
    name: 'Fallback Buyer',
    phone,
    email: 'fallback@example.com',
    address: 'House 9, Street 4, I-8/3',
    city: 'Islamabad',
    area: 'I-8',
  })) {
    await page.locator(`form input[name="${name}"]`).fill(value)
  }
  await page.getByText('SAVE ADDRESS').click()
  await expect(page.getByText('SAVE ADDRESS')).toBeHidden()

  await expect(status(page)).toHaveAttribute('data-turnstile-status', 'failed', { timeout: 11_000 })
  await expect(page.getByText("The security check couldn't load", { exact: false })).toBeVisible()
  await expect(page.getByText('contact us', { exact: false }).first()).toBeVisible()
  const placeOrder = page.getByRole('button', { name: /place order/i })
  await expect(placeOrder).toBeDisabled()
  // Even a forced click on the disabled button must not place anything.
  await placeOrder.click({ force: true, timeout: 2_000 }).catch(() => {})
  await expect(page).toHaveURL(/\/cart$/)

  // Lookup: the script request hangs instead, so only the 10-second cap ends the wait.
  await page.unroute(CHALLENGE_HOST)
  await page.route(CHALLENGE_HOST, () => {}) // never answered
  await page.goto('/orders')
  await expect(status(page)).toHaveAttribute('data-turnstile-status', 'loading')
  await expect(page.locator('button[type="submit"]')).toBeDisabled()
  await expect(page.getByText('Running a quick security check…')).toBeVisible()
  await expect(status(page)).toHaveAttribute('data-turnstile-status', 'failed', { timeout: 11_500 })
  await expect(page.locator('button[type="submit"]')).toBeDisabled()
  await expect(page.getByText("The security check couldn't load", { exact: false })).toBeVisible()
})

test('indexable pages never load Turnstile', async ({ page, request }) => {
  const contacted: string[] = []
  page.on('request', (req) => {
    if (req.url().startsWith('https://challenges.cloudflare.com/')) contacted.push(req.url())
  })
  const lamp = (
    await (await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')).json()
  ).docs[0]
  for (const path of ['/', '/shop', `/product/${lamp.id}`, '/categories', '/category/electronics']) {
    await page.goto(path, { waitUntil: 'networkidle' })
  }
  expect(contacted, 'requests to challenges.cloudflare.com from indexable pages').toEqual([])
  // Sanity check that the listener works: /orders does load it.
  await page.goto('/orders')
  await expect.poll(() => contacted.length).toBeGreaterThan(0)
})
