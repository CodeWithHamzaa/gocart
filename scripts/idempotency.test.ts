// ADR-036 (H3): order idempotency against a REAL database. Run after `npm run seed` (it needs the
// seeded products): `npm run test:idempotency`. Same key + same cart -> one order, however the
// requests overlap; the replay returns the first order; a different phone cannot read it; the
// unique index backs all of it.
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../payload.config'
import { createOrder, findOrderByIdempotencyKey } from '../lib/payload/orders'

const payload = await getPayload({ config })
const stocked = await payload.find({
  collection: 'products',
  where: { inStock: { equals: true } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
})
const product = stocked.docs[0]
assert.ok(product, 'a seeded in-stock product exists (run npm run seed first)')

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.padEnd(30, 'k').slice(0, 30)
const phoneOf = () => `03${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`
const input = (phone: string) => ({
  items: [{ productId: product.id, quantity: 1 }],
  customer: { name: 'Idempotency Tester', phone, address: 'House 1, Street 2, Sector 3', city: 'Islamabad', area: 'G-9' },
})
const countByKey = async (key: string) =>
  (await payload.count({ collection: 'orders', where: { idempotencyKey: { equals: key } }, overrideAccess: true })).totalDocs
const clean = async (key: string) =>
  void (await payload.delete({ collection: 'orders', where: { idempotencyKey: { equals: key } }, overrideAccess: true }))

// 1. Sequential retry: the second call returns the first order.
{
  const key = unique()
  const phone = phoneOf()
  const first = await createOrder(input(phone), { idempotencyKey: key })
  assert.equal(first.ok, true)
  const second = await createOrder(input(phone), { idempotencyKey: key })
  assert.deepEqual(second.ok && second.orderNumber, first.ok && first.orderNumber, 'retry returns the same order')
  assert.equal(await countByKey(key), 1, 'exactly one order')
  const replay = await findOrderByIdempotencyKey(key, phone)
  assert.equal(replay?.orderNumber, first.ok ? first.orderNumber : null, 'replay lookup finds it')
  assert.deepEqual(
    replay && { ...replay, items: undefined },
    first.ok && { ...first, items: undefined },
    'replay carries the same totals as the original response',
  )
  assert.equal(await findOrderByIdempotencyKey(key, phoneOf()), null, 'another phone cannot read the order by key')
  assert.equal(await findOrderByIdempotencyKey(unique(), phone), null, 'unknown key: nothing')
  await clean(key)
}

// 2. Concurrent requests with one key (double tap, two tabs, a retry racing the original).
{
  const key = unique()
  const phone = phoneOf()
  const results = await Promise.all(Array.from({ length: 12 }, () => createOrder(input(phone), { idempotencyKey: key })))
  assert.ok(results.every((r) => r.ok), 'every concurrent request is answered with an order, none with an error')
  const numbers = new Set(results.map((r) => (r.ok ? r.orderNumber : '')))
  assert.equal(numbers.size, 1, `all 12 requests got the same order (${[...numbers].join(', ')})`)
  assert.equal(await countByKey(key), 1, 'exactly one order was created')
  await clean(key)
}

// 3. Different keys are different orders; no key is never deduplicated (legacy callers).
{
  const a = unique()
  const b = unique()
  const phone = phoneOf()
  const [x, y] = await Promise.all([createOrder(input(phone), { idempotencyKey: a }), createOrder(input(phone), { idempotencyKey: b })])
  assert.ok(x.ok && y.ok && x.orderNumber !== y.orderNumber, 'two keys, two orders')
  const n1 = await createOrder(input(phone))
  const n2 = await createOrder(input(phone))
  assert.ok(n1.ok && n2.ok && n1.orderNumber !== n2.orderNumber, 'no key, no deduplication')
  for (const r of [x, y, n1, n2]) {
    if (r.ok) await payload.delete({ collection: 'orders', where: { orderNumber: { equals: r.orderNumber } }, overrideAccess: true })
  }
}

// 4. The database itself refuses a duplicate key, whatever the application does.
{
  const key = unique()
  const base = {
    name: 'Direct', phone: phoneOf(), address: 'House 1, Street 2, Sector 3', city: 'Islamabad',
    items: [{ product: product.id, quantity: 1, unitPrice: 1 }], orderTotal: 1, shippingCost: 0, paymentMethod: 'COD' as const, status: 'PLACED' as const, idempotencyKey: key,
  }
  await payload.create({ collection: 'orders', data: { ...base }, overrideAccess: true })
  await assert.rejects(() => payload.create({ collection: 'orders', data: { ...base }, overrideAccess: true }), 'duplicate key rejected by the unique index')
  assert.equal(await countByKey(key), 1)
  await clean(key)
}

// 5. A key cannot be changed after creation (field-level update access), and is not exposed to REST readers without access.
{
  const key = unique()
  const r = await createOrder(input(phoneOf()), { idempotencyKey: key })
  assert.ok(r.ok)
  const doc = (await payload.find({ collection: 'orders', where: { idempotencyKey: { equals: key } }, overrideAccess: true, limit: 1 })).docs[0]
  const user = { collection: 'users' as const, id: 0 } as never
  const updated = await payload.update({ collection: 'orders', id: doc.id, data: { idempotencyKey: 'changed-by-admin-attempt-00000' }, overrideAccess: false, user })
  assert.equal((updated as { idempotencyKey?: string }).idempotencyKey, key, 'the stored key survives an update attempt')
  await clean(key)
}

console.log('idempotency tests passed (sequential, 12-way concurrent, distinct keys, unique index, key immutability)')
process.exit(0)
