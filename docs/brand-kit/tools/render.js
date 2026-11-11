// Mirza brand kit: renders .build/book.html to the PDF and one PNG per page.
//   node docs/brand-kit/tools/render.js <book.html> <out.pdf> <pngDir> <scale>
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

;(async () => {
  const [html, pdf, pngDir, scale = '1.5'] = process.argv.slice(2)
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {})
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(scale) })
  await page.goto('file://' + path.resolve(html), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r }))))
  })
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src))
  if (broken.length) { console.error('Broken images:', broken); process.exit(1) }
  const fontOk = await page.evaluate(() => document.fonts.check("600 20px 'Jakarta'"))
  if (!fontOk) { console.error('Plus Jakarta Sans did not load'); process.exit(1) }

  await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true })
  console.log('pdf', pdf)

  const sections = await page.$$('section.page')
  for (const s of sections) {
    const { id, slug, group } = await s.evaluate((e) => ({ id: e.id, slug: e.dataset.slug, group: e.dataset.group }))
    const dir = path.join(pngDir, group)
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${id.slice(1)}-${slug}.png`)
    await s.screenshot({ path: file })
    console.log('png', path.relative(process.cwd(), file))
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
