// Mirza brand kit: element-level captures of real storefront UI (product cards, header, hero,
// category shortcuts, promo card) for the brand-guideline pages. Same rules as capture.cjs.
//
//   node docs/brand-kit/tools/capture-elements.cjs [baseUrl]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = process.argv[2] || 'https://gocart-test-inky.vercel.app'
const OUT = path.resolve(__dirname, '../source-assets/screenshots/elements')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {})
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })
  const save = async (loc, name) => {
    await loc.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await loc.screenshot({ path: path.join(OUT, `${name}.png`) })
    console.log('saved', name)
  }
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  const cards = page.locator('main article')
  const names = await cards.allInnerTexts()
  const find = (re) => names.findIndex((t) => re.test(t))
  await save(cards.nth(find(/Limited edition/)), 'card-limited')
  await save(cards.nth(find(/Out of stock/)), 'card-out-of-stock')
  await save(cards.nth(find(/Aloe/)), 'card-sale')
  await save(cards.nth(find(/^New|\nNew\n/)), 'card-new')

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await save(page.locator('header').first(), 'header')
  await save(page.locator('main section').first(), 'hero')
  const promo = page.getByText('Summer Sale on Electronics').locator('xpath=ancestor::a[1]')
  if (await promo.count()) await save(promo.first(), 'promo-card')
  const chips = page.locator('main ul, main nav, main div')
    .filter({ has: page.getByRole('link', { name: /Bags/ }) })
    .filter({ has: page.getByRole('link', { name: /Sunglasses/ }) })
    .filter({ hasNot: page.locator('h1, h2, article') })
  await save(chips.last(), 'category-shortcuts')
  // Footer: only the top "trust" band (three promises). The contact column below it is never captured.
  const footer = page.locator('footer').first()
  await footer.scrollIntoViewIfNeeded()
  const label = page.locator('footer').getByText('No account needed').first()
  const fb = await footer.boundingBox(); const lb = await label.boundingBox()
  await page.screenshot({ path: path.join(OUT, 'trust-strip.png'), clip: { x: fb.x, y: fb.y, width: fb.width, height: lb.y + lb.height - fb.y + 24 } })
  console.log('saved trust-strip')
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
