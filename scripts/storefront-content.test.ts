// M110 (ADR-050): the editable storefront wording and the admin banner slides. Pure functions, no
// database: `npm run test:storefront-content`.
import assert from 'node:assert/strict'
import { DEFAULT_CONTENT, announcementList, normaliseContent } from '../lib/storefront-content'
import { adminSlidesToHero } from '../lib/hero-slides'

// Nothing saved (null, a failed read, junk): the previous wording, nothing missing.
for (const raw of [null, undefined, {}, 'x', 42, []]) assert.deepEqual(normaliseContent(raw), DEFAULT_CONTENT)

// Messages: trimmed, blanks dropped, capped at six, each at 120 characters.
const many = Array.from({ length: 9 }, (_, i) => ({ text: ` Message ${i} ` }))
const c = normaliseContent({ announcementMessages: [{ text: '  ' }, { text: 'x'.repeat(300) }, ...many, null, { text: 5 }] })
assert.equal(c.announcementMessages.length, 6)
assert.equal(c.announcementMessages[0].length, 120)
assert.equal(c.announcementMessages[1], 'Message 0')
assert.deepEqual(normaliseContent({ announcementMessages: [] }).announcementMessages, ['Cash on delivery across Pakistan'])

// Checkboxes: only an explicit false turns them off (an unsaved checkbox is undefined, so it stays on).
assert.equal(normaliseContent({}).showDeliveryMessage, true)
assert.equal(normaliseContent({ showDeliveryMessage: false }).showDeliveryMessage, false)
assert.equal(normaliseContent({ showTrackOrderLink: false }).showTrackOrderLink, false)
assert.equal(normaliseContent({ showTrackOrderLink: null }).showTrackOrderLink, true)

// Headings and footer: a saved value wins, an empty or blank one falls back.
const words = normaliseContent({ featuredTitle: '  Top picks ', featuredLinkLabel: '', newArrivalsTitle: '   ', footerTagline: 'Hello' })
assert.equal(words.featuredTitle, 'Top picks')
assert.equal(words.featuredLinkLabel, 'View all')
assert.equal(words.newArrivalsTitle, 'New arrivals')
assert.equal(words.footerTagline, 'Hello')

// The bar: admin messages first, the automatic delivery sentence last when it is on and not empty.
const delivery = 'Delivery Rs. 200 · free on orders of Rs. 3,000 or more'
assert.deepEqual(announcementList(DEFAULT_CONTENT, delivery), ['Cash on delivery across Pakistan', delivery])
assert.deepEqual(announcementList({ ...DEFAULT_CONTENT, showDeliveryMessage: false }, delivery), ['Cash on delivery across Pakistan'])
assert.deepEqual(announcementList(DEFAULT_CONTENT, '  '), ['Cash on delivery across Pakistan'])

// Admin slides: a complete slide maps; a missing word, an unsafe link or no data is skipped, never patched.
const good = {
  id: 7, title: ' Big sale ', text: 'Up to 30% off', badge: 'Sale', badgeTone: 'sale', tone: 'blue', ctaText: 'Shop', link: '/shop',
  images: [{ id: 1, url: '/api/media/file/a.webp', alt: 'A' }, { id: 2, url: '/api/media/file/b.webp' }, { id: 3, url: '/api/media/file/c.webp' }, 9, null],
}
const [slide] = adminSlidesToHero([good])
assert.equal(slide.id, 'admin-7')
assert.equal(slide.title, 'Big sale')
assert.equal(slide.badgeTone, 'sale')
assert.equal(slide.tone, 'blue')
assert.deepEqual(slide.cta, { href: '/shop', label: 'Shop' })
assert.deepEqual(slide.images, [{ url: '/api/media/file/a.webp', alt: 'A' }, { url: '/api/media/file/b.webp', alt: '' }], 'two images at most, ids and nulls ignored')
assert.equal(adminSlidesToHero([{ ...good, badgeTone: 'x', tone: 'y' }])[0].badgeTone, 'ink')
assert.equal(adminSlidesToHero([{ ...good, badgeTone: 'x', tone: 'y' }])[0].tone, 'green')
for (const link of ['https://evil.example', '//evil.example', '/\\evil', 'shop', '/a:b', '/ x', '/\t/evil.example', '']) {
  assert.equal(adminSlidesToHero([{ ...good, link }]).length, 0, `link ${JSON.stringify(link)} is skipped`)
}
for (const field of ['title', 'text', 'badge', 'ctaText']) assert.equal(adminSlidesToHero([{ ...good, [field]: '  ' }]).length, 0, `${field} is required`)
assert.equal(adminSlidesToHero([{ ...good, images: undefined }])[0].images.length, 0)
assert.deepEqual(adminSlidesToHero([]), [])

console.log('storefront-content: all checks passed')
