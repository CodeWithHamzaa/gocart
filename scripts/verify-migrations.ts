import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'
import { migrations } from '../migrations'

// M52a: post-migration verifier, the last step of `npm run deploy:migrate` (ADR-032).
// `payload migrate` exits 0 when there are no migration files and when it meets a dev-push
// marker (batch = -1) without a TTY, so on its own it can fail open. This exits non-zero
// unless the schema is really there. It uses Payload's Local API, never a second DB client,
// and prints no connection strings or secrets.

// Never let this script push a schema: that would mask exactly what it is checking.
process.env.PAYLOAD_MIGRATING = 'true'

const migrationsDir = path.resolve(process.cwd(), 'migrations')

async function verify(): Promise<string[]> {
  const problems: string[] = []

  // Expected names come from the generated registry, so stray .json/.map/.d.ts files in
  // migrations/ cannot cause false failures.
  const registered = migrations.map((m) => m.name)
  if (registered.length === 0) {
    // Fail on the registry check before any database query, so the message is the clear one.
    return ['no migrations registered in migrations/index.ts (refusing to treat an empty schema as migrated)']
  }

  // `payload migrate` applies every .ts/.js file in the directory (not only registered ones),
  // so a file missing from the registry means the registry is stale.
  const onDisk = fs.existsSync(migrationsDir)
    ? fs
        .readdirSync(migrationsDir)
        .filter(
          (f) =>
            (f.endsWith('.ts') || f.endsWith('.js')) &&
            !f.endsWith('.d.ts') &&
            f !== 'index.ts' &&
            f !== 'index.js',
        )
        .map((f) => f.split('.')[0])
    : []
  const unregistered = onDisk.filter((name) => !registered.includes(name))
  if (unregistered.length > 0) {
    return unregistered.map((name) => `migration file ${name} is not registered in migrations/index.ts (it would never be applied)`)
  }

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'payload-migrations',
    limit: 0,
    pagination: false,
    depth: 0,
  })
  const applied = new Set(docs.map((d) => String(d.name)))

  for (const name of registered) {
    if (!applied.has(name)) problems.push(`migration ${name} has no payload_migrations row (not applied)`)
  }
  const devPushRows = docs.filter((d) => d.batch === -1).length
  if (devPushRows > 0) {
    problems.push(`payload_migrations holds ${devPushRows} dev-push row(s) (batch = -1): this database was schema-pushed, not migrated`)
  }

  for (const collection of payload.config.collections) {
    try {
      await payload.count({ collection: collection.slug, overrideAccess: true })
    } catch (error) {
      problems.push(`count on collection "${collection.slug}" failed: ${(error as Error).message.split('\n')[0]}`)
    }
  }
  for (const global of payload.config.globals) {
    try {
      await payload.findGlobal({ slug: global.slug, overrideAccess: true, depth: 0 })
    } catch (error) {
      problems.push(`read of global "${global.slug}" failed: ${(error as Error).message.split('\n')[0]}`)
    }
  }

  if (problems.length === 0) {
    console.log(
      `verify-migrations: OK - ${registered.length} migration(s) applied, ` +
        `${payload.config.collections.length} collections and ${payload.config.globals.length} global(s) readable`,
    )
  }
  return problems
}

verify()
  .then((problems) => {
    if (problems.length > 0) {
      console.error('verify-migrations: FAILED')
      for (const p of problems) console.error(`  - ${p}`)
      process.exit(1)
    }
    process.exit(0)
  })
  .catch((error: unknown) => {
    console.error(`verify-migrations: FAILED - ${(error as Error).message?.split('\n')[0] ?? 'unknown error'}`)
    process.exit(1)
  })
