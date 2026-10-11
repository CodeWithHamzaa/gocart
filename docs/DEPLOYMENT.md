# Deployment

Production deployment of GoCart Pakistan. **This file covers the Cloudflare Tunnel origin boundary,
environment validation and secrets (`M52`, [ADR-033](./DECISIONS.md)), the database migration
workflow (`M52a`, [ADR-032](./DECISIONS.md)) and Cloudflare Turnstile with the CGNAT-safe order rate
limits (`M52b`, [ADR-035](./DECISIONS.md), amended by [ADR-036](./DECISIONS.md): a verified token is
required, orders are idempotent, the first admin comes from a secret, the app uses a restricted database
role). `M53` adds health checks; `M54` adds backups; `M59` is the full runbook.**

> **Launch blockers (read first).** The stack is **not cleared for launch**. See
> [Launch blockers](#launch-blockers) at the end of this file: the Next.js upgrade (critical advisories on
> `next@15.4.11`), the first real-Cloudflare checks and the first-deploy checks.

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
(ADR-036): `next@15.4.11` has critical advisories in the Image Optimization API (see
[Launch blockers](#launch-blockers)). `next.config.mjs` sets `images.unoptimized: true` (product images are
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

## Launch blockers

The stack is **not cleared for launch** until every item is done or explicitly accepted by the owner:

1. **Upgrade Next.js to a patched version (critical).** `next@15.4.11` is affected by 30 advisories, two
   critical (`GHSA-2xp9-vwfh-vxw4`, Image Optimization API RCE with AVIF; `GHSA-p293-qw3h-jr36`, Windows-only
   RCE) and several high (including `GHSA-m99w-x7hq-7vfj`, a Server Actions DoS that applies to the public
   checkout). All are fixed only in 15.5.x or later, and Payload 3.90.x excludes 15.5.x, so the upgrade is to
   **Next 16.3.3 or later** with Payload 3.90.x, a major upgrade with its own regression pass (for example
   `next lint` is removed in Next 16). The interim mitigations (optimizer off, `/_next/image` closed,
   narrower upload types) remove the image-optimizer surface only; they do **not** address the Server Action
   DoS or the other advisories. Re-run `npm audit` after the upgrade.
2. **Real Cloudflare checks** (never observed by anyone so far): with real Turnstile keys on the real
   hostname, a verified order and a lookup produce no `[turnstile]` or `[order-guard]` lines; the CI
   `turnstile-contract` job and the golden path are green.
3. **First deploy checks**: the migrate step succeeded, `/admin` login works with the bootstrap credentials,
   the two bootstrap variables are removed from the env file, `cloudflared` connects with the real tunnel
   token, and the CI `prod-stack` job is green.
4. **A Cloudflare WAF rate-limiting rule** on `POST` to `/cart` and `/orders` (for example 30 requests per minute per IP, action Block or Managed Challenge). It is the defence against a distributed flood of junk tokens that would otherwise hold the 50 verification slots and make the strict policy refuse every customer; the application's per-client limits stop one address or one IPv6 /48, not a botnet. Not verifiable from this repository.
5. **Backups** (`M54`) and **health checks** (`M53`).

## Not covered yet

Health checks (`M53`: `cloudflared` should then depend on `app` being healthy, not merely started);
backups and restore drills (`M54`); `read_only` for `cloudflared` and `postgres` hardening (not testable
here); the full deploy runbook (`M59`).
