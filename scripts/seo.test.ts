// M107: the share-image picker used by the home, shop, categories and category pages.
// Pure function, no database or network: `npm run test:seo`.
import assert from 'node:assert/strict'
import { shareImages } from '../lib/seo'

const abs = (value: string) => value.startsWith('http://') || value.startsWith('https://')

// First usable candidate wins, and a site-relative URL is made absolute.
const [picked] = shareImages({ url: '/api/media/file/a.webp' }, { url: '/api/media/file/b.webp' })
assert.ok(abs(picked), 'made absolute')
assert.ok(picked.endsWith('/api/media/file/a.webp'))

// Skips values that are not images: null, undefined, ids, empty or missing urls, junk.
assert.ok(shareImages(null, undefined, 12, '', { url: null }, { url: '' }, {}, { url: 7 }, { url: '/x.webp' })[0].endsWith('/x.webp'))
assert.ok(shareImages(null, '/plain.webp')[0].endsWith('/plain.webp'), 'a URL string works too')

// An absolute URL is left alone; nothing usable gives an empty list (the page keeps the plain summary card).
assert.deepEqual(shareImages({ url: 'https://cdn.example.com/p.webp' }), ['https://cdn.example.com/p.webp'])
assert.deepEqual(shareImages(), [])
assert.deepEqual(shareImages(null, undefined, 5, { url: null }), [])
assert.equal(shareImages({ url: '/a.webp' }, { url: '/b.webp' }).length, 1, 'exactly one image')

console.log('seo: all checks passed')
