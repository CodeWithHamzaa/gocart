// ADR-036 (B2): the Users first-admin guard, through Payload's Local API against a REAL database
// (every HTTP path - /first-register, POST /api/users, GraphQL - ends in the same `create` operation
// and so in the same beforeOperation hook). Run after `npm run seed`: `npm run test:users-guard`.
// Leaves the users table as it found it.
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../payload.config'
import { ADMIN_BOOTSTRAP_CONTEXT } from '../collections/Users'

const payload = await getPayload({ config })
const email = (tag: string) => `guard-${tag}-${Date.now().toString(36)}@example.com`
const data = (tag: string) => ({ email: email(tag), password: 'Guard-Test-Pass-12345!' })
const saved = process.env.PAYLOAD_ALLOW_FIRST_REGISTER
const created: Array<string | number> = []
const remember = (r: { id: string | number }) => void created.push(r.id)

try {
  delete process.env.PAYLOAD_ALLOW_FIRST_REGISTER

  // 1. An unauthenticated create is refused, with access overridden exactly as registerFirstUser does.
  for (const overrideAccess of [true, false]) {
    await assert.rejects(
      () => payload.create({ collection: 'users', data: data('anon'), overrideAccess }),
      (e: Error) => /not allowed|forbidden/i.test(e.message),
      `unauthenticated create refused (overrideAccess: ${overrideAccess})`,
    )
  }
  // A spoofed-looking context value of the wrong type is not the bootstrap context.
  await assert.rejects(
    () => payload.create({ collection: 'users', data: data('spoof'), overrideAccess: true, context: { [ADMIN_BOOTSTRAP_CONTEXT]: 'true' } }),
    'a non-boolean context value does not open the guard',
  )

  // 2. The bootstrap context (server-side scripts only) is allowed.
  const boot = await payload.create({ collection: 'users', data: data('boot'), overrideAccess: true, context: { [ADMIN_BOOTSTRAP_CONTEXT]: true } })
  remember(boot)

  // 3. An authenticated admin may add another admin.
  const second = await payload.create({
    collection: 'users',
    data: data('second'),
    overrideAccess: false,
    user: { ...boot, collection: 'users' },
  })
  remember(second)

  // 4. The development/CI flag opens it, and only the exact value '1'.
  process.env.PAYLOAD_ALLOW_FIRST_REGISTER = 'true'
  await assert.rejects(() => payload.create({ collection: 'users', data: data('flag-true'), overrideAccess: true }), "only '1' enables the flag")
  process.env.PAYLOAD_ALLOW_FIRST_REGISTER = '1'
  remember(await payload.create({ collection: 'users', data: data('flag'), overrideAccess: true }))
  delete process.env.PAYLOAD_ALLOW_FIRST_REGISTER
  await assert.rejects(() => payload.create({ collection: 'users', data: data('after'), overrideAccess: true }), 'closed again once the flag is gone')
} finally {
  if (saved === undefined) delete process.env.PAYLOAD_ALLOW_FIRST_REGISTER
  else process.env.PAYLOAD_ALLOW_FIRST_REGISTER = saved
  for (const id of created) await payload.delete({ collection: 'users', id, overrideAccess: true }).catch(() => {})
}

console.log('users guard tests passed (anonymous refused, bootstrap context, authenticated admin, dev/CI flag)')
process.exit(0)
