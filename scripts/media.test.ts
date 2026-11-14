// M124: mediaUrl picks the generated size for a placement and falls back to the original file.
import assert from 'node:assert/strict'
import { mediaUrl } from '../lib/media'

const media = { id: 1, url: '/api/media/file/a.jpg', sizes: { product: { url: '/api/media/file/a-1000x1000.webp' }, category: { url: null }, hero: undefined } }

assert.equal(mediaUrl(media, 'product'), '/api/media/file/a-1000x1000.webp', 'uses the size for the placement')
assert.equal(mediaUrl(media, 'category'), '/api/media/file/a.jpg', 'a size with no url falls back to the original')
assert.equal(mediaUrl(media, 'hero'), '/api/media/file/a.jpg', 'a missing size falls back to the original')
assert.equal(mediaUrl({ id: 2, url: '/b.jpg' }, 'product'), '/b.jpg', 'media uploaded before sizes existed keeps working')
assert.equal(mediaUrl({ id: 3, url: '', sizes: null }, 'product'), null, 'an empty url is no image')
for (const bad of [null, undefined, 5, '7', 'https://x/y.jpg']) assert.equal(mediaUrl(bad, 'product'), null, `${String(bad)} is not a populated media object`)
console.log('media: all checks passed')
