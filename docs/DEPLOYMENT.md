# Deployment

Production deployment of GoCart Pakistan. **This file covers the Cloudflare Tunnel origin boundary,
environment validation and secrets (`M52`, [ADR-033](./DECISIONS.md)), the database migration
workflow (`M52a`, [ADR-032](./DECISIONS.md)) and Cloudflare Turnstile with the CGNAT-safe order rate
limits (`M52b`, [ADR-035](./DECISIONS.md), amended by [ADR-036](./DECISIONS.md): a verified token is
required, orders are idempotent, the first admin comes from a secret, the app uses a restricted database
role). `M53` adds health checks; `M54` adds backups (scripts and procedure: [Backups and recovery](#backups-and-recovery)); `M59` adds the launch checklist, rollback, release and launch decisions.**

> **Launch blockers (read first).** The stack is **not cleared for launch**. See
> [Launch blockers](#launch-blockers) at the end of this file. The first one is fixed on branch
> `m79/next-16-4` but **not merged**: `M79` upgrades `next` to 16.4.2, which closes the three advisories
> `npm audit` reported on 2026-10-24 (`npm audit` no longer lists `next`). It awaits merge
> (ADR-040 is Accepted, 2026-10-24). The other items are the real-Cloudflare checks with real keys, the
> Cloudflare WAF rule, the first-deploy checks, and the first real backup, restore drill and uptime monitor.

## Launch checklist

Do these in order. "Owner" means a person with the Cloudflare account, the VPS and the password manager does
it by hand; "Stack" means the compose stack or a script does it once you run the gated deploy. A box is ticked
only when the step has been seen to work on the real VPS. **Nothing below has been run on a clean VPS yet**
(`M59` wrote the runbook; see [Not covered yet](#not-covered-yet)).

- [ ] 1. **Owner.** Resolve the Next.js blocker: `M79` (`next` 16.4.2) merged to `main` (ADR-040 is Accepted, 2026-10-24) and deployed
  (or an explicit written owner acceptance ([Launch blockers](#launch-blockers), item 1)). Decide the open items in
  [Launch decisions](#launch-decisions).
- [ ] 2. **Owner.** Take a backup first (ADR-032): [Taking a backup](#taking-a-backup). On a brand-new empty
  VPS there is nothing to back up; for any later deploy this step is mandatory.
- [ ] 3. **Owner.** Check the production database for a leftover development-push marker. This must return
  **no rows**; if it returns any, **stop the deploy** and do not run `migrate` (see
  [Never migrate a database populated by development](#never-migrate-a-database-populated-by-development)):

  ```sh
  $PROD exec -T postgres psql -U gocart -d gocart -c "SELECT * FROM payload_migrations WHERE batch = -1;"
  ```

  (use your `POSTGRES_USER` / `POSTGRES_DB` if they are not the defaults; on a database that has never been
  migrated the table does not exist yet and the query errors, which is also fine). `scripts/verify-migrations.ts`
  already fails the deploy on `batch = -1`, so this is a second, earlier check.
- [ ] 4. **Owner.** Create the env file **outside the checkout**, mode 600, with `TURNSTILE_ALLOW_TEST_KEYS`
  and `PAYLOAD_ALLOW_FIRST_REGISTER` **unset**: [Secrets and the env file](#secrets-and-the-env-file).
  Replace the sample `shop.example.com` with the real hostname.
- [ ] 5. **Owner.** Create the Cloudflare tunnel and copy its token into the env file. **Do NOT attach the
  public hostname yet**: [Cloudflare: one-time steps](#cloudflare-one-time-steps).
- [ ] 6. **Owner.** Create the Turnstile widget (Managed) with **real keys for the real hostname** and put both
  keys in the env file: [Cloudflare Turnstile: one-time setup](#cloudflare-turnstile-one-time-setup).
- [ ] 7. **Owner.** Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in the env file:
  [The first admin comes from a secret](#the-first-admin-comes-from-a-secret).
- [ ] 8. **Stack, started by the owner.** The gated deploy: `$PROD build`, `$PROD run --rm migrate` (stop on a
  non-zero exit), `$PROD up -d`: [Default: gated on the migration](#default-gated-on-the-migration). The stack
  validates the environment, applies migrations, creates the restricted `gocart_app` role, verifies the
  migrations and creates the first admin; `app` never starts if `migrate` fails
  ([How the stack bootstraps the database](#how-the-stack-bootstraps-the-database)). If it fails, see
  [Rollback](#rollback).
- [ ] 9. **Owner.** Attach the public hostname to the tunnel (service `HTTP`, URL `app:3000`, no Host header
  override). Sign in at `https://<your-domain>/admin`.
- [ ] 10. **Owner.** Remove the two bootstrap admin lines from the env file, then re-run the gated deploy
  per [The first admin comes from a secret](#the-first-admin-comes-from-a-secret) (step 3 there): the gate
  is a no-op for the schema and the `migrate` container no longer receives the credentials.
- [ ] 11. **Owner.** Real-key check: from a real phone on mobile data, place one order and do one order
  lookup through the real hostname. `$PROD logs app | grep -E '\[turnstile\]|\[order-guard\]'` must show **no**
  lines ([setup step 5](#cloudflare-turnstile-one-time-setup)).
- [ ] 12. **Owner.** Add the Cloudflare WAF rate-limiting rule on `POST` to `/cart` and `/orders`
  ([Launch blockers](#launch-blockers), item 4; values in [Launch decisions](#launch-decisions)).
- [ ] 13. **Owner.** Point an external uptime monitor at `https://<host>/api/health` (expects 200). **Stack:**
  `$PROD ps` shows `app` as `healthy`.
- [ ] 14. **Owner.** Backups ([Backups and recovery](#backups-and-recovery)): schedule `scripts/backup.sh` daily
  while orders flow and before every schema-changing deploy (there is no scheduler in the stack); set
  `BACKUP_PASSPHRASE_FILE` (the passphrase itself lives in the password manager, not on the VPS); keep the
  `.gpg` copies **off the VPS**; run `scripts/backup-verify.sh` once
  ([Proving a backup restores](#proving-a-backup-restores-do-this-a-backup-never-restored-is-a-hope)); rehearse
  the manual restore once on a scratch machine ([Restoring for real](#restoring-for-real-after-a-disaster-or-a-bad-release)).
- [ ] 15. **Owner.** Re-run `npm audit` on the release commit and compare it with
  [Launch blockers](#launch-blockers), item 1.
- [ ] 16. **Owner (human, G8).** Live check of the real hostname at 320, 390 and 1440 px: no horizontal scroll,
  storefront, cart, order, lookup and `/admin` all usable.
- [ ] 17. **Owner.** Cut the release tag: [Release](#release).

Order of work for a first deploy: [Secrets and the env file](#secrets-and-the-env-file) ->
[Cloudflare: one-time steps](#cloudflare-one-time-steps) (create the tunnel, do NOT attach the public
hostname yet) -> [Cloudflare Turnstile: one-time setup](#cloudflare-turnstile-one-time-setup) (create the
widget, put both keys in the env file) -> choose the first admin's email and password and put them in the env
file ([First admin](#the-first-admin-comes-from-a-secret)) -> [first deploy](#deploying-a-release) -> attach the
public hostname -> remove the two admin secrets from the env file.

Every command below uses the production stack file and an explicit env file kept outside the
checkout (see the header of `docker-compose.prod.yml`). Shorthand used in this document:

```sh
PROD="docker compose --env-file /path/outside/checkout/gocart-prod.env -f docker-compose.prod.yml"
```

Because the compose file uses `${VAR:?...}` checks, **every** `$PROD` command (even `ps`, `logs`,
`down`, `config`, `run --rm migrate`) needs the full env file, including `TUNNEL_TOKEN`.

> **WARNING: in production, only `npm run deploy:migrate` (the `migrate` service) is supported.**
> NEVER run `payload migrate:fresh`, `migrate:reset` or `migrate:down` against a real database: the
> generated `down` drops every table, including `orders` (customer personal data).

## How the stack bootstraps the database

Start order is `postgres` (healthy) -> `migrate` (one-shot) -> `app` -> `cloudflared`.

- `migrate` is built from the `migrate` target of the `Dockerfile` (full dependencies plus source;
  the minimal `production` image cannot run the Payload CLI). It runs `npm run deploy:migrate`, which
  is `scripts/check-env.ts` (environment validation, `M52`), then `payload migrate`, then
  `scripts/db-roles.ts` (creates and grants the restricted `gocart_app` role the running app uses,
  ADR-036), then `scripts/verify-migrations.ts`, then `scripts/bootstrap-admin.ts` (creates the first
  admin from a secret, or does nothing if a user exists). An invalid environment fails `migrate` before
  the database is touched. `migrate` is the only container that holds the Postgres superuser password.
- The verifier is a **smoke check, not a schema comparison**. It exits non-zero unless: at least one
  migration file exists, every migration file has a row in `payload_migrations`, no row has
  `batch = -1`, and every collection and the `Settings` global can be read. This closes the two cases
  where `payload migrate` alone exits 0 without a schema (no migration files; a dev-push marker met
  without a terminal). It does not detect a schema that differs from the config: QA dropped
  `orders_items` and `categories.slug` and it still passed. Schema drift is caught by the CI
  `migrations` job, not at deploy time.
- `app` has `depends_on: migrate: condition: service_completed_successfully`, so it never starts if
  `migrate` fails, and `cloudflared` starts after `app`, so a failed migrate (or an invalid
  environment) never exposes anything. Production never pushes the schema itself.
- The migrate step is bounded: it runs under `timeout -k 10 300` with stdin closed, so a hang
  (see "Never migrate a database populated by development" below) becomes a failure after 5 minutes.
  The same limit can kill a legitimately slow migration (large backfill); raise the `timeout` value
  in the Dockerfile `migrate` CMD before shipping such a migration.
- An **empty database needs no seeding**: the committed migrations create the whole schema, and the
  first admin is created by the migrate step from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`
  (see [The first admin comes from a secret](#the-first-admin-comes-from-a-secret)). The catalog starts
  empty. The `/admin` create-first-user flow is closed for visitors (ADR-036).

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

**What must be backed up (M54):** two things, both on the VPS only. (1) The Postgres database
(volume `gocart-prod_postgres-data`): products, orders and the admin account. (2) Uploaded product
images (volume `gocart-prod_app-media`, [ADR-020](./DECISIONS.md)): `pg_dump` does not cover it.
Both volumes survive `down`, `up`, `restart` and redeploys; they are lost only by `down -v`, deleting
the volume, or losing the disk. **Never run `docker compose down -v` against production.**

### Taking a backup

```sh
scripts/backup.sh /path/outside/checkout/gocart-prod.env /path/to/backups
```

It writes, into the (mode 700) backup directory, with mode 600: `gocart-db-<UTC time>.dump`
(compressed `pg_dump` custom format), `gocart-media-<UTC time>.tar.gz` and `SHA256SUMS-<UTC time>`. A
file is created under a `.partial` name and renamed only after it has been read back, so a crash never
leaves something that looks complete. It keeps the newest 14 sets (`BACKUP_KEEP=N` changes that). The
media volume is read through a read-only mount with no network.

**The dump is unencrypted customer personal data** (names, phones, addresses). Encrypt it before it
leaves the machine, by giving the script a passphrase file that is itself stored somewhere else (a
password manager, never next to the backups):

```sh
(umask 077; openssl rand -base64 32 > /path/outside/checkout/backup-passphrase)   # once; copy it to your password manager
BACKUP_PASSPHRASE_FILE=/path/outside/checkout/backup-passphrase scripts/backup.sh <env-file> <dir>
```

The files then end in `.gpg` (GnuPG, AES256) and the plaintext copies are deleted. **Lose the
passphrase and the backup is unreadable.** Copy the encrypted files off the VPS (another machine, cloud
drive, an external disk): a backup on the same disk as the database does not survive losing that disk.

Backup times (manual for now, [ADR-015](./DECISIONS.md)): before every schema-changing deploy, and at
least once a day while orders are coming in. Automating this with `cron` is a small follow-up (not done:
unverified on a real VPS).

### Proving a backup restores (do this, a backup never restored is a hope)

```sh
scripts/backup-verify.sh <env-file> /path/to/backups/gocart-db-<time>.dump        # or the .dump.gpg (set BACKUP_PASSPHRASE_FILE)
sha256sum -c SHA256SUMS-<time>      # run inside the backup directory
```

This restores the dump into a **scratch database** (never the live one), checks that the tables and
the migration history came back, prints row counts and drops the scratch database. It needs the
`postgres` service running. Do it once after setting backups up, and after every Postgres major
version change.

### Restoring for real (after a disaster or a bad release)

This replaces the live data. Do not run it to "check" a backup (use the verify script above).

1. Get the stack up on the new or repaired machine with the same env file (first deploy steps above),
   then stop traffic: `$PROD stop app cloudflared`.
2. Decrypt if needed: `gpg --decrypt --output restore.dump gocart-db-<time>.dump.gpg`.
3. Replace the database (this DROPS the current one):

   ```sh
   $PROD exec -T postgres dropdb -U gocart --if-exists gocart
   $PROD exec -T postgres createdb -U gocart gocart
   $PROD exec -T postgres pg_restore -U gocart -d gocart --no-owner --no-privileges --exit-on-error < restore.dump
   ```

   (use your `POSTGRES_USER` / `POSTGRES_DB` if they are not the defaults).
4. Re-create the restricted app role and its grants, which the dump deliberately does not carry:
   `$PROD run --rm migrate` (idempotent; also applies any migration newer than the backup).
5. Restore the media: stop `app` first (already done), then
   `docker run --rm -v gocart-prod_app-media:/media -v "$PWD":/in:ro --entrypoint sh postgres:17-alpine -c 'cd /media && tar xzf /in/gocart-media-<time>.tar.gz && chown -R 1000:1000 /media'`.
6. `$PROD up -d`, then place one test order and one order lookup (see "Cloudflare Turnstile: one-time setup", step 5) and open `/admin`.
7. Delete `restore.dump` (plaintext personal data): `shred -u restore.dump` or `rm`.

### What is verified, and what is not

- Verified (local PostgreSQL 16, real migrated schema): `backup.sh` and `backup-verify.sh` logic: plain
  and encrypted backups, restore into a scratch database with row counts, wrong passphrase and truncated
  dump refused, retention, no partial file after a failure, directory mode 700 and file mode 600.
- Checked by CI only (`scripts/prod-stack-check.sh`, the real compose stack): the Docker paths (`exec` into
  the postgres container, the media-volume read) and that a full `down` / `up` keeps the admin and the
  uploaded image. **Unverified until CI has run on this change.**
- Not verified at all: the manual restore procedure above on a real stack, `cron` automation, a
  restore onto a different machine, and Postgres major-version upgrades.

## Checking migration status

```sh
$PROD run --rm migrate npm run migrate:status
```

Prints each migration file with its batch and whether it ran. Verified against a migrated database.
This starts a throwaway `migrate` container (and `postgres` if it is not running) and does not touch
`app`. Confirm that no row shows batch `-1`.

## Secrets and the env file

Secrets are supplied out of band in an env file that lives **outside the checkout** (mode 600) and is
passed explicitly to every command. Nothing secret is committed, baked into an image, or printed.

- Always pass `--env-file /path/outside/checkout/gocart-prod.env`. Compose also auto-loads a
  project-directory `.env`, so never rely on that: a `.env` in a development checkout holds
  development values. `.env` is git-ignored and must stay that way.
- Create it with restrictive permissions: `umask 077; ${EDITOR:-vi} /path/outside/checkout/gocart-prod.env`,
  then `chmod 600` it. Keep an off-host copy in a password manager.
- `TUNNEL_TOKEN` is passed only to the `cloudflared` service. The `migrate` and `app` containers never
  see it, and `check-env` does not read it.

Required variables (enforced by `scripts/check-env.ts`, run first by `migrate`; a violation fails the
deploy with the variable name and the rule, never the value):

| Variable | Rule |
|---|---|
| `POSTGRES_PASSWORD` | at least 16 characters; only `A-Z a-z 0-9 - . _ ~` (it is interpolated unencoded into `DATABASE_URI`); at least 10 distinct characters; must not contain (case-insensitive) `dev-only`, `placeholder`, `changeme`, `change-me`, `replace`, `example`, `ci-only` or `password`. `openssl rand -hex 24` gives 48 hex characters. |
| `PAYLOAD_SECRET` | at least 32 characters, no whitespace, at least 12 distinct characters, and none of the same forbidden words as above (case-insensitive substring). `openssl rand -hex 32` gives 64 hex characters. |
| `NEXT_PUBLIC_SITE_URL` | `https:`, a bare origin (no path, query or credentials), a public host: rejected are localhost (including a trailing dot), loopback, `0.0.0.0`, IPv4-mapped IPv6, private/link-local/CGNAT (`100.64.0.0/10`) ranges, `.local`/`.internal`/`.lan`/`.home.arpa` names and single-label hosts. **Build-time**: changing it needs `build`/`--build`. |
| `TUNNEL_TOKEN` | required by compose (non-empty) and nothing more; `check-env` never sees it. A credential. |
| `TURNSTILE_SECRET_KEY` | (`M52b`) the Turnstile widget's **secret** key; runtime only, given to `app` (siteverify) and `migrate` (`check-env`). 20-200 characters, no whitespace, none of the forbidden words above, **not** a Cloudflare test key (anything shaped like `1x0000000000000000000000000000000AA`), and different from the site key. A credential. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | (`M52b`) the same widget's **public** site key (it is shipped to every browser; not a secret). 10-100 characters, no whitespace, no forbidden word, not a test key. **Build-time** for `app` (changing it needs `build`/`--build`); also passed to `migrate` at runtime so `check-env` can validate it. |
| `TURNSTILE_ALLOW_TEST_KEYS` | **must be unset or empty** in production (`check-env` fails otherwise). Development and CI only; `docker-compose.prod.yml` never passes it. |
| `APP_DB_PASSWORD` | (ADR-036) the password of the restricted `gocart_app` database role the running app connects as. Same rules as `POSTGRES_PASSWORD` (16+ characters, `A-Z a-z 0-9 - . _ ~`, 10+ distinct, no forbidden word) and it **must differ from `POSTGRES_PASSWORD`**. Given to `migrate` (which creates the role) and used by compose to build `app`'s `DATABASE_URI`; `app` never sees `POSTGRES_PASSWORD`. Unlike `POSTGRES_PASSWORD` it is re-applied on every deploy, so it can be rotated (change the env file, then run the deploy gate). |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | (ADR-036) the first admin. Both or neither. Required **only while no user exists** (the migrate step fails otherwise, so the stack never starts with nobody able to administer it). Password: 14+ characters, no whitespace, 10+ distinct characters, no forbidden word. Reach the `migrate` container only; **remove both from the env file after the first deploy.** |
| `PAYLOAD_ALLOW_FIRST_REGISTER` | **must be unset or empty** in production (`check-env` fails if it reaches the `migrate` container; compose never passes it to any service, which is the real control and is asserted by the `prod-stack` CI job): it re-opens the first-admin window. Development and CI only. |

(The word list and host rules above follow the fix being made to `scripts/check-env.ts` at the time of
writing; `scripts/check-env.ts` is the authority if they ever differ.)

`DATABASE_URI` is built by compose from `POSTGRES_USER` (default `gocart`), `POSTGRES_PASSWORD` and
`POSTGRES_DB` (default `gocart`); `check-env` also verifies that the password inside it equals
`POSTGRES_PASSWORD`. Optional: `POSTGRES_USER`, `POSTGRES_DB`, `NEXT_PUBLIC_CURRENCY_SYMBOL`.

**`POSTGRES_PASSWORD` only takes effect when the database volume is first initialised.** Changing it
in the env file later does not change the password stored in the database; `app` and `migrate` would
then fail to log in. Rotating it means `ALTER USER` inside the database *and* the env file, together
(and is a human-approval action on a real database). Pick it once, correctly.

Sample env file. **Every value below is an example; none is a real secret.** The password and secret
placeholders contain `REPLACE`, so they FAIL `check-env` if copied unchanged. The
`NEXT_PUBLIC_SITE_URL` sample (`shop.example.com`) is **not** rejected by `check-env` (CI uses it
deliberately): you must replace it with your real domain, or canonical URLs and the sitemap will point
at a domain you do not own. `TUNNEL_TOKEN` is only checked non-empty (by compose).

```sh
# /path/outside/checkout/gocart-prod.env   (mode 600; never commit)
POSTGRES_PASSWORD=REPLACE-ME-output-of-openssl-rand-hex-24
APP_DB_PASSWORD=REPLACE-ME-a-different-output-of-openssl-rand-hex-24
PAYLOAD_SECRET=REPLACE-ME-output-of-openssl-rand-hex-32
NEXT_PUBLIC_SITE_URL=https://shop.example.com
TUNNEL_TOKEN=REPLACE-ME-paste-the-token-from-the-cloudflare-dashboard
TURNSTILE_SECRET_KEY=REPLACE-ME-secret-key-of-the-turnstile-widget
NEXT_PUBLIC_TURNSTILE_SITE_KEY=REPLACE-ME-site-key-of-the-turnstile-widget
# Only until the first admin exists, then delete these two lines:
ADMIN_BOOTSTRAP_EMAIL=owner@your-domain.example
ADMIN_BOOTSTRAP_PASSWORD=REPLACE-ME-a-long-random-password-for-the-first-admin
```

The two Turnstile placeholders contain `REPLACE`, so `check-env` rejects them if copied unchanged. Do
**not** put `TURNSTILE_ALLOW_TEST_KEYS` in this file.

Generate the secrets with `openssl rand -hex 24` (`POSTGRES_PASSWORD` and, separately, `APP_DB_PASSWORD`)
and `openssl rand -hex 32` (`PAYLOAD_SECRET`). The first start validates them: a rejected value fails `migrate` before any data
is touched, naming the variable and rule.

`.env.example` documents the development variables (including Cloudflare's public Turnstile test keys and
`PAYLOAD_ALLOW_FIRST_REGISTER=1`, which are for development only) and lists the production-only
variables; this section is the authority for production.

**Never paste the output of `docker compose config` or `docker inspect` anywhere** (chat, tickets, PRs,
logs shared with others): they print `TUNNEL_TOKEN`, `PAYLOAD_SECRET` and the database password in
plaintext. Redact before sharing, or share the compose file instead.

## Cloudflare: one-time steps

The origin boundary is a Cloudflare Tunnel ([ADR-033](./DECISIONS.md)): `cloudflared` runs as a compose
service, dials **out** to Cloudflare, and relays public traffic to `http://app:3000`. No service
publishes a host port. These steps are done by the owner in the Cloudflare dashboard and cannot be
automated or verified from this repository.

1. In Cloudflare Zero Trust, create a tunnel (type: Cloudflared) and **copy its token** into
   `TUNNEL_TOKEN` in the env file. Do not paste it into chat, tickets, shell history or a PR.
2. Add a **public hostname** for the tunnel: your domain, service type `HTTP`, URL `app:3000`
   (that is, `http://app:3000`). **Leave the "HTTP Host Header" override unset**, so the visitor's `Host`
   reaches the app unchanged (Next.js Server Actions compare `Origin` with `Host`).
   **Do not add this hostname yet**: see the next section.
3. In the zone's settings, keep the managed transform **"Remove visitor IP headers" OFF**. The app
   rate-limits by `cf-connecting-ip` and, if that header is removed, every visitor shares one
   `unknown` bucket (see "Rate limits in the real world" below). Also do **not** enable Cloudflare's
   **"Pseudo IPv4"** mode with an overwrite-headers setting: it can replace `cf-connecting-ip` with a
   synthetic address.
4. **A leaked token is serious.** Anyone holding `TUNNEL_TOKEN` can run their own connector for your
   tunnel, and Cloudflare will route live traffic to it: they could read orders, customer personal data and
   admin passwords in transit and answer requests arbitrarily. If the token is ever exposed (logs,
   `docker compose config` output, a screenshot, a pasted command), rotate it in the Cloudflare dashboard,
   update the env file, run `$PROD up -d cloudflared`, and then check the Zero Trust dashboard's connector
   list for connectors you do not recognise. Whether a token refresh drops already-connected old
   connectors is **unverified**; do not assume it does.

What the tunnel guarantees, and what it does not (ADR-033):

- Guarantees: no packet from the public internet or the host's other interfaces reaches port 3000
  except through Cloudflare's edge; `cf-connecting-ip` as received was written by Cloudflare, not by the
  visitor (`lib/client-ip.ts` trusts only that header, and only in production).
- Does **not** guarantee: (a) that `x-forwarded-for` is trustworthy (Cloudflare appends to a client
  value, so the app ignores it); (b) anything about other containers sharing a network with `app`: no
  further service may join `edge` or `backend`; (c) protection from anyone with a shell on the VPS or the
  Docker socket; (d) that `cf-connecting-ip` is present if "Remove visitor IP headers" is enabled;
  (e) anything if a second ingress to the app is added (a published port, another tunnel route, another
  network member), which needs an ADR; (f) protection of `/admin` itself (Cloudflare Access/WAF is out of
  scope).
- **Docker bypasses `ufw`.** A port published by Docker (`ports:`) is NAT-ed in the `nat`/`FORWARD` path
  and is not filtered by `ufw`'s `INPUT` rules, so `ufw deny 3000` would not protect it. That is why the
  production file publishes nothing and the host firewall is not the control. Do not add a `ports:`
  entry to `app` or `postgres` "temporarily".
- With no published port, `curl localhost:3000` on the host no longer works. Probe the app with
  `$PROD exec app wget -qO- http://127.0.0.1:3000/api/users/init`.
- Unverified until a real tunnel exists: connection to Cloudflare's edge, that the public hostname reaches
  the app, that `cf-connecting-ip` is overwritten and `x-forwarded-for` appended, and an order placed
  through the public hostname. `cloudflared`'s container healthcheck (`cloudflared tunnel ready`) is
  `unhealthy` until at least one connection is registered, and has only been seen failing with a dummy
  token.

## Cloudflare Turnstile: one-time setup

`M52b` ([ADR-035](./DECISIONS.md)) verifies a Cloudflare Turnstile token on the server for order
placement (`/cart`) and order lookup (`/orders`). Turnstile is what lets many real customers behind one
carrier-grade-NAT IP order without hitting each other's limit (see
[Rate limits in the real world](#rate-limits-in-the-real-world)). Done by the owner in the Cloudflare
dashboard; it cannot be automated or verified from this repository.

1. In the Cloudflare dashboard, open **Turnstile** and **add a widget (site)** for the store's
   production hostname (the host of `NEXT_PUBLIC_SITE_URL`, e.g. `shop.example.com`). Choose
   **Managed** mode. The widget must be for exactly that hostname (watch `www.` versus the bare
   domain): a token whose `hostname` or `action` does not match is **rejected**, never accepted (see
   step 5).
2. Copy the **site key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **secret key** into
   `TURNSTILE_SECRET_KEY` in the out-of-band env file. Never paste the secret key into chat, tickets,
   shell history or a PR. Never use Cloudflare's test keys in production: they accept a public dummy
   token, so they would turn the check off (`check-env` rejects them).
3. Deploy as usual (the site key is inlined at build time, so the first deploy must `--build`). The
   `migrate` step validates both keys before the database is touched.
4. Outbound access: the app calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` over the
   `edge` network (an ordinary NAT bridge). No network change is needed; do not make `edge` internal.
5. **After go-live, check the logs** (`$PROD logs app | grep '\[turnstile\]'`). Place one real order
   and do one order lookup through the real hostname: **they should produce NO `[turnstile]` log
   lines.** In particular, an ERROR line `[turnstile] rejected { reason: 'hostname-mismatch' }` or
   `{ reason: 'action-mismatch' }` means the widget's hostname in the Cloudflare dashboard or
   `NEXT_PUBLIC_SITE_URL` is wrong (for example `www.` versus the bare domain), and **every customer is
   refused**: ADR-036 has no degraded path, so a mismatch is a total checkout outage. Fix the widget
   hostname in the dashboard, or fix `NEXT_PUBLIC_SITE_URL` and rebuild.

**Unverified until a real deploy**: the widget on the real hostname, a `verified` siteverify with the
real keys, the `hostname`/`action` values Cloudflare returns, and the exact real-key formats. CI only
exercises Cloudflare's always-pass test keys (which skip the hostname/action check). The Turnstile
facts ADR-035 relies on are listed there as UNVERIFIED; confirm them against Cloudflare's current
documentation before launch.

### Rotating the Turnstile keys

- **Site key** (public, build-time): put the new value in the env file, then deploy a release
  ([gated on the migration](#default-gated-on-the-migration): `build`, `run --rm migrate`, `up -d`).
  A running image keeps the old site key until it is rebuilt.
- **Secret key** (runtime): update the env file, then `$PROD run --rm migrate` (re-runs `check-env`
  against the new value; a no-op for the schema) and `$PROD up -d app` (recreates `app` with the new
  environment). No rebuild.
- If the site and secret keys are rotated together (a new widget), rebuild: an old site key with a new
  secret (or the reverse) makes every token fail to verify, and every order is refused ("The security check
  didn't complete" or "We can't run our security check right now") until both match.
- If the secret key is exposed, rotate it in the Turnstile dashboard and follow the secret steps above.

### When Turnstile is unreachable or a token is bad (strict mode, ADR-036)

A verified token is **required**. There is no degraded path: the owner decided on 2026-10-11 that an
order or lookup without a verified token must be refused. Consequences you should expect:

- If the widget cannot load in the browser (blocked script, an ISP that blocks Cloudflare, a very old
  browser), the button stays disabled and the page tells the customer to contact the store. Orders for
  those customers are entered by hand in `/admin`.
- If siteverify cannot be reached, times out (3 seconds, no retries) or answers anything other than a
  definite verdict, the order is refused with "We can't run our security check right now … contact us".
  Because the storefront itself is served through the same Cloudflare Tunnel, a Cloudflare outage that
  matters is usually an outage of the site as well.
- A token that is missing, invalid, expired or already used, or issued for another hostname or action, is
  refused with "The security check didn't complete" (or an "it has expired, it renews by itself" variant).

Reasons as they appear in `[turnstile] <outcome> { reason: ... }`:

| Outcome / reason | Meaning | Log level |
|---|---|---|
| rejected `missing-token` | no token sent (widget failed to load, or a bot) | not logged |
| rejected `malformed-token`, `invalid-token`, `expired-or-duplicate` | the token is definitely bad | warning |
| rejected `hostname-mismatch`, `action-mismatch` | Cloudflare verified the token, but for another hostname or action: a configuration error (see setup step 5) | **error** |
| unavailable `network`, `timeout`, `http-status`, `bad-response` | Cloudflare unreachable, slow (over 3 s) or answered without a definite verdict | warning |
| unavailable `service-error` | Cloudflare returned an error code; **error** level when it refused our secret | warning / **error** |
| unavailable `busy` | more than 50 verifications already in flight in this process; the request skips siteverify | warning |
| unavailable `not-configured`, `test-key-not-allowed` | `TURNSTILE_SECRET_KEY` missing, `NEXT_PUBLIC_SITE_URL` unusable, or a test key without the dev/CI allow flag; production prevents these with compose `:?` and `check-env` | **error** |

Watch the app logs for `[turnstile]` and `[order-guard]` lines after launch: any error-level line is a
configuration problem to fix at once (customers are being refused); many `network`, `timeout` or
`http-status` warnings mean the app cannot reach Cloudflare; `[order-guard] phone-volume` means more than
10 verified orders in 24 hours on one phone number (look at those orders in `/admin`). Tokens, IPs, phone
numbers and customer fields are never logged.

### Privacy

The Turnstile script is loaded from Cloudflare (never self-hosted or proxied) **only on `/cart` and
`/orders`**, both `noindex`; no other page loads it. It collects browser signals in the visitor's
browser. The server sends Cloudflare only the token, the secret and the visitor's IP; **no customer data**
(name, phone, address, cart) is sent. If the store publishes a privacy notice, it should mention
Cloudflare Turnstile (owner).

## The first admin comes from a secret

Payload's built-in create-first-user flow (`POST /api/users/first-register` and the `/admin` create-first-user
screen) makes **whoever reaches the site first** an admin with access to all order data. It is **closed**
(ADR-036): `collections/Users.ts` refuses an unauthenticated user creation with 403 unless it comes from the
server-side bootstrap script or the process was started with `PAYLOAD_ALLOW_FIRST_REGISTER=1` (development
and CI; `check-env` rejects it in production and the production compose never passes it).

The production admin is created by the migrate step (`scripts/bootstrap-admin.ts`, the last step of
`npm run deploy:migrate`), from `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in the env file:

1. Choose the email and a long random password (14+ characters, no whitespace, 10+ distinct characters,
   no forbidden word) and put both in the env file with the other secrets.
2. Deploy as usual. If no user exists, the admin is created; if one exists, nothing happens (the step says
   the credentials are unused). If no user exists **and the credentials are missing or invalid, the migrate
   step fails and the app does not start** (it fails closed rather than leave a stack nobody can administer).
3. **Remove both lines from the env file** after the first successful deploy, and sign in at
   `https://<your-domain>/admin`.

This works the same after a database wipe, volume loss or restore into an empty database: put the two
secrets back, run the deploy gate, remove them again. There is **no window** in which a visitor can register,
so the order of "attach the public hostname" and "create the admin" no longer matters. To add more admins,
sign in and use `/admin` (an authenticated admin may create users). To reset a lost admin password with the
site down, set the two variables to a new pair **and** remove the old user in the database
(`delete from users where email = '...'`), then run the deploy gate; that is a human-approval operation on a
real database.

## Rate limits in the real world

Pakistani mobile carriers put many subscribers behind one public IPv4 address (carrier-grade NAT), so
one IP can be many real customers. Since `M52b` ([ADR-035](./DECISIONS.md), amended by
[ADR-036](./DECISIONS.md)) an order or lookup needs a **verified Turnstile token**, and the limits count
verified customers separately instead of by IP alone. All limits are code constants in `lib/order-guard.ts`
(changing them is a code change, not configuration):

| What | Limit | Counts |
|---|---|---|
| Order placement, attempts per IP | 150 per 15 minutes (and 1,000 per IPv6 /48; at most 4 verifications in flight per IP, 12 per /48) | every request with a well-formed phone and a token or idempotency key, whatever the outcome (bounds siteverify calls and database lookups) |
| Order placement, verified orders per IP | 30 per 15 minutes | successful verified orders |
| Per phone number **and IP** (normalised `03XXXXXXXXX`) | 3 per hour **and** 10 per 24 hours | successful verified orders only (a failed order is refunded) |
| Per phone number, all IPs | log line only: `[order-guard] phone-volume` above 10 per 24 hours (nothing notifies you; check the logs) | never refuses |
| Order lookup, attempts per IP | 150 per hour (and 1,000 per IPv6 /48) | every request with a token |
| Failed lookups per order number | 5 per hour | `NOT_FOUND` only, verified requests only |

Things to know before launch:

- **No token, no order.** A request with neither a token nor an idempotency key costs nothing (it touches no
  limiter, no network call and no database) and is refused. A request with a key but no token takes one
  attempts slot and one indexed database lookup (it may be the retry of an existing order) and is refused
  unless that order exists. A repeat of an order that already exists (same idempotency key and
  phone) is answered with that order and consumes no limit.
- **Verified customers on a shared CGNAT IP are not limited by each other** below the per-IP ceiling of
  30 orders per 15 minutes. Anyone on that IP can still use up the ceiling for 15 minutes with real
  solved challenges; that is the same class of problem as before with a far higher bar.
- **Nobody can lock a customer out of their own phone number from another connection**: the per-phone
  limits are keyed by phone *and IP*. An attacker with solved challenges and rotating IPs can still place
  fake orders on a victim's number; the cost per order is a solved token, and the alert above and `/admin`
  are the detection. The real remedy is proof of phone ownership (SMS OTP, deferred by ADR-015).
- **Limiter state is in-process and resets on restart** (every deploy or container restart starts all
  counters at zero). Acceptable for the single instance of ADR-015; a second app instance would need a
  shared store. The limiters are fixed-size and non-evicting: a flood of distinct keys can only make the
  limits stricter for some keys (a hash collision), never reset a counter.
- IPv6 clients are limited per `/64`, not per address.
- **A missing or invalid `cf-connecting-ip` header refuses every order and lookup** in production
  (`VERIFICATION_UNAVAILABLE`, and one error line a minute: `[order-guard] no valid client IP`). All
  production traffic arrives through the tunnel, so this means a Cloudflare setting (for example "Remove
  visitor IP headers") or a second ingress. Check for it after any Cloudflare zone change.
- **What to check at launch**: one real order and one order lookup through the real hostname, from a
  real phone on mobile data, should produce **no** `[turnstile]` or `[order-guard]` log lines (an error line
  means customers are being refused: see [setup step 5](#cloudflare-turnstile-one-time-setup)); and
  "Remove visitor IP headers" is still off.
- Unverified until a real deploy: these limits behind real Cloudflare headers with real mobile-carrier
  traffic.

## Database roles

The `migrate` service connects as the Postgres superuser (`POSTGRES_USER`, `POSTGRES_PASSWORD`) and, after
`payload migrate`, runs `scripts/db-roles.ts`. The running `app` connects as **`gocart_app`**
(`APP_DB_PASSWORD`): `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, 20 connections,
`statement_timeout` 30 s and `idle_in_transaction_session_timeout` 60 s (guard rails against bugs, **not** limits
against a compromised app: a role can reset its own session defaults, and the next deploy restores them). It can `SELECT, INSERT, UPDATE, DELETE` on the application tables and use their
sequences; it **cannot** create or alter objects, create roles or extensions, `TRUNCATE`, run server-side
programs (`COPY ... PROGRAM`), create temporary tables, or write to `payload_migrations`. The grants are
re-applied on every deploy, so new tables are covered automatically. Consequences: a compromised app can
read and change this one database's rows (including orders and **user rows, so it could add an admin or
replace a password hash** - row access is what the app needs), but cannot change the schema or take over the
database server. Known residue, accepted: it can create large objects and `CONNECT` to other databases in the
cluster (there are none in this stack); **schema changes only ever happen through the migrate step.** Development
(`docker-compose.yml`) keeps one superuser because `next dev` pushes the schema.

## Image optimisation

`M51` ([ADR-034](./DECISIONS.md)) enabled Next.js's built-in image optimizer. **It is switched off again**
(ADR-036) because `next@15.4.11` had critical advisories in the Image Optimization API. `M52c` (ADR-037)
upgraded to Next 16.3.8, which has none; re-enabling the optimizer is now an owner decision (performance
versus a public CPU-bound endpoint), not a security necessity. `next.config.mjs` sets `images.unoptimized: true` (product images are
served as uploaded, from `/api/media/file/...`) and sends every `/_next/image` request to a 404. Uploads
are restricted to JPEG, PNG, WebP and GIF (no AVIF, SVG or HEIC).

- **Upload rules for admins.** Resize product photos to under about 1600 px on the long edge and a few
  hundred KB (WebP or JPEG) before uploading: the file the visitor downloads is the file you upload.
  Do not upload SVG or AVIF (refused) and do not put private files in Media (it is public-read).
- **Revisit** with the Next.js upgrade: the optimizer, its cache sizing and the Cloudflare cache rules in
  ADR-034 apply again only if it is re-enabled.

## Read-only containers

`app` and `migrate` run with `read_only: true` (ADR-036). Writable places: `/tmp` (tmpfs), `/app/.next/cache`
(tmpfs, `app` only, 128 MB, empty after each restart) and the `app-media` volume at `/app/media`. If a
future change writes anywhere else you will see `EROFS` errors in `$PROD logs app`; fix the code or add a
tmpfs, do not remove `read_only`. `postgres` and `cloudflared` are not read-only (see ADR-036).

## Rollback

Not run on a real stack: this section is written from the compose file, the Dockerfile and ADR-032, and
the failure cases marked "Verified" in [Deploying a release](#deploying-a-release). Rehearse it once on a
scratch machine before relying on it. **Never** use `down -v`, `migrate:down`, `migrate:reset` or
`migrate:fresh` on production (see the warning at the top of this file): they destroy `orders`.

1. **The gated deploy failed at `run --rm migrate` (non-zero exit).** Nothing was replaced. `app` is not
   recreated and `cloudflared` is untouched, so the previous release keeps serving
   ([Default: gated on the migration](#default-gated-on-the-migration), verified with a deliberately broken
   migration). Read the failing step in the `migrate` output (`check-env` names the variable and the rule;
   the verifier names the check). Fix the cause and run the gate again. A failed migration file is rolled
   back as a whole (one transaction per file); files that already applied in the same run stay applied.
   On a first deploy the stack simply never starts.
2. **`migrate` passed but the new release misbehaves** (bad build, wrong `NEXT_PUBLIC_*` value, a runtime
   error). Redeploy the previous release with the same gate:
   - Compose builds the images locally and does not push them to a registry, so there is no remote image tag
     to pull. The previous release is its commit: in the checkout, `git checkout <previous-release-commit-or-tag>`
     (a detached HEAD is fine; this rewrites nothing), then `$PROD build`, `$PROD run --rm migrate`,
     `$PROD up -d`.
   - Optional speed-up, so a rollback needs no rebuild: before each deploy, keep the running image under a
     second name, for example `docker tag gocart-prod-app:latest gocart-prod-app:previous` (the image name
     follows the compose project name `gocart-prod`; confirm it with `docker image ls` first). Not run.
   - A site-wide misconfiguration of a **build-time** value (`NEXT_PUBLIC_SITE_URL`,
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) is fixed in the env file and a rebuild, not by rolling back code.
3. **The release applied a schema migration and the old code cannot work with it.** Migrations are
   **forward-only** ([ADR-032](./DECISIONS.md)); nothing here runs a `down`. Redeploying old code against a
   newer schema is safe only if the migration was purely additive (a new nullable column or table); whether
   the older `migrate` step tolerates migration rows it has no file for is **unverified**. Otherwise the
   rollback is to **restore the pre-deploy backup** taken in checklist step 2, following the exact steps in
   [Restoring for real](#restoring-for-real-after-a-disaster-or-a-bad-release) (not repeated here), and then
   ship a corrective forward migration. Orders placed after that backup are lost from the restored database:
   decide with the owner how they are re-entered from the logs and the customers' confirmations before
   restoring.
4. **After any rollback**, repeat checklist step 11 (one real order and one lookup, no `[turnstile]` or
   `[order-guard]` lines) and confirm `/api/health` returns 200.

## Release

The version tag is cut **by the owner**, after every box in the [Launch checklist](#launch-checklist) is ticked
(this milestone, `M59`, does not create a tag). On the release commit, as an owner command (shown, not run):

```sh
git tag -a v1.0.0 -m "GoCart Pakistan v1.0.0: first production release"
git push origin v1.0.0
```

At that time add one entry at the top of `docs/CHANGELOG.md` under a `## [1.0.0] - <date>` heading: the date,
the commit the tag points at, which launch checklist steps were verified on the real VPS and which were
accepted by the owner instead (the Next.js blocker in particular), and the `npm audit` totals on that
commit. Keep that commit and tag as the "previous release" that [Rollback](#rollback) redeploys.

## Launch decisions

Owner decisions `M59` needs. The recommended default is what the runbook assumes; nothing is decided until
the owner says so. DEPLOYMENT.md line numbers are as of commit `1afc575`, before this section was added; use
the section names to find them in the current file.

| Decision | Recommended default | Source |
|---|---|---|
| Hostname (`NEXT_PUBLIC_SITE_URL`) | The real `https://` origin, decided before the first build. It is **build-time**, so a change needs a rebuild. Replace the sample `shop.example.com`, which `check-env` does not reject; the Turnstile widget must be for exactly this host (`www.` versus bare). | `docs/DEPLOYMENT.md` 265, 286-290, 379-383 |
| Turnstile keys | Managed widget for the production hostname; the site key is build-time, the secret key goes in the env file; never test keys. | `docs/DEPLOYMENT.md` 267-269, 379-388; ADR-035/036 |
| Cloudflare WAF rule | `POST` to `/cart` and `/orders`. Paid plan: about 30 requests/min/IP, Block or Managed Challenge. Free plan (reported, unverified): about 10 POSTs per 10 s per IP, action Block. | `docs/DEPLOYMENT.md` 586 |
| Tunnel token and hostname order | Create the tunnel and put `TUNNEL_TOKEN` in the env file; attach the public hostname only after the gated deploy succeeds. | `docs/DEPLOYMENT.md` 15-20, 328-333 |
| Env file location | Outside the checkout, mode 600, passed with `--env-file`; an off-host copy in a password manager. | `docs/DEPLOYMENT.md` 247-254 |
| Bootstrap admin removal | Remove both lines after the first successful deploy and re-run the gate. | `docs/DEPLOYMENT.md` 476-477 |
| Backup schedule, encryption, off-host | Daily while orders flow and before every schema-changing deploy; `BACKUP_PASSPHRASE_FILE` set; `.gpg` copies kept off the VPS; a `cron` job is not written or verified. | `docs/DEPLOYMENT.md` 172-187 |
| Restore drill | Run `backup-verify.sh` once and rehearse the manual restore once on a scratch machine before launch. | `docs/DEPLOYMENT.md` 189-199, 232-233 |
| Uptime monitor | External monitor on `https://<host>/api/health` (200 expected). | `docs/DEPLOYMENT.md` 587; `docs/DECISIONS.md` 1241 |
| Email (order notifications) | **Confirm the owner accepts launching without any order email.** ADR-015 names Resend, but no application code uses it (grep of `app`, `lib`, `collections`, `package.json` finds nothing), and which emails to send is unspecified. | `docs/DECISIONS.md` 319, 328; `docs/PROJECT_SPEC.md` 71 |
| Image optimizer | Stays off (`images.unoptimized: true`, `/_next/image` returns 404). Re-enabling is a later owner decision. | `docs/DEPLOYMENT.md` 552-557; `next.config.mjs` 30-39 |
| Memory limits; `read_only` for `cloudflared` and `postgres` | Open: the owner accepts the risk for launch or defers it to a hardening milestone. | `docs/DECISIONS.md` 1241; `docs/CHANGELOG.md` 42, 81; `docs/DEPLOYMENT.md` 570 |
| GitHub Actions pinned by SHA | Open: actions are pinned by tag, not SHA (CHANGELOG `M52` review). Owner accepts or defers. | `docs/CHANGELOG.md` 81 |
| `npm audit` | Re-run on the release commit; launch only after `M79` is merged (ADR-040 is Accepted, 2026-10-24) (or the owner explicitly accepts the open advisories). | `docs/DEPLOYMENT.md` 576-578 (item 1, rewritten by `M59`); `docs/MIGRATION_PLAN.md` 1380-1387 |

## Launch blockers

The stack is **not cleared for launch** until every item is done or explicitly accepted by the owner:

1. **FIXED ON BRANCH, NOT MERGED: Next.js advisories published after `M52c`.** `M52c` (ADR-037) upgraded to
   `next@16.3.8`, which was clean when it was done. On 2026-10-24 `npm audit` reported it as **critical**
   (vulnerable range `16.0.0 - 16.4.0`): GHSA-2464-fhr4-w9xw (RCE in the Image Optimization API; also
   mitigated by configuration, see [Image optimisation](#image-optimisation)), GHSA-p3m5-59mp-jv5r (denial of
   service through App Router Server Actions, reachable without logging in) and GHSA-673q-mjm6-r5xr (RCE in
   `use cache`; no matching code in this repository). `M79` (branch `m79/next-16-4`) sets `next` and
   `eslint-config-next` to 16.4.2 and the `undici` override to 7.30.1. Verified on that branch: `npm audit`
   went from **18 vulnerabilities (1 low, 11 moderate, 4 high, 2 critical)** to **11 (1 low, 6 moderate,
   3 high, 1 critical)** and lists neither `next` nor `undici`. The one remaining critical is `dompurify`
   (admin-side, waits for a Payload release; do not apply the `npm audit fix` downgrade of
   `@payloadcms/richtext-lexical`). Still open: the change must be merged (ADR-040 is Accepted,
   2026-10-24), CI must be green, and it must be deployed. Re-run `npm audit` before launch and after every
   dependency change.
2. **Real Cloudflare checks with REAL keys** (not yet observed): with real Turnstile keys on the real
   hostname, a verified order and a lookup produce no `[turnstile]` or `[order-guard]` lines. (CI already
   passes the `turnstile-contract` job and a golden path through the real widget and siteverify, but with
   Cloudflare's public TEST keys, which skip the hostname and action checks.)
3. **First deploy checks**: the migrate step succeeded, `/admin` login works with the bootstrap credentials,
   the two bootstrap variables are removed from the env file, `cloudflared` connects with the real tunnel
   token, and the CI `prod-stack` job stays green (it passed on the commit this section was written against).
4. **A Cloudflare WAF rate-limiting rule** on `POST` to `/cart` and `/orders` (on a paid plan, for example 30 requests per minute per IP, action Block or Managed Challenge; the Free plan is reported, unverified, to allow one rule with a 10-second counting window, a 10-second block and the Block action only, so use about 10 POSTs per 10 seconds per IP there). It is the defence against a distributed flood of junk tokens that would otherwise hold the 50 verification slots and make the strict policy refuse every customer; the application's per-client limits stop one address or one IPv6 /48, not a botnet. Not verifiable from this repository.
5. **Backups** (`M54`): the scripts and the procedure exist; still open: a first real backup and a `backup-verify.sh` run on the real VPS, copies kept off the host, and a schedule. **Health checks** (`M53`, implemented): point an external uptime monitor at `https://<host>/api/health` (expects 200); `docker compose ps` should show `app` as `healthy`.

## Not covered yet

- **This runbook has not been run on a clean VPS.** It was written and checked against the repository
  (scripts, compose file, env contract, `package.json`), not executed; every step that needs Docker, a VPS
  or Cloudflare is unverified until the owner follows it.
- The release tag `v1.0.0` is not cut (owner, after the [Launch checklist](#launch-checklist)).
- The Next.js blocker ([Launch blockers](#launch-blockers), item 1) is fixed on branch `m79/next-16-4` and open until it is merged to `main` (ADR-040 is Accepted, 2026-10-24).
- An automated backup schedule (no `cron` job exists), an off-host copy, a restore drill on a real stack and
  an external uptime monitor (`M54` has the scripts and the manual procedure).
- Memory limits, and `read_only` for `cloudflared` and `postgres` (not testable here).
- Order notification email (ADR-015 names Resend; no code uses it).
- GitHub Actions are pinned by tag, not by SHA.
