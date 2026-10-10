import { expect, test } from '@playwright/test'

// M40–M43 guard rails: what a crawler gets from a plain HTTP request (no JavaScript), the
// per-page metadata, the sitemap and robots files, and the product structured data. These
// use the `request` fixture on purpose — it never runs the page's scripts, which is exactly
// the point. The site origin comes from the same env var the app reads.

const SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin
const meta = (html: string, attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta[^>]+${attr}="${key}"[^>]*content="([^"]*)"`))?.[1]
const canonical = (html: string) => html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/)?.[1]

test('the home page ships products and category links in the initial HTML (M40)', async ({
  request,
}) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('Modern Table Lamp')
  expect(html).toContain('href="/category/electronics"')
  expect(html).toContain('href="/category/speakers"')
})

test('a product page has its own metadata and a valid Product JSON-LD (M41, M43)', async ({
  request,
}) => {
  const list = await (
    await request.get('/api/products?where[name][equals]=Modern%20Table%20Lamp&limit=1&depth=0')
  ).json()
  const product = list.docs[0]
  const res = await request.get(`/product/${product.id}`)
  expect(res.status()).toBe(200)
  const html = await res.text()

  expect(html).toMatch(/<title>Modern Table Lamp \| [^<]+<\/title>/)
  expect(canonical(html)).toBe(`${SITE}/product/${product.id}`)
  expect(meta(html, 'property', 'og:type')).toBe('website')
  expect(meta(html, 'property', 'og:locale')).toBe('en_PK')
  expect(meta(html, 'name', 'description')?.length ?? 0).toBeGreaterThan(0)
  expect(meta(html, 'name', 'robots') ?? '').not.toContain('noindex')

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  expect(blocks).toHaveLength(1)
  expect(blocks[0][1]).not.toContain('<') // a "<" is always escaped, so no value can close the tag
  const ld = JSON.parse(blocks[0][1])
  expect(ld['@type']).toBe('Product')
  expect(ld.name).toBe('Modern Table Lamp')
  expect(ld.offers).toMatchObject({
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'PKR',
    availability: 'https://schema.org/InStock',
    url: `${SITE}/product/${product.id}`,
  })
})

test('robots.txt and sitemap.xml are valid and every sitemap URL resolves (M42)', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /admin')
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)

  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const xml = await res.text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  expect(urls).toContain(`${SITE}/shop`)
  expect(urls.some((u) => u.includes('/product/'))).toBe(true)
  expect(urls.some((u) => u.includes('/category/'))).toBe(true)
  expect(new Set(urls).size).toBe(urls.length)
  for (const url of urls) {
    expect(url.startsWith(`${SITE}/`) || url === SITE).toBe(true)
    const path = url.slice(SITE.length) || '/'
    expect((await request.get(path)).status(), `${path} should be 200`).toBe(200)
  }
})

test('private and transactional pages are noindex (M41)', async ({ request }) => {
  for (const path of ['/cart', '/orders', '/order-confirmation']) {
    const html = await (await request.get(path)).text()
    expect(meta(html, 'name', 'robots'), `${path} robots meta`).toContain('noindex')
  }
  const search = await (await request.get('/shop?search=lamp')).text()
  expect(meta(search, 'name', 'robots')).toContain('noindex')
  expect(canonical(search)).toBe(`${SITE}/shop`)
})
