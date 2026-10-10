import { expect, test } from '@playwright/test'

// M56a: the money path, end to end, against a freshly seeded database (scripts/seed.ts):
// browse -> product detail -> add to cart -> guest checkout -> COD order created -> guest
// lookup finds it. Amounts are derived from the app's own public data (the seeded product
// and the Settings global), never hardcoded, so editing the seed prices or shipping
// defaults does not break the test — only a genuinely broken flow does.

const pkr = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-US')}`

type Product = { id: number; name: string; price: number; inStock: boolean }

async function seededProduct(
  request: import('@playwright/test').APIRequestContext,
  name: string,
): Promise<Product> {
  const res = await request.get(
    `/api/products?where[name][equals]=${encodeURIComponent(name)}&limit=1&depth=0`,
  )
  expect(res.ok(), 'products API reachable').toBeTruthy()
  const doc = (await res.json()).docs[0]
  expect(doc, `seeded product "${name}" exists — was the database seeded?`).toBeTruthy()
  return doc
}

test('golden path: browse, add to cart, guest checkout, COD order, lookup', async ({
  page,
  request,
}) => {
  const lamp = await seededProduct(request, 'Modern Table Lamp')
  const settings = await (await request.get('/api/globals/settings')).json()
  const shipping = lamp.price >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate
  const total = lamp.price + shipping

  // Browse: home and the shop listing show the real product, formatted in PKR.
  await page.goto('/')
  await expect(page.getByText('Modern Table Lamp').first()).toBeVisible()
  await page.goto('/shop')
  const card = page.locator('a[href^="/product/"]', { hasText: 'Modern Table Lamp' })
  await expect(card).toBeVisible()
  await expect(card).toContainText(pkr(lamp.price))

  // Product detail -> add to cart.
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/product/${lamp.id}$`))
  await expect(page.getByRole('heading', { name: 'Modern Table Lamp' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await page.getByRole('button', { name: 'View Cart' }).click()

  // Cart: the item, its price, and the server-consistent shipping and total.
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByText('Modern Table Lamp')).toBeVisible()
  await expect(page.getByText(pkr(lamp.price)).first()).toBeVisible()
  await expect(page.getByText(pkr(total)).first()).toBeVisible()

  // Guest checkout: a bad number is refused with a clear message, a good one is saved.
  await page.getByText('Add Address').click()
  const fill = async (fields: Record<string, string>) => {
    for (const [name, value] of Object.entries(fields)) {
      await page.locator(`form input[name="${name}"]`).fill(value)
    }
  }
  await fill({
    name: 'Test Buyer',
    phone: '04235761234', // landline-style: not accepted (ADR-029)
    email: 'e2e@example.com',
    address: 'House 5, Street 12, G-9/1',
    city: 'Islamabad',
    area: 'G-9',
  })
  await page.getByText('SAVE ADDRESS').click()
  await expect(page.getByRole('alert').filter({ hasText: 'Pakistani mobile number' })).toBeVisible()
  await fill({ phone: '+923001234567' }) // accepted, stored as 03001234567
  await page.getByText('SAVE ADDRESS').click()
  await expect(page.getByText('SAVE ADDRESS')).toBeHidden()

  // Place the Cash on Delivery order.
  await page.locator('select').selectOption({ index: 1 })
  await page.getByRole('button', { name: /place order/i }).click()
  await expect(page).toHaveURL(/\/order-confirmation$/)
  const body = page.locator('body')
  const orderNumber = (await body.innerText()).match(/GC-[A-Z0-9]+-[A-Z0-9]+/)?.[0]
  expect(orderNumber, 'confirmation shows an order number').toBeTruthy()
  await expect(body).toContainText('Modern Table Lamp')
  await expect(body).toContainText(pkr(total))

  // The order really exists: the guest lookup (order number + phone) finds it, as Placed.
  await page.goto('/orders')
  await page.locator('input[name="orderNumber"]').fill(orderNumber!)
  await page.locator('input[name="phone"]').fill('03001234567')
  await page.locator('button[type="submit"]').click()
  await expect(body).toContainText(orderNumber!)
  await expect(body).toContainText('Placed')
  await expect(body).toContainText(pkr(total))
})

test('an out-of-stock product cannot be added to the cart (M33a)', async ({ page, request }) => {
  const watch = await seededProduct(request, 'Smart Watch White')
  expect(watch.inStock).toBe(false)
  await page.goto(`/product/${watch.id}`)
  await expect(page.getByRole('button', { name: 'Out of Stock' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Add to Cart' })).toHaveCount(0)
})
