import { getPayload } from 'payload'
import config from '../payload.config'
import { APP_DB_PASSWORD_PATTERN, APP_DB_USER } from './check-env'

// M52b/ADR-036 (H4): separates the database roles. The migrate step connects as the Postgres
// superuser (DATABASE_URI; it exists only in that one-shot, internal-network container); the
// running app connects as APP_DB_USER, a role that can read and write rows but cannot change the
// schema, create roles or objects, run server-side programs, or tamper with migration history.
// A compromised app (for example through a framework vulnerability) therefore gets row access
// to this one database, not control of the database server or its host.
// Idempotent: runs after `payload migrate` on every deploy, so new tables are granted too.
// The password is the only interpolated value and check-env restricts its alphabet; it is never
// printed. Uses the Payload adapter's own pool, so no second database client.

async function main(): Promise<number> {
  const password = process.env.APP_DB_PASSWORD
  if (!password || !APP_DB_PASSWORD_PATTERN.test(password)) {
    console.error('db-roles: FAILED - APP_DB_PASSWORD is missing or has characters outside A-Z a-z 0-9 - . _ ~')
    return 1
  }

  const payload = await getPayload({ config })
  const pool = (payload.db as unknown as { pool: { query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }> } }).pool
  const run = (sql: string) => pool.query(sql)
  const role = APP_DB_USER
  const flags = 'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20'

  await run(
    `DO $do$ BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN
         CREATE ROLE ${role} ${flags} PASSWORD '${password}';
       END IF;
     END $do$`,
  )
  await run(`ALTER ROLE ${role} WITH ${flags} PASSWORD '${password}'`)
  await run(`ALTER ROLE ${role} SET statement_timeout = '30s'`)
  await run(`ALTER ROLE ${role} SET idle_in_transaction_session_timeout = '60s'`)

  // Database: only this role (and the owner) may connect; no temp objects for the app role.
  await run(
    `DO $do$ BEGIN
       EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
       EXECUTE format('REVOKE ALL ON DATABASE %I FROM ${role}', current_database());
       EXECUTE format('GRANT CONNECT ON DATABASE %I TO ${role}', current_database());
     END $do$`,
  )
  // Schema: use only, never create.
  await run('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
  await run(`REVOKE ALL ON SCHEMA public FROM ${role}`)
  await run(`GRANT USAGE ON SCHEMA public TO ${role}`)
  // Rows: read and write everything the app owns; no TRUNCATE/REFERENCES/TRIGGER.
  await run(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}`)
  await run(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`)
  await run(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${role}`)
  await run(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`)
  // Migration history is read-only for the app.
  await run(`REVOKE INSERT, UPDATE, DELETE ON TABLE payload_migrations FROM ${role}`)
  // Objects created later by this (migrating) user are granted the same way.
  await run(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`)
  await run(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`)

  // Verify what was just set, from the catalogue.
  const check = await run(
    `SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
            has_schema_privilege('${role}', 'public', 'CREATE') AS can_create
       FROM pg_roles WHERE rolname = '${role}'`,
  )
  const r = check.rows[0]
  if (!r || r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.rolreplication || r.rolbypassrls || r.can_create) {
    console.error('db-roles: FAILED - the app role is more privileged than intended')
    return 1
  }
  console.log(`db-roles: OK - ${role} can read and write rows only (no schema changes, no role or object creation)`)
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(`db-roles: FAILED - ${(error as Error).message?.split('\n')[0] ?? 'unknown error'}`)
    process.exit(1)
  })
