// M92: the category sort/filter query parsing and the in-memory discount filter and sort. Pure
// functions, no database: `npm run test:category-filters`.
import assert from 'node:assert/strict'
import {
  applyInMemory,
  discountPercent,
  filtersToQuery,
  isRefined,
  needsInMemory,
  parseCategoryFilters,
} from '../lib/category-filters'

// Parsing: valid values pass, junk is ignored, a reversed range is swapped.
assert.deepEqual(parseCategoryFilters({}), { sort: 'rec', minPrice: undefined, maxPrice: undefined, minDiscount: undefined })
assert.equal(parseCategoryFilters({ sort: 'low' }).sort, 'low')
assert.equal(parseCategoryFilters({ sort: 'DROP TABLE' }).sort, 'rec')
assert.equal(parseCategoryFilters({ min: '-5', max: 'abc' }).minPrice, undefined)
assert.equal(parseCategoryFilters({ max: '1e9' }).maxPrice, undefined)
assert.equal(parseCategoryFilters({ max: '999999999' }).maxPrice, undefined, 'over the cap is ignored')
const swapped = parseCategoryFilters({ min: '5000', max: '1000' })
assert.deepEqual([swapped.minPrice, swapped.maxPrice], [1000, 5000])
assert.equal(parseCategoryFilters({ off: '25' }).minDiscount, 25)
assert.equal(parseCategoryFilters({ off: '33' }).minDiscount, undefined)
assert.equal(parseCategoryFilters({ off: '' }).minDiscount, undefined)

// Query round trip, and "refined" only when something is applied.
assert.equal(filtersToQuery(parseCategoryFilters({})), '')
assert.equal(isRefined(parseCategoryFilters({})), false)
assert.equal(isRefined(parseCategoryFilters({ sort: 'high' })), true)
assert.equal(filtersToQuery(parseCategoryFilters({ sort: 'low', min: '100', off: '10' }), 3), 'sort=low&min=100&off=10&page=3')

// Discount is real only when MRP is above price.
assert.equal(discountPercent({ mrp: 100, price: 75 }), 25)
assert.equal(discountPercent({ mrp: null, price: 75 }), 0)
assert.equal(discountPercent({ mrp: 50, price: 75 }), 0)
assert.equal(discountPercent({ mrp: 100, price: 100 }), 0)

const rows = [
  { id: 1, mrp: 100, price: 90 }, // 10%
  { id: 2, mrp: 100, price: 50 }, // 50%
  { id: 3, mrp: null, price: 40 }, // none
  { id: 4, mrp: 100, price: 70 }, // 30%
]
assert.equal(needsInMemory(parseCategoryFilters({ sort: 'low' })), false)
assert.equal(needsInMemory(parseCategoryFilters({ sort: 'disc' })), true)
assert.deepEqual(applyInMemory(rows, parseCategoryFilters({ off: '25' })).map((r) => r.id), [2, 4])
assert.deepEqual(applyInMemory(rows, parseCategoryFilters({ sort: 'disc' })).map((r) => r.id), [2, 4, 1, 3])
assert.deepEqual(applyInMemory(rows, parseCategoryFilters({ sort: 'disc', off: '40' })).map((r) => r.id), [2])

console.log('category-filters: ok')
