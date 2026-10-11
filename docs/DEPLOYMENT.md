# Deployment

Production deployment of GoCart Pakistan. **This file currently covers the database migration
workflow only (`M52a`, [ADR-032](./DECISIONS.md)).** `M52` adds the Cloudflare Tunnel, environment
validation and secrets sections; `M54` adds backups; `M59` is the full runbook.

Every command below uses the production stack file and an explicit env file kept outside the
checkout (see the header of `docker-compose.prod.yml`). Shorthand used in this document:

```sh
PROD="docker compose --env-file /path/outside/checkout/gocart-prod.env -f docker-compose.prod.yml"
```

> **WARNING: in production, only `npm run deploy:migrate` (the `migrate` service) is supported.**
> NEVER run `payload migrate:fresh`, `migrate:reset` or `migrate:down` against a real database: the
> generated `down` drops every table, including `orders` (customer personal data).

## How the stack bootstraps the database

Start order is `postgres` (healthy) -> `migrate` (one-shot) -> `app`.

- `migrate` is built from the `migrate` target of the `Dockerfile` (full dependencies plus source;
  the minimal `production` image cannot run the Payload CLI). It runs `npm run deploy:migrate`, which
  is `payload migrate` followed by `scripts/verify-migrations.ts`.
- The verifier is a **smoke check, not a schema comparison**. It exits non-zero unless: at least one
  migration file exists, every migration file has a row in `payload_migrations`, no row has
  `batch = -1`, and every collection and the `Settings` global can be read. This closes the two cases
  where `payload migrate` alone exits 0 without a schema (no migration files; a dev-push marker met
  without a terminal). It does not detect a schema that differs from the config: QA dropped
  `orders_items` and `categories.slug` and it still passed. Schema drift is caught by the CI
  `migrations` job, not at deploy time.
- `app` has `depends_on: migrate: condition: service_completed_successfully`, so it never starts if
  `migrate` fails. Production never pushes the schema itself.
- The migrate step is bounded: it runs under `timeout -k 10 300` with stdin closed, so a hang
  (see "Never migrate a database populated by development" below) becomes a failure after 5 minutes.
  The same limit can kill a legitimately slow migration (large backfill); raise the `timeout` value
  in the Dockerfile `migrate` CMD before shipping such a migration.
- An **empty database needs no seeding**: the committed initial migration creates the whole schema.
  The catalog starts empty and the first admin user is created through `/admin` (the create-first-user
  screen). Until that is done, that screen is open to anyone who can reach the hostname, so create the
  first admin before the site is made publicly reachable.

Requires **Docker Compose >= 2.17** (`service_completed_successfully`). Verified on Compose v5.6.0.

## Creating a migration

Every change to a collection or to the `Settings` global needs a migration committed in the same
change; CI (`migrations` job) fails when one is missing.

1. Change the collection/global.
2. Generate the migration. It only diffs the config against the newest committed snapshot and never
   reads a database, so a dummy URI is fine:

   ```sh
   DATABASE_URI=postgresql://dummy:dummy@127.0.0.1:1/dummy PAYLOAD_SECRET=dummy \
     npm run migrate:create -- <short_name>
   ```

3. Review the generated `migrations/<timestamp>_<name>.ts` (and its `.json` snapshot and the updated
   `migrations/index.ts`). Check that it does what you intend, in particular that nothing drops or
   rewrites data. Add data backfills by hand if the change needs them.
4. Commit the migration files together with the code change.

The timestamp in the file name is the migration's identity in `payload_migrations`. It is stable only
once the file is committed: never rename or regenerate a migration that has been deployed anywhere.
Unmerged migrations on two branches can collide; regenerate yours after rebasing, before it ships.

## Never migrate a database populated by development

`next dev` and `npm run seed` push the schema directly and record a `dev` row with `batch = -1` in
`payload_migrations`. Running `payload migrate` on such a database asks an interactive confirmation
about data loss. With no terminal that prompt waits forever; here it is cut off by the 5-minute
timeout, the `migrate` service exits non-zero, and `app` does not start (observed: about 300 s, exit 1).
Use a fresh volume for production, and a scratch database for testing migrations
(`docker compose down -v` on a throwaway project). Do not point the production stack at a development
volume.

## Deploying a release

### Default: gated on the migration

```sh
$PROD build
$PROD run --rm migrate      # non-zero exit => stop here; the old app was never touched
$PROD up -d                 # migrate runs again as a no-op, then app is recreated
```

Verified with a deliberately broken migration: `run --rm migrate` exited 1 and the old `app`
container kept serving, unchanged. This is the documented default (ADR-032); the owner can change it.
The database is never left half-migrated within a file (each migration file is its own transaction;
if several files are pending and a later one fails, the earlier ones stay applied).

### First deploy, or when downtime is acceptable: one command

```sh
$PROD up -d --build
```

On a **first deploy** a failed migration means `app` is never started and `up` exits non-zero.

Do not use this for a redeploy where the site must stay up. When the app image changed, Compose stops
and recreates the old `app` container *before* `migrate` has run. Observed with Compose v5.6.0: after a
deliberately broken migration, `up` exited 1 and the app container was left "Created", i.e. **the
site was down** (HTTP 000). Not verified: whether Compose skips the recreate when a migration-only
change leaves the app image byte-identical.

### Option: stop first

```sh
$PROD stop app
$PROD up -d --build
```

Accepts downtime on every release, but the app can never run against a schema it was not built for.

`migrate` is **not** re-run when the host reboots; `app` and `postgres` come back under
`restart: unless-stopped` and the schema is whatever the last successful `up` left.

## Concurrency and disk

- Deploys are single-operator and must be serialised. Payload takes no advisory lock, so never run
  two `migrate` invocations concurrently (including a manual `run --rm migrate` during a deploy).
- Old images accumulate on a small VPS with every `build`. Periodically run `docker image prune`
  (add `-a` only if you accept re-pulling/rebuilding unused images) and check `df -h`.

## Backups and recovery

Migrations are forward-only. Nothing runs `migrate:down` in production. If a release goes wrong,
recover by restoring a backup and shipping a corrective forward migration.

- Take a backup **before every schema-changing deploy**. Backups are manual for now
  ([ADR-015](./DECISIONS.md)); `M54` formalises and verifies them. For example (not yet verified as a
  restore procedure):

  ```sh
  $PROD exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > gocart-$(date +%F-%H%M).sql
  ```

  Store the file off the host.
- Uploaded media lives in the `app-media` volume and is not covered by `pg_dump`.

## Checking migration status

```sh
$PROD run --rm migrate npm run migrate:status
```

Prints each migration file with its batch and whether it ran. Verified against a migrated database.
This starts a throwaway `migrate` container (and `postgres` if it is not running) and does not touch
`app`. Confirm that no row shows batch `-1`.

## Not covered yet

Cloudflare Tunnel, environment validation and the secrets reference (`M52`); health checks (`M53`);
backups and restore drills (`M54`); the full deploy runbook (`M59`).
