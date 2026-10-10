import { expect, test } from '@playwright/test'
import { adminHeaders } from './admin'

// M44 guard rails, at the narrowest phone width we support (320px): no horizontal scroll on any
// storefront page, the header's controls are reachable and large enough to tap, and a cart line
// can be removed without a desktop-only control.

test.use({ viewport: { width: 320, height: 640 } })

const MIN_TAP = 44

test('no storefront page scrolls sideways at 320px', async ({ page, request }) => {
  const lamp = (
    await (await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')).json()
  ).docs[0]
  const paths = ['/', '/shop', `/product/${lamp.id}`, '/category/electronics', '/categories', '/cart', '/orders']
  for (const path of paths) {
    await page.goto(path)
    // On failure, name the elements that stick out so the message is actionable (a bare
    // "overflows by 4px" in CI cannot be debugged without a browser).
    const { overflow, offenders } = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const offenders: string[] = []
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.right <= vw + 0.5) continue
        let clipped = false // inside an overflow:hidden/auto box (e.g. the category marquee)
        for (let q = el.parentElement; q; q = q.parentElement) {
          if (q !== document.body && q !== document.documentElement && getComputedStyle(q).overflowX !== 'visible') {
            clipped = true
            break
          }
        }
        if (!clipped) {
          const text = ((el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30)
          offenders.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> right=${Math.round(r.right)} "${text}"`)
        }
      }
      return { overflow: document.documentElement.scrollWidth - vw, offenders: offenders.slice(0, 6) }
    })
    expect(
      overflow,
      `${path} overflows horizontally by ${overflow}px; elements past the edge:\n${offenders.join('\n')}`,
    ).toBeLessThanOrEqual(0)
  }
})

test('the mobile header offers shop, search and cart, each at least 44px', async ({ page }) => {
  await page.goto('/')
  const header = page.locator('nav')
  for (const target of [
    header.getByRole('link', { name: 'Shop' }),
    header.getByRole('button', { name: 'Search' }),
    header.getByRole('link', { name: /^Cart/ }),
  ]) {
    await expect(target).toBeVisible()
    const box = await target.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TAP)
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TAP - 1)
  }
})

test('a cart line can be removed on a phone', async ({ page, request }) => {
  const lamp = (
    await (await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')).json()
  ).docs[0]
  await page.goto(`/product/${lamp.id}`)
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await page.goto('/cart')
  await expect(page.getByText('Modern Table Lamp')).toBeVisible()
  await page.getByRole('button', { name: 'Remove' }).first().click()
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible()
})

test('the saved address is selected for the order without a dropdown step', async ({ page, request }) => {
  const lamp = (
    await (await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')).json()
  ).docs[0]
  await page.goto(`/product/${lamp.id}`)
  await page.getByRole('button', { name: 'Add to Cart' }).click()
  await page.goto('/cart')
  await page.getByText('Add Address').click()
  const dialog = page.getByRole('dialog', { name: 'Add new address' })
  await expect(dialog).toBeVisible()
  // The close control is a real, named button at least 44px square.
  const close = dialog.getByRole('button', { name: 'Close' })
  const box = await close.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(MIN_TAP)
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TAP)
  for (const [name, value] of Object.entries({
    name: 'Mobile Buyer',
    phone: '03001234567',
    email: 'mobile@example.com',
    address: 'House 7, Street 3, F-8/2',
    city: 'Islamabad',
    area: 'F-8',
  })) {
    await dialog.locator(`input[name="${name}"]`).fill(value)
  }
  await dialog.getByText('SAVE ADDRESS').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Mobile Buyer, House 7, Street 3, F-8/2, F-8, Islamabad')).toBeVisible()
})

// A long, unbroken product name and a seven-digit price are the realistic worst cases for a
// two-column grid and a three-column cart table at 320px. This one needs an admin to create the
// product: on a fresh database (CI) it registers the first admin; against a database that already
// has users, set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD — otherwise it is skipped, not faked.
test('a long product name and a large price do not break the 320px layout', async ({ page, request }) => {
  const headers = await adminHeaders(request)
  test.skip(!headers, 'needs a fresh database or E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD')

  const base = (await (await request.get('/api/products?limit=1&depth=0')).json()).docs[0]
  const created = await request.post('/api/products', {
    headers: headers!,
    data: {
      name: 'Supercalifragilisticexpialidocious-Wireless-Headphones-ABC123',
      description: 'Layout stress product',
      mrp: 12345678,
      price: 1234567,
      images: base.images,
      category: base.category,
      inStock: true,
    },
  })
  expect(created.status()).toBe(201)
  const id = (await created.json()).doc.id
  try {
    await page.goto(`/product/${id}`)
    await page.getByRole('button', { name: 'Add to Cart' }).click()
    for (const path of ['/shop', '/', `/product/${id}`, '/cart']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${path} overflows by ${overflow}px with a long name and a large price`).toBeLessThanOrEqual(0)
    }
  } finally {
    await request.delete(`/api/products/${id}`, { headers: headers! })
  }
})
