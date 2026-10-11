# Deployment

Production deployment of GoCart Pakistan. **This file covers the Cloudflare Tunnel origin boundary,
environment validation and secrets (`M52`, [ADR-033](./DECISIONS.md)) and the database migration
workflow (`M52a`, [ADR-032](./DECISIONS.md)).** `M53` adds health checks; `M54` adds backups; `M59` is
the full runbook.

Order of work for a first deploy: [Secrets and the env file](#secrets-and-the-env-file) ->
[Cloudflare: one-time steps](#cloudflare-one-time-steps) (create the tunnel, do NOT attach the public
hostname yet) -> [first deploy](#deploying-a-release) -> [create the first admin](#create-the-first-admin-before-the-site-is-public)
-> attach the public hostname.

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
  `scripts/verify-migrations.ts`. An invalid environment fails `migrate` before the database is touched.
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
- An **empty database needs no seeding**: the committed initial migration creates the whole schema.
  The catalog starts empty and the first admin user is created through `/admin` (the create-first-user
  screen). Until that is done, that screen is open to anyone who can reach the app, so create the
  first admin before the public hostname is attached: see
  [Create the first admin](#create-the-first-admin-before-the-site-is-public).

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
  (umask 077; $PROD exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > gocart-$(date +%F-%H%M).sql)
  ```

  The dump is **unencrypted customer personal data** (names, phones, addresses). It is created with
  `umask 077` so it is mode 600; keep it that way, store it **off the host**, and **encrypt it** before it
  leaves the machine. `M54` formalises backups and encryption.
- Uploaded media lives in the `app-media` volume and is not covered by `pg_dump`.

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
PAYLOAD_SECRET=REPLACE-ME-output-of-openssl-rand-hex-32
NEXT_PUBLIC_SITE_URL=https://shop.example.com
TUNNEL_TOKEN=REPLACE-ME-paste-the-token-from-the-cloudflare-dashboard
```

Generate the two secrets with `openssl rand -hex 24` (`POSTGRES_PASSWORD`) and `openssl rand -hex 32`
(`PAYLOAD_SECRET`). The first start validates them: a rejected value fails `migrate` before any data
is touched, naming the variable and rule.

**`.env.example` has NOT been updated.** It could not be read or edited in the session that wrote this,
so it still does not document `TUNNEL_TOKEN`, the strength rules or the `POSTGRES_PASSWORD` character set
(ADR-033 requires it to; that remains open under `M52`). Until it does, the guide is this section plus
the header of `docker-compose.prod.yml`.

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

## Create the first admin before the site is public

Payload's create-first-user flow is open while no user exists: `/admin/create-first-user` renders and
`POST /api/users/first-register` creates an admin for **whoever sends it first**. Verified against the
production stack on an empty database: `GET /api/users/init` returns `{"initialized":false}`, the
create-first-user screen is served, an unauthenticated `first-register` returns 200 and creates the
user, and from then on `first-register` and `POST /api/users` return 403 (`initialized: true`).
`collections/Users.ts` leaves this built-in behaviour as is. So the first admin must exist before the
public hostname is attached to the tunnel.

Because the app publishes no port, create it from inside the stack (the credentials are read from
stdin, so they are not in the process list or the shell history; type a space before the command to
keep it out of history if your shell supports that):

```sh
$PROD up -d --build        # first deploy; the tunnel has no public hostname yet, so nothing is exposed
read -r -p "admin email: " ADMIN_EMAIL; read -r -s -p "password: " ADMIN_PW; echo
printf '%s\n%s\n' "$ADMIN_EMAIL" "$ADMIN_PW" | $PROD exec -T app node -e "
let b='';process.stdin.on('data',d=>b+=d).on('end',async()=>{const [email,password]=b.split('\n');
const r=await fetch('http://127.0.0.1:3000/api/users/first-register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
console.log('first-register status',r.status);process.exit(r.ok?0:1)})"
unset ADMIN_EMAIL ADMIN_PW
```

Expect `first-register status 200`. Then attach the public hostname in the Cloudflare dashboard and sign in
at `https://<your-domain>/admin`.

**After ANY database wipe, volume loss or restore to an empty database, detach the public hostname FIRST,
recreate the admin with the script above, and only then re-attach the hostname.** Say plainly what this is:
only an operational control. While the `users` table is empty, Payload lets an unauthenticated request
create the first admin (verified above), so a code-level guard is an open owner decision. It is not built.

Reported, not built: the app could refuse to serve (or serve only `/admin`) until an admin exists, or
the first admin could be seeded from a secret; either would close this window without relying on
ordering. Neither exists; the ordering above is the control. Also note that if the database is ever
wiped, the window reopens.

## Rate limits in the real world

Order placement and order lookup are limited per client IP (`lib/client-ip.ts`; order placement is 5
orders per 15 minutes per IP). Things to know before launch:

- Pakistani mobile carriers use heavy carrier-grade NAT, so many legitimate customers can share one IP
  address and the per-IP order limit may affect them. This is pre-existing behaviour; the owner should
  review the limit.
- IPv6 clients are limited per `/64`, not per address.
- If the header is missing (for example "Remove visitor IP headers" is enabled), production sees the single
  shared `unknown` bucket and **all visitors share one budget**: a self-inflicted outage. It fails closed
  (never a bypass), so check for it after any Cloudflare zone change.

## Not covered yet

Health checks (`M53`: `cloudflared` should then depend on `app` being healthy, not merely started);
backups and restore drills (`M54`); hardening beyond `no-new-privileges` and `cap_drop: ALL` on the
`app`, `migrate` and `cloudflared` containers (`read_only` root filesystems and `postgres` hardening
were not attempted); the full deploy runbook (`M59`).
