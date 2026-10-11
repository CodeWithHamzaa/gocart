import { expect, test } from './fixtures'
import { adminHeaders } from './admin'
import { TEST_CLIENT_IP } from './fixtures'

// ADR-036 (H3): a lost response must never become a second order. The server really processes
// the first Place Order click, but the browser never receives the answer (the usual mobile-network
// failure). The customer sees an error, the cart is still there, they press the button again, and
// the retry (same idempotency key) returns the first order. Exactly ONE order exists afterwards.

test('a lost response and a retry create one order, and the retry shows it', async ({ page, request }) => {
  const admin = await adminHeaders(request)
  test.skip(!admin, 'needs an admin to count orders (set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)')

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
    name: 'Retry Buyer',
    phone,
    email: 'retry@example.com',
    address: 'House 7, Street 3, F-10/2',
    city: 'Islamabad',
    area: 'F-10',
  })) {
    await page.locator(`form input[name="${name}"]`).fill(value)
  }
  await page.getByText('SAVE ADDRESS').click()
  await expect(page.getByText('SAVE ADDRESS')).toBeHidden()

  // The first Place Order request reaches the server and is processed; its response is dropped.
  let dropped = 0
  const bodies: string[] = []
  await page.route('**/cart', async (route) => {
    const req = route.request()
    if (req.method() === 'POST' && req.headers()['next-action']) {
      bodies.push(req.postData() ?? '')
      if (dropped === 0) {
        dropped++
        await route.fetch({ headers: { ...req.headers(), 'cf-connecting-ip': TEST_CLIENT_IP } }) // the server creates the order...
        await route.abort('failed') // ...and the browser never hears about it
        return
      }
    }
    await route.fallback() // not continue(): fallback keeps the context-level client-IP header (e2e/fixtures.ts)
  })

  const status = page.locator('[data-turnstile-status]')
  await expect(status).toHaveAttribute('data-turnstile-status', 'verified')
  await page.getByRole('button', { name: /place order/i }).click()
  await expect(page.getByText('We could not place your order. Please try again.')).toBeVisible()
  await expect(page).toHaveURL(/\/cart$/)
  expect(dropped, 'the first response was dropped').toBe(1)

  // The cart is intact and the widget renews its token; the customer presses the button again.
  await expect(status).toHaveAttribute('data-turnstile-status', 'verified')
  await page.getByRole('button', { name: /place order/i }).click()
  await expect(page).toHaveURL(/\/order-confirmation$/)
  const orderNumber = (await page.locator('body').innerText()).match(/GC-[A-Z0-9]+-[A-Z0-9]+/)?.[0]
  expect(orderNumber, 'confirmation shows the order number').toBeTruthy()

  // Both requests carried the same idempotency key.
  const keyOf = (b: string) => b.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0]
  expect(bodies.length).toBe(2)
  expect(keyOf(bodies[0]), 'an idempotency key was sent').toBeTruthy()
  expect(keyOf(bodies[1])).toBe(keyOf(bodies[0]))

  // Exactly one order exists for this phone, and it is the one the page shows.
  const orders = await (await request.get(`/api/orders?where[phone][equals]=${phone}&depth=0&limit=10`, { headers: admin! })).json()
  expect(orders.totalDocs, 'one order, not two').toBe(1)
  expect(orders.docs[0].orderNumber).toBe(orderNumber)
})
