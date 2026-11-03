# Free test deployment: Vercel Hobby + Neon Free + Vercel Blob

**This is a personal, non-commercial TEST environment. It is not production.** Vercel's Hobby plan
is for non-commercial use only. Before any commercial or client launch, move to paid hosting or to
the production stack in [DEPLOYMENT.md](./DEPLOYMENT.md) ([ADR-015](./DECISIONS.md)). Decision and
trade-offs: [ADR-046](./DECISIONS.md), milestone `M100`. It supersedes none of ADR-015, ADR-020,
ADR-032 or ADR-036, and it closes no launch blocker.

> **Checkout is non-functional on this deployment: Turnstile keys are not configured (owner
> decision, 2026-10-30).** Placing an order and looking one up both need a verified Turnstile token
> ([ADR-035](./DECISIONS.md)). Browsing, product pages and the admin work.

> **Names:** the store is **Mirza** ([ADR-047](./DECISIONS.md)). The Vercel project, Neon project, Blob store
> and URL keep their `gocart-test` names on purpose.

## Architecture

```
browser -> Vercel (Next.js 16 + embedded Payload, functions in iad1) -> Neon Free Postgres 17 (pooled, us-east-1)
                      |
                      +-> Vercel Blob (media files; the browser uploads straight to Blob)
```

| Piece | Name | Notes |
|---|---|---|
| Vercel project | `gocart-test` | Personal (Hobby) scope, framework Next.js, function region `iad1` |
| Neon project | `gocart-test` | AWS us-east-1, Postgres 17 (same major version as the local Docker database) |
| Blob store | `gocart-test-media` | Connected to the project; Vercel sets `BLOB_READ_WRITE_TOKEN` |

There is no Cloudflare, no Docker and no `migrate` service on this target.

## Environment variables (Production scope)

| Variable | Value |
|---|---|
| `DATABASE_URI` | Neon **pooled** connection string for the restricted **`gocart_app`** role (ADR-036). Never the owner role. Never commit or print it |
| `PAYLOAD_SECRET` | Freshly generated for this environment, e.g. `openssl rand -hex 32`; never reuse a local one. The app refuses to start in production without it (`payload.config.ts`) |
| `NEXT_PUBLIC_SITE_URL` | The production `https://<project>.vercel.app` URL. It is read at build time, so **redeploy after changing it** |
| `BLOB_READ_WRITE_TOKEN` | Set by Vercel when the Blob store is connected. With it unset the app uses the local `./media` volume |

Not set, on purpose: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (owner decision, see
above), `TURNSTILE_ALLOW_TEST_KEYS` and `PAYLOAD_ALLOW_FIRST_REGISTER` (check-env forbids both in production).

### What `scripts/check-env.ts` requires in production (the Docker `deploy:migrate` gate)

`check-env` runs only as the first step of `npm run deploy:migrate` in the Docker `migrate` service.
It does **not** run in `next build` or at app startup, so missing Turnstile keys block neither on Vercel.
It is not weakened, and no test keys or bypass flag are used. For reference, it requires:

| Variable | Purpose | On this deployment |
|---|---|---|
| `PAYLOAD_SECRET` | signs admin sessions, >= 32 chars | generated, set on Vercel |
| `DATABASE_URI` | Postgres connection | Neon, set on Vercel (`gocart_app`, pooled) |
| `NEXT_PUBLIC_SITE_URL` | public https origin | the `*.vercel.app` URL, set on Vercel |
| `POSTGRES_PASSWORD` | superuser password; must match the `DATABASE_URI` password in the Docker `migrate` step | Docker only; not used on Vercel |
| `APP_DB_PASSWORD` | password of the `gocart_app` role | generated, used by `scripts/db-roles.ts`, embedded in Vercel's `DATABASE_URI` |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile keys | **needs a Cloudflare account; not created (owner decision)** |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | first admin, used by `scripts/bootstrap-admin.ts` | supplied only to the one-off bootstrap run, never stored on Vercel |

## Database

The schema comes from the committed migrations in `/migrations` ([ADR-032](./DECISIONS.md)); nothing is
pushed automatically and **`prodMigrations` is not enabled**. Migrations run as an explicit step with the
Neon **owner** role, the same order as `deploy:migrate` minus the Docker-only `check-env`:

```bash
# DATABASE_URI = Neon OWNER connection string for these four steps only
npx payload migrate
npx tsx scripts/verify-migrations.ts
APP_DB_PASSWORD=... npx tsx scripts/db-roles.ts     # creates/updates the restricted gocart_app role
ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD=... npx tsx scripts/bootstrap-admin.ts
```

If Neon is not reachable from the deploying machine on port 5432, a throwaway script outside the repo may run
the committed migrations over Neon's serverless driver on port 443. If that is not feasible either, stop and
report; do not invent another path.

`db-roles.ts` grants `gocart_app` `SELECT, INSERT, UPDATE, DELETE` on all public tables, `USAGE, SELECT` on
sequences and `USAGE` on the schema (`scripts/db-roles.ts:50-55`), revokes writes to `payload_migrations`
(`:57`) and sets default privileges for later tables (`:59-60`). Those are table-level grants, so the `M100`
columns `media.prefix` and `media._objectkey` are covered (checked with `has_column_privilege`).
Do not point `payload migrate` at a database that development populated by auto-push (see
"Never migrate a database populated by development" in [DEPLOYMENT.md](./DEPLOYMENT.md)).

## Limits and known gaps

Figures come from the owner's brief and are **unverified**; check the vendor pages before relying on them.

- **Vercel Hobby / Blob:** Blob storage is capped at about 1 GB with monthly operation limits.
  Exceeding a Hobby or Blob limit can lock the account out for 30 days. A serverless function cannot
  accept a large request body, which is why uploads go browser -> Blob (`clientUploads`). Keep Blob
  operations low: seed once.
- **Neon Free:** the database scales to zero when idle; the first request afterwards is slow (cold start).
- **Rate limits are weaker than in production (found, not fixed):** the limiter is in memory per process
  ([ADR-026](./DECISIONS.md)), so on serverless it counts per instance, and the client IP is read only
  from `cf-connecting-ip` ([ADR-033](./DECISIONS.md)); with no Cloudflare in front, all visitors share
  one `unknown` bucket. Do not treat the limits as protection.
- **Checkout and order lookup:** non-functional until Turnstile keys exist (see the notice at the top).
- **Images:** `images.unoptimized` stays `true`; only the Blob host is added to `remotePatterns`.

## What is verified, and how

Live checks on the deployment: storefront pages and a product page return 200, `/admin` login works, and
one test image uploads to Blob, is served and is deleted. Server-side order totals and rate limiting are
**not** tested live (checkout is off); they are covered by CI: the `e2e` job (golden-path order against a
seeded database), `npm run test:idempotency`, `npm run test:turnstile` and `npm run test:users-guard`.

## Verified state (2026-11-03)

Read through the authorised Vercel and Neon connectors (read-only calls; no value of any secret was
requested or printed). Re-check before relying on it; anything not in this list is not verified.

| Item | Observed |
|---|---|
| Vercel project | `gocart-test`, Hobby scope, Node 22.x, not Git-connected. Domains: `gocart-test-inky.vercel.app` (the `NEXT_PUBLIC_SITE_URL`) and two `*.vercel.app` aliases. Deployment protection reported as `ssoProtection: all_except_custom_domains` (which URLs that leaves public was not checked) |
| Deployed code | Two READY production deployments: 2026-10-30 (no Git metadata, `M100`) and 2026-11-01 from `main` at **`a6aedc1`** (`M102`), the current one. Everything merged after it (`M103`–`M108` tooling, PR #60) is **not deployed** |
| Environment variables (Production) | `DATABASE_URI` and `PAYLOAD_SECRET` (type *sensitive*), `NEXT_PUBLIC_SITE_URL` (plain), `BLOB_READ_WRITE_TOKEN` (type *encrypted*, all three targets; Vercel flags it `readable-secret`). **No** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: real-key Turnstile is not configured, so checkout and lookup stay off |
| Neon | Project `gocart-test`, AWS us-east-1, Postgres 17, 0.25 CU, scale-to-zero; branches `main` (default) and `backup-before-m101-m102-2026-11-01` |
| Schema | `payload_migrations` holds all 8 committed migrations (6 in batch 1, `mirza_store_name` and `flat_categories` in batch 2), the same 8 as `/migrations` on `main`. Roles `neondb_owner` and `gocart_app` exist; `gocart_app` has `SELECT, INSERT, UPDATE, DELETE` on `media` |
| Data | 24 products, 10 categories, 63 media rows (all `.webp`, all created 2026-10-30, generated art), 48 product image links, 1 admin user, 0 orders |
| Blob store | `gocart-test-media`, iad1, public access, connected to `gocart-test` only, 63 objects, 726,320 bytes (matches the 63 media rows), quota not exceeded, token not expired |
| Code (repo, not a connector) | `collections/Orders.ts:44`: `delete` is allowed for any logged-in user, and only admins can log in (ADR-006), so admins can delete orders, which ADR-049 had listed as unverified for `M109` |
| CI on `main` | The `CI` workflow succeeded on the last five pushes to `main`, including PR #59 (`8a6ccdf`) and PR #60 (`4ae9dfe`) |

Not verified: an HTTP check of the live pages (the cloud session's network policy denies `*.vercel.app`);
the Hobby/Blob plan limits (not exposed by the connector); real Neon/Blob behaviour of the `M108` tool.

**Recommended owner actions (not done by the team):**
- Redeploy `main` to `gocart-test` when you want `M107` and PR #60 live there. There are no new
  migrations since `a6aedc1`, so no migrate step is needed first. The `M108` spec says the team does
  not deploy unless you ask.
- Mark `BLOB_READ_WRITE_TOKEN` *Sensitive* in Vercel (Settings, Environment Variables), which needs
  the value re-entered; rotating the token at the same time is the clean way to do it.

## Demo photo rollout (`M108`, ADR-049 item 6)

**Status (2026-11-03): not run.** Expected result from a read-only pre-flight on Neon: all 24 demo
products and 10 demo categories exist, so a run should report **58 to upload, 34 to relink, 0 to
create** and no skipped targets. A different dry-run count means the database changed: stop and look.

How the upload path works (read from the installed adapter source, `@payloadcms/plugin-cloud-storage`
`dist/hooks/afterChange.js` and `@payloadcms/storage-vercel-blob` `dist/uploadFile.js`, version 3.90.2): a server-side `payload.create` file has no `clientUploadContext`, so the Blob
adapter uploads it itself with `put(..., { allowOverwrite: true, addRandomSuffix: false })`. A name
clash is avoided because Payload renames a filename that a media row already uses (`a.webp` becomes
`a-1.webp`). Residual risk: a Blob object with no media row would be overwritten silently; today every
one of the 63 objects has a row.

Puts the licensed demo photos on this test site. Test only; never production. Run it from a machine that
has the processed photos (`npm run process:demo-images`, git-ignored `demo-assets/_processed/`) and a route
to Neon and Blob.

1. Create an env file **outside the repository** (`.gitignore` now ignores `.env.*` too, but keep it out anyway) with
   `DATABASE_URI` (Neon; the restricted `gocart_app` role is enough; the pooled string with `sslmode=require` as
   Neon gives it, and no extra `host=` or `port=` parameter, which the tool refuses), `PAYLOAD_SECRET`,
   `BLOB_READ_WRITE_TOKEN` and `DEMO_ROLLOUT_DB_HOST` (the exact Neon host you mean to change). Never commit,
   paste or print these values.
2. Dry run (writes nothing): `npx tsx --env-file=<that file> scripts/rollout-demo-photos.ts --env test`
3. Read the counts, then apply: add `--apply`. Add `--create-missing` only if the test database lacks the demo
   categories or products (otherwise they are listed and skipped). Reruns upload nothing.
4. It records `media_id` and `media_env=test` in `docs/assets/MANIFEST.csv` (commit that change) and appends
   each uploaded media id to a rollback log (`rollout-test-<time>.jsonl`) in `demo-assets/_processed/`. It also
   sets `PAYLOAD_MIGRATING=true` so Payload does not push a dev schema to Neon; migrations stay a separate
   step. `DEMO_ROLLOUT_DB_HOST` only proves you named the host twice: make sure it is the test database.
5. Check `/`, `/shop`, a category, a product and `/cart` on the test URL; images must come from the Blob host.

Nothing is deleted: media that no longer has a reference is left for `M109`'s reference-checked cleanup.
Rollback of a rollout: relink in `/admin` or re-seed, then remove the logged media ids after a reference check.
Blob Hobby operation limits are unverified; one full rollout is 58 uploads.

## Redeploying

Push to `main`, or run a production deploy of `gocart-test` through the Vercel API or CLI. After changing
any `NEXT_PUBLIC_*` variable, redeploy so the value is rebuilt in. After adding a migration, run
`npx payload migrate` (owner role) against Neon **before** the new code serves traffic.

**Record of the 2026-11-01 rollout (`M101` + `M102`), done from a cloud session at the owner's request:**
- The `gocart-test` project is not connected to Git, so merging does not deploy. The deploy was a Vercel API
  production deployment from GitHub (`CodeWithHamzaa/gocart`, `main` at `a6aedc1`). The dashboard's
  "Redeploy" button would rebuild the *old* source; do not use it to ship new code.
- Port 5432 to Neon was not reachable from the cloud session, so `payload migrate` could not connect. The
  two committed migrations' `up` SQL ran unchanged, in one transaction, through the Neon connector as the
  owner role, with the two `payload_migrations` rows (batch 2) that `payload migrate` writes. Checked
  afterwards with the same assertions as `scripts/verify-migrations.ts` plus the data (10 categories, 24 of
  24 products with a category, no `parent_id`). From a machine that reaches port 5432, use `payload migrate`.
- Order used: **deploy first, then migrate**, because the new code was checked to run on the old schema while
  the old code fails once `categories.parent_id` is dropped. Check this for each migration; the default rule
  above (migrate first) stands when old code still works on the new schema.
- A Neon branch `backup-before-m101-m102-2026-11-01` (no compute) holds the database as it was before.
  Delete it from the Neon console once it is no longer needed.

## Revoking access when you are done

1. Vercel: <https://vercel.com/account/tokens> -> delete the token used for deployment (tokens expire
   after 30 days in this setup; unverified).
2. Neon: console.neon.tech -> Account settings -> API keys -> revoke the key (these keys do not expire on their own).
3. Blob: Vercel dashboard -> Storage -> `gocart-test-media` -> rotate the read/write token, or delete the store.
4. To shut the environment down, delete the `gocart-test` Vercel project, the `gocart-test` Neon project and
   the `gocart-test-media` store. Nothing in production depends on them.
