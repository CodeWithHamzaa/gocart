import { getPayload } from 'payload'
import config from '../payload.config'
import { ADMIN_BOOTSTRAP_CONTEXT } from '../collections/Users'
import { validateBootstrapCredentials } from './check-env'

// M52b/ADR-036 (B2): creates the first admin from a secret, as the last step of
// `npm run deploy:migrate`. This replaces Payload's open create-first-user flow, which
// collections/Users.ts now refuses for visitors.
//   - Users already exist  -> nothing to do (credentials in the env, if any, are ignored and
//     should be removed from the env file).
//   - No users, credentials valid -> the admin is created through the Local API with the
//     bootstrap context. The password is never printed.
//   - No users, no/invalid credentials -> exit 1: the stack must not come up with nobody able to
//     administer it (and with the open flow closed, nobody else can create the first admin).

async function main(): Promise<number> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD

  const payload = await getPayload({ config })
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs > 0) {
    console.log(
      `bootstrap-admin: ${existing.totalDocs} user(s) exist, nothing to do` +
        (email || password ? ' (ADMIN_BOOTSTRAP_* are set but unused: remove them from the env file)' : ''),
    )
    return 0
  }

  const problems = validateBootstrapCredentials(email, password, true)
  if (problems.length > 0) {
    console.error('bootstrap-admin: FAILED - no admin exists and the bootstrap credentials are not usable:')
    for (const p of problems) console.error(`  - ${p}`)
    return 1
  }

  await payload.create({
    collection: 'users',
    data: { email: email as string, password: password as string },
    overrideAccess: true,
    context: { [ADMIN_BOOTSTRAP_CONTEXT]: true },
  })
  console.log('bootstrap-admin: OK - first admin created; remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from the env file')
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(`bootstrap-admin: FAILED - ${(error as Error).message?.split('\n')[0] ?? 'unknown error'}`)
    process.exit(1)
  })
