# Deployment

Production deployment of GoCart Pakistan. **This file covers the Cloudflare Tunnel origin boundary,
environment validation and secrets (`M52`, [ADR-033](./DECISIONS.md)), the database migration
workflow (`M52a`, [ADR-032](./DECISIONS.md)) and Cloudflare Turnstile with the CGNAT-safe order rate
limits (`M52b`, [ADR-035](./DECISIONS.md)).** `M53` adds health checks; `M54` adds backups; `M59` is
the full runbook.

Order of work for a first deploy: [Secrets and the env file](#secrets-and-the-env-file) ->
[Cloudflare: one-time steps](#cloudflare-one-time-steps) (create the tunnel, do NOT attach the public
hostname yet) -> [Cloudflare Turnstile: one-time setup](#cloudflare-turnstile-one-time-setup) (create the
widget, put both keys in the env file) -> [first deploy](#deploying-a-release) -> [create the first admin](#create-the-first-admin-before-the-site-is-public)
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
| `TURNSTILE_SECRET_KEY` | (`M52b`) the Turnstile widget's **secret** key; runtime only, given to `app` (siteverify) and `migrate` (`check-env`). 20-200 characters, no whitespace, none of the forbidden words above, **not** a Cloudflare test key (anything shaped like `1x0000000000000000000000000000000AA`), and different from the site key. A credential. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | (`M52b`) the same widget's **public** site key (it is shipped to every browser; not a secret). 10-100 characters, no whitespace, no forbidden word, not a test key. **Build-time** for `app` (changing it needs `build`/`--build`); also passed to `migrate` at runtime so `check-env` can validate it. |
| `TURNSTILE_ALLOW_TEST_KEYS` | **must be unset or empty** in production (`check-env` fails otherwise). Development and CI only; `docker-compose.prod.yml` never passes it. |

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
TURNSTILE_SECRET_KEY=REPLACE-ME-secret-key-of-the-turnstile-widget
NEXT_PUBLIC_TURNSTILE_SITE_KEY=REPLACE-ME-site-key-of-the-turnstile-widget
```

The two Turnstile placeholders contain `REPLACE`, so `check-env` rejects them if copied unchanged. Do
**not** put `TURNSTILE_ALLOW_TEST_KEYS` in this file.

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

## Cloudflare Turnstile: one-time setup

`M52b` ([ADR-035](./DECISIONS.md)) verifies a Cloudflare Turnstile token on the server for order
placement (`/cart`) and order lookup (`/orders`). Turnstile is what lets many real customers behind one
carrier-grade-NAT IP order without hitting each other's limit (see
[Rate limits in the real world](#rate-limits-in-the-real-world)). Done by the owner in the Cloudflare
dashboard; it cannot be automated or verified from this repository.

1. In the Cloudflare dashboard, open **Turnstile** and **add a widget (site)** for the store's
   production hostname (the host of `NEXT_PUBLIC_SITE_URL`, e.g. `shop.example.com`). Choose
   **Managed** mode. The widget must be for exactly that hostname (watch `www.` versus the bare
   domain): a token whose `hostname` or `action` does not match is **degraded**, not accepted (see
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
   lines.** In particular, an ERROR line `[turnstile] degraded { reason: 'hostname-mismatch' }` or
   `{ reason: 'action-mismatch' }` means the widget's hostname in the Cloudflare dashboard or
   `NEXT_PUBLIC_SITE_URL` is wrong (for example `www.` versus the bare domain), and **every customer is on
   the strict degraded budget** (5 orders per 15 minutes per IP, and no CGNAT relief). Fix the widget
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
  secret (or the reverse) makes every token fail to verify. Rejected tokens never fall through to the
  degraded path, so customers would see "The security check didn't complete" until both match.
- If the secret key is exposed, rotate it in the Turnstile dashboard and follow the secret steps above.

### When Turnstile is unreachable (degraded mode)

The owner's outage policy is that sales keep running. If the widget cannot load in the browser (blocked
script, Cloudflare outage, old browser) the customer can still press Place Order / Check order. If
siteverify cannot be reached, times out (3 seconds, no retries) or answers with anything other than a
definite verdict, the request is **degraded**: it gets today's strict per-IP limit (5 orders per 15
minutes, 20 lookups per hour) in a **separate** bucket. Degraded orders are bounded **only** by that
per-IP budget; the per-phone limits count verified orders only. Customers who did verify are not
affected by degraded traffic from the same IP. A token that Cloudflare definitely rejects (invalid,
expired or already used) is refused, never degraded.

Degraded reasons, as they appear in `[turnstile] degraded { reason: ... }`:

| Reason | Meaning | Log level |
|---|---|---|
| `missing-token` | no token sent (widget failed to load, or a bot) | not logged |
| `network`, `timeout`, `http-status`, `bad-response`, `service-error` | Cloudflare unreachable, slow (over 3 s) or answered without a definite verdict | warning (`service-error` is an error when Cloudflare refuses our secret) |
| `busy` | more than 50 verifications already in flight in this process; the request skips siteverify | warning |
| `hostname-mismatch`, `action-mismatch` | Cloudflare verified the token, but for another hostname or action: a configuration error (see setup step 5) | **error** |
| `not-configured`, `test-key-not-allowed` | `TURNSTILE_SECRET_KEY` missing, `NEXT_PUBLIC_SITE_URL` unusable, or a test key without the dev/CI allow flag; production prevents these with compose `:?` and `check-env` | **error** |

Watch the app logs for `[turnstile]` lines after launch: any error-level line is a configuration problem
to fix at once; many warning lines with `network`, `timeout` or `http-status` mean the app cannot reach
Cloudflare; many `busy` lines mean a burst large enough that verification is being skipped. Tokens, IPs,
phone numbers and customer fields are never logged. (Log levels and reasons follow `lib/turnstile.ts`
as described by the security review; that file is the authority if they differ.)

### Privacy

The Turnstile script is loaded from Cloudflare (never self-hosted or proxied) **only on `/cart` and
`/orders`**, both `noindex`; no other page loads it. It collects browser signals in the visitor's
browser. The server sends Cloudflare only the token, the secret and the visitor's IP; **no customer data**
(name, phone, address, cart) is sent. If the store publishes a privacy notice, it should mention
Cloudflare Turnstile (owner).

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

Pakistani mobile carriers put many subscribers behind one public IPv4 address (carrier-grade NAT), so
one IP can be many real customers. Since `M52b` ([ADR-035](./DECISIONS.md)) the per-IP limit is only a
**flood ceiling**; customers who pass Turnstile are limited per phone number, not by the other people
sharing their IP. All limits are code constants in `lib/order-guard.ts` (changing them is a code change,
not configuration):

| What | Limit | Counts |
|---|---|---|
| Order placement, flood ceiling per IP | 30 per 15 minutes | every request with a well-formed phone, whatever the Turnstile outcome |
| Order placement, degraded (no token, Turnstile unreachable, `busy`, hostname/action mismatch) per IP | 5 per 15 minutes, separate bucket | every degraded request; the only limit on degraded orders besides the flood ceiling |
| Per phone number (normalised `03XXXXXXXXX`), verified orders only | 3 per hour **and** 10 per 24 hours | successful **verified** orders only (a failed order is refunded; degraded orders are not counted here, they are bounded by the degraded per-IP budget) |
| Order lookup, flood ceiling per IP | 60 per hour | every request with a well-formed order number |
| Order lookup, degraded per IP | 20 per hour, separate bucket | every degraded request |
| Failed lookups per order number | 5 per hour | `NOT_FOUND` only |

Things to know before launch:

- **Verified customers on a shared CGNAT IP are not limited by each other** below the flood ceiling of
  30 orders per 15 minutes per IP. Anyone on that IP can still use up the ceiling for 15 minutes; that is
  the same class of problem as before, with a six times higher bar.
- **New restriction on real customers**: one phone number can place at most 3 verified orders an hour
  and 10 a day. The customer-facing message tells them to contact the store; the admin can still enter
  orders by hand in `/admin`.
- During a Turnstile outage, or for a visitor whose widget cannot load, behaviour is exactly the
  pre-`M52b` limit (5 orders per 15 minutes per IP), in its own bucket.
- **Limiter state is in-process and resets on restart** (every deploy or container restart starts all
  counters at zero). Acceptable for the single instance of ADR-015; a second app instance would need a
  shared store.
- IPv6 clients are limited per `/64`, not per address.
- If the `cf-connecting-ip` header is missing (for example "Remove visitor IP headers" is enabled),
  production sees the single shared `unknown` bucket and **all visitors share one flood ceiling and one
  degraded budget**: a self-inflicted outage. It fails closed (never a bypass), so check for it after any
  Cloudflare zone change.
- **What to check at launch**: one real order and one order lookup through the real hostname, from a
  real phone on mobile data, should produce **no** `[turnstile]` log lines (a `hostname-mismatch` or
  `action-mismatch` error line means every customer is on the degraded budget: see
  [setup step 5](#cloudflare-turnstile-one-time-setup)); and "Remove visitor IP headers" is still off.
- Unverified until a real deploy: these limits behind real Cloudflare headers with real mobile-carrier
  traffic.

## Image optimisation

`M51` enables Next.js's built-in optimizer at `/_next/image`, configured in `next.config.mjs`: WebP
only, a closed list of widths (64, 128, 256, 384, 640, 828, 1080), quality 75, a one-day minimum cache
TTL, and sources limited to local `/api/media/file/**`. It needs no outbound network: it only fetches the
app's own files.

- **Cache location.** Variants are cached under `.next/cache/images` **inside the container's writable
  layer, not a volume**. A recreated container (every deploy) starts cold, so the first visit per image and
  width runs `sharp` (roughly 40-200 ms each on a development machine; expect more on a ~$10 single-vCPU
  VPS). A cold-cache burst after each deploy is normal and cheap at launch catalog size; you can warm it by
  requesting the home and shop pages after a deploy.
- **Growth.** Next 15.4 has no size cap on this cache. Growth is bounded by (media files x 7 widths) and it
  disappears when the container is recreated.
- **M53 note.** If the container root filesystem later becomes `read_only`, `/app/.next/cache` needs a
  tmpfs or a volume.
- **Upload rules for admins.** `next.config.mjs` sets `experimental.imgOptMaxInputPixels: 40_000_000`
  (40 megapixels, for example about 7000x5700). Larger source images are **not** optimised: the original
  file is served instead. Resize product photos to under about 4000 px on the long edge (and a few MB)
  before uploading. Do **not** upload SVG (the optimizer rejects it and the image would break) and do not
  put private files in Media (it is public-read).
- **Oversize images are a real cost.** An image over 40 MP is served as the original, and each requested
  width still caches a full copy of it (QA: a 54 MP / 18.6 MB test image produced about 130 MB of cache), and
  mobile devices download the full original. Resize before upload; this is not just advice.
- **Log noise.** A probe containing a NUL byte (`%00`) logs a Payload stack trace. It is cosmetic and the
  response is 400.
- **Accepted URLs.** The optimizer only accepts image URLs of the exact form Payload generates,
  `/api/media/file/<one path segment>`, with the query string pinned empty (`search: ''`). Anything else is
  rejected with a 404 before it reaches the optimizer. Verified (QA) on the Docker production image
  with 17 real uploaded files (including non-Latin names): 0 false rejections, and a set of about 45 abuse
  variants created no cache entries. Behind real Cloudflare it is unverified.
- **Replaced images** get a new filename (for example `lamp-1.jpg`), so there is no stale-image problem.
- **Cloudflare (not built, not verified: real Cloudflare behaviour).** `/_next/image` has no file
  extension, so Cloudflare does not cache it by default. If you add a cache rule, limit it to
  `/_next/image*`, respect the origin `Cache-Control`, and include `Accept` in the cache key (the optimizer
  varies on `Accept`). Because the endpoint is public and CPU-bound, a Cloudflare rate-limiting rule on
  `/_next/image` is the practical control.

## Not covered yet

Health checks (`M53`: `cloudflared` should then depend on `app` being healthy, not merely started);
backups and restore drills (`M54`); hardening beyond `no-new-privileges` and `cap_drop: ALL` on the
`app`, `migrate` and `cloudflared` containers (`read_only` root filesystems and `postgres` hardening
were not attempted); the full deploy runbook (`M59`).
