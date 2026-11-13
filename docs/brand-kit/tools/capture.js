// Mirza brand kit: screenshot capture (development-time tooling, not part of the app).
// Captures the live TEST storefront at desktop, tablet and phone viewports with Playwright.
//
//   node docs/brand-kit/tools/capture.js [baseUrl]
//
// Output: docs/brand-kit/source-assets/screenshots/{desktop,tablet,mobile}/*.png
// Redaction: the footer "Contact" column (phone, email, city) is hidden before every capture
// so personal contact details never end up in client-facing material. Nothing else is altered.
import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE = process.argv[2] || 'https://gocart-test-inky.vercel.app'
const OUT = path.resolve(__dirname, '../source-assets/screenshots')

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  // Hide the footer contact column (privacy redaction) and any scrollbar.
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')) a.style.visibility = 'hidden'
    for (const h of document.querySelectorAll('footer h2, footer h3, footer h4, footer p, footer span')) {
      if (h.textContent.trim().toLowerCase() === 'contact') {
        const col = h.parentElement
        if (col) col.style.visibility = 'hidden'
      }
    }
    const s = document.createElement('style')
    s.textContent = '::-webkit-scrollbar{display:none} html{scrollbar-width:none}'
    document.head.appendChild(s)
  })
  // Wait for every image on the page to decode (lazy ones are forced to eager first).
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'))
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r }))))
  })
  await page.waitForTimeout(600)
}

async function scrollToText(page, text, offset = 90, last = false) {
  await page.evaluate(({ text, offset, last }) => {
    const all = [...document.querySelectorAll('h1,h2,h3')].filter((e) => e.textContent.trim().startsWith(text))
    const el = last ? all[all.length - 1] : all[0]
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset)
  }, { text, offset, last })
  await page.waitForTimeout(700)
}

// Guard: refuse to save a capture if any contact detail is still visible (e.g. the footer markup
// changed and the redaction above no longer matches). Visibility is inherited, so the computed
// style of the element holding the text is enough.
async function assertRedacted(page) {
  const leaks = await page.evaluate(() => {
    const visible = (el) => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'
    const out = []
    for (const a of document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')) if (visible(a)) out.push(a.getAttribute('href'))
    const pattern = /[\w.+-]+@[\w-]+\.[\w.]+|\b0\d{3}[-\s]?\d{7}\b|\+92/
    for (const el of document.querySelectorAll('footer *')) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')
      if (pattern.test(own) && visible(el)) out.push(own.trim())
    }
    return out
  })
  if (leaks.length) throw new Error(`Contact details still visible, capture aborted: ${leaks.length} element(s)`)
}

async function shot(page, kind, name, opts = {}) {
  await assertRedacted(page)
  const file = path.join(OUT, kind, `${name}.png`)
  await page.screenshot({ path: file, ...opts })
  console.log('saved', path.relative(process.cwd(), file))
}

async function go(page, url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

// Cart and wishlist live in the browser's localStorage (app/StoreProvider.js): the cart is
// { productId: quantity }, the wishlist an array of ids. Writing them directly is the same state a
// shopper creates by pressing "Add to cart" / the heart, without depending on button timing.
async function setStorage(page, key, value) {
  await go(page, '/')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(value)])
}
const fillCart = (page) => setStorage(page, 'gocart:cart', { 1: 1, 9: 1, 13: 2 })
const fillWishlist = (page) => setStorage(page, 'gocart:wishlist', ['5', '12', '20', '1'])

;(async () => {
  for (const k of Object.keys(VIEWPORTS)) fs.mkdirSync(path.join(OUT, k), { recursive: true })
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {})

  // Desktop
  {
    const ctx = await browser.newContext(VIEWPORTS.desktop)
    const p = await ctx.newPage()
    await go(p, '/'); await shot(p, 'desktop', 'home-hero')
    await shot(p, 'desktop', 'home-full', { fullPage: true })
    // Section boxes (CSS px, page coordinates) inside home-full, so the book can crop whole sections.
    const boxes = await p.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height) } }
      const sec = (text, last) => {
        const hs = [...document.querySelectorAll('h2')].filter((e) => e.textContent.trim().startsWith(text))
        const h = last ? hs[hs.length - 1] : hs[0]
        return h ? box(h.closest('section') || h.parentElement.parentElement) : null
      }
      const promo = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Summer Sale'))
      return { deals: sec('Limited-time deals'), featured: sec('Featured'), newArrivals: sec('New arrivals', true),
               promos: promo ? box(promo.parentElement) : null }
    })
    fs.writeFileSync(path.join(OUT, 'desktop', 'home-sections.json'), JSON.stringify(boxes, null, 2))
    console.log('sections', JSON.stringify(boxes))
    await scrollToText(p, 'Limited-time deals'); await shot(p, 'desktop', 'home-deals')
    await scrollToText(p, 'Featured'); await shot(p, 'desktop', 'home-featured')
    await scrollToText(p, 'New arrivals', 330, true); await shot(p, 'desktop', 'home-promos')
    await scrollToText(p, 'New arrivals', 90, true); await shot(p, 'desktop', 'home-new-arrivals')
    await go(p, '/shop'); await shot(p, 'desktop', 'shop')
    await shot(p, 'desktop', 'shop-full', { fullPage: true })
    await go(p, '/categories'); await shot(p, 'desktop', 'categories')
    await go(p, '/category/watches'); await shot(p, 'desktop', 'category-watches')
    await go(p, '/category/fragrances'); await shot(p, 'desktop', 'category-fragrances')
    await go(p, '/product/1'); await shot(p, 'desktop', 'product-headphones')
    for (const id of [5, 9, 12, 13, 16, 20]) { await go(p, `/product/${id}`); await shot(p, 'desktop', `product-${id}`) }
    await fillCart(p, [1, 9, 16])
    await go(p, '/cart'); await shot(p, 'desktop', 'cart')
    await shot(p, 'desktop', 'cart-full', { fullPage: true })
    await go(p, '/orders'); await shot(p, 'desktop', 'orders-lookup')
    await fillWishlist(p)
    await go(p, '/wishlist'); await shot(p, 'desktop', 'wishlist')
    await ctx.close()
  }

  // Tablet
  {
    const ctx = await browser.newContext(VIEWPORTS.tablet)
    const p = await ctx.newPage()
    await go(p, '/'); await shot(p, 'tablet', 'home')
    await go(p, '/shop'); await shot(p, 'tablet', 'shop')
    await go(p, '/product/1'); await shot(p, 'tablet', 'product-headphones')
    await ctx.close()
  }

  // Mobile
  {
    const ctx = await browser.newContext(VIEWPORTS.mobile)
    const p = await ctx.newPage()
    await go(p, '/'); await shot(p, 'mobile', 'home-hero')
    await scrollToText(p, 'Limited-time deals', 28); await shot(p, 'mobile', 'home-deals')
    await scrollToText(p, 'Featured', 28); await shot(p, 'mobile', 'home-featured')
    await scrollToText(p, 'New arrivals', 360, true); await shot(p, 'mobile', 'home-promos')
    await scrollToText(p, 'New arrivals', 70, true); await shot(p, 'mobile', 'home-new-arrivals')
    await scrollToText(p, 'Order now', 120); await shot(p, 'mobile', 'home-cod')
    await go(p, '/shop'); await shot(p, 'mobile', 'shop')
    await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(600); await shot(p, 'mobile', 'shop-scrolled')
    await go(p, '/categories'); await shot(p, 'mobile', 'categories')
    await go(p, '/category/watches'); await shot(p, 'mobile', 'category-watches')
    await go(p, '/category/fragrances'); await shot(p, 'mobile', 'category-fragrances')
    for (const id of [1, 9, 16, 20]) {
      await go(p, `/product/${id}`); await shot(p, 'mobile', `product-${id}`)
      await p.evaluate(() => window.scrollTo(0, 560)); await p.waitForTimeout(500); await shot(p, 'mobile', `product-${id}-info`)
    }
    await fillCart(p, [1, 9, 16])
    await go(p, '/cart'); await shot(p, 'mobile', 'cart')
    await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(500); await shot(p, 'mobile', 'cart-scrolled')
    await go(p, '/orders'); await shot(p, 'mobile', 'orders-lookup')
    await fillWishlist(p)
    await go(p, '/wishlist'); await shot(p, 'mobile', 'wishlist')
    await ctx.close()
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
