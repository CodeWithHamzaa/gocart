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

## Verified state (2026-11-03, updated after the redeploy; the Data and Blob store rows updated 2026-11-05 after the `M108` rollout)

Read through the authorised Vercel and Neon connectors; no value of any secret was requested or
printed. Re-check before relying on it; anything not in this list is not verified.

| Item | Observed |
|---|---|
| Vercel project | `gocart-test`, Hobby scope, Node 22.x, not Git-connected. Domains: `gocart-test-inky.vercel.app` (the `NEXT_PUBLIC_SITE_URL`) and two `*.vercel.app` aliases. Deployment protection reported as `ssoProtection: all_except_custom_domains` (which URLs that leaves public was not checked) |
| Deployed code | **`main` at `9183777`** (PR #61), deployed 2026-11-03 at the owner's request: `dpl_9vxaFkYF…` then, after the Blob token change below, `dpl_AwfA3Y1u…` (current, READY, aliased to `gocart-test-inky.vercel.app`). Earlier: 2026-11-01 `a6aedc1` (`M102`, `dpl_254K…`, kept as the rollback candidate) and 2026-10-30 (`M100`). No migration was pending (the 8 on Neon equal the 8 in `/migrations`), so no migrate step ran |
| Live checks (2026-11-03, through the connector's fetch) | 200: `/api/health` (`{"status":"ok"}`), `/`, `/shop`, `/categories`, `/category/headphones`, `/category/watches`, `/product/24`, `/cart`, `/wishlist`, `/admin/login`; 404: `/category/does-not-exist`. **`M107` is live**: `og:image` on home, shop, categories, category and product pages (the category page had none before the redeploy; the others were not fetched before) and the category photo in the category banner; the product main image uses its own alt ("Citrus Mist Body Spray, view 1"). PR #60 (`disableCreateDatabase`) is in the deployed commit; the database connects (health and pages). A Blob-backed file (`/api/media/file/category-headphones.webp`) returns 200 `image/webp`, 12,164 bytes, equal to its media row |
| Environment variables (Production) | `DATABASE_URI` and `PAYLOAD_SECRET` (type *sensitive*), `NEXT_PUBLIC_SITE_URL` (plain), `BLOB_READ_WRITE_TOKEN` (all three targets; was type *encrypted*, which Vercel flags `readable-secret`; **changed to *sensitive* in place on 2026-11-03**, see below; no variable now has a security issue). **No** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: real-key Turnstile is not configured, so checkout and lookup stay off |
| Neon | Project `gocart-test`, AWS us-east-1, Postgres 17, 0.25 CU, scale-to-zero; branches `main` (default) and `backup-before-m101-m102-2026-11-01` |
| Schema | `payload_migrations` holds all 8 committed migrations (6 in batch 1, `mirza_store_name` and `flat_categories` in batch 2), the same 8 as `/migrations` on `main`. Roles `neondb_owner` and `gocart_app` exist; `gocart_app` has `SELECT, INSERT, UPDATE, DELETE` on `media` |
| Data | 2026-11-05, after `M108`: 24 products, 10 categories, **121 media rows** (the 63 generated-art rows of 2026-10-30 are kept, unreferenced; 58 new photo rows, ids 66-123), 48 product image links all on the new media, every category image on new media, 8 migrations, 1 admin user, 0 orders (admin user and orders not re-checked on 2026-11-05) |
| Blob store | `gocart-test-media`, iad1, public access, connected to `gocart-test` only. 2026-11-05, after `M108`: **121 objects, 3,429,002 bytes** (matches the 121 media rows; was 63 objects, 726,320 bytes), quota not exceeded, token not expired |
| Code (repo, not a connector) | `collections/Orders.ts:44`: `delete` is allowed for any logged-in user, and only admins can log in (ADR-006), so admins can delete orders, which ADR-049 had listed as unverified for `M109` |
| CI on `main` | The `CI` workflow succeeded on every push to `main` checked, including PR #59 (`8a6ccdf`), PR #60 (`4ae9dfe`) and PR #61 (`9183777`, the deployed commit) |
| Runtime log | One recurring warning, pre-existing since 2026-10-30: `pg` says `sslmode=require` is treated as `verify-full` and will change meaning in pg v9. Not an error; found, not fixed (switching the string to `sslmode=verify-full` is an owner edit of the sensitive `DATABASE_URI`) |
| Admin page | `/admin/login` advertises `og:image` `http://localhost:3000/api/og…`: Payload's `serverURL` is not set. Cosmetic (admin only, `noindex`); found, not fixed |

Not verified: the Hobby/Blob plan limits (not exposed by the connector); real Neon/Blob behaviour of
the `M108` tool. Live pages were fetched through the Vercel connector (it creates a temporary share
link, which expires after 23 hours); the cloud session itself cannot reach `*.vercel.app`.

### `BLOB_READ_WRITE_TOKEN`: why it was flagged and what was done (2026-11-03)

- **Why**: Vercel connected the Blob store with a variable of type *encrypted*, which is a readable
  *config* value: anyone with access to the project can decrypt it in the dashboard or through the
  API. Vercel reports that as `readable-secret`. Its supported form for credentials is type
  *sensitive* (visibility *secret*): write-only once saved, readable only by the running deployment.
- **Done**: the variable was switched to *sensitive* in place through the Vercel API (only the
  `type` field was sent, so the value never passed through the session), the project was redeployed,
  and the new deployment serves Blob files (the check above). Vercel now lists no security issue for
  any variable of the project.
- **Not done: rotation.** There was no sign of exposure (no evidence it was ever decrypted, and the
  Hobby scope has one member), and the Vercel connector has no Blob-token rotation call. If you want
  to rotate anyway: Vercel dashboard, Storage, `gocart-test-media`, rotate the read-write token; the
  connected variable is updated by Vercel; redeploy afterwards.
- Consequence for `M108`: because the variable is now write-only, the token cannot be read back from
  Vercel by anyone, the team included. Whoever runs the rollout copies a token from the Blob store's
  page in the dashboard (or rotates one) into their own env file.

## Demo photo rollout (`M108`, ADR-049 item 6)

**Status (2026-11-05): DONE on the test site.** The rollout ran through the GitHub Actions workflow, every run approved by the owner: dry run [42019925812](https://github.com/CodeWithHamzaa/gocart/actions/runs/42019925812), apply [42020705613](https://github.com/CodeWithHamzaa/gocart/actions/runs/42020705613), rerun dry run [42021938362](https://github.com/CodeWithHamzaa/gocart/actions/runs/42021938362).

- **Dry run:** target host masked and labelled `(test)`; `media: 0 already on the test site, 58 to upload; rows: 34 to relink, 0 already correct, 0 to create`; the Security and QA roles reviewed the log (no secret-like text; counts as expected; no skipped-targets line, so no missing product or category).
- **Apply:** `media: 0 already on the test site, 58 uploaded; rows: 34 relinked, 0 already correct, 0 created`; the manifest recorded 58 rows with `media_env=test`.
- **Rerun dry run:** `media: 58 already on the test site, 0 to upload; rows: 0 to relink, 34 already correct, 0 to create`; media count (121) and max id (123) unchanged afterwards.
- **Neon after apply (read-only SQL):** 58 new media rows with ids 66-123; 63 rows with ids up to 65 still present; all 24 products have two image links on new media (48 of 48); all 10 categories have `image_id` on new media; `payload_migrations` unchanged at 8; counts of products (24) and categories (10) unchanged.
- **Blob after apply:** 121 objects, 3,429,002 bytes (was 63 and 726,320).
- **Storefront after apply** (`gocart-test-inky.vercel.app`, through the Vercel connector): `/`, `/shop`, `/categories`, `/category/headphones`, `/product/3` and `/cart` return 200; the `/api/media/file/` image sources on those pages are the new files only; `category-headphones-1.webp` (11,316 bytes), `category-skincare-1.webp` (4,856) and `cylinder-mini-speaker-3.webp` (68,396) return 200 `image/webp` with the byte size of their media row. The new files carry Payload's collision suffix (`-3` and `-4` for products, `-1` for categories) because the old art held the plain names.
- **Manifest:** `docs/assets/MANIFEST.csv` (from the apply run's artifact) records `media_id` 66-123 and `media_env=test` on the 58 media rows; no other column changed, and its 58 id/size pairs equal the Neon rows. The OG image and the two promo rows are not media-collection items and stay blank. The rollback log was not committed (it is git-ignored and expires with the artifact after 30 days); the new media ids are 66-123.
- **Still to do (owner):** delete the three `gocart-test` environment secrets (`TEST_DATABASE_URI`, `TEST_DATABASE_HOST`, `TEST_BLOB_READ_WRITE_TOKEN`); the team cannot. Rotate the Blob token if you like. `M109` and production were not touched.

Record of the state before the run (2026-11-03):

*(Historical: the status that follows is the pre-run state.)*

- **Photos: ready.** `npm run fetch:demo-originals` re-downloads the 24 licence-checked originals and keeps
  each one only if its SHA-256 equals the `original_sha256` recorded in `MANIFEST.csv` (24 of 24 matched
  on 2026-11-03). `npm run process:demo-images` then rebuilt all 61 processed files **byte-identical to the
  recorded `processed_sha256`** (manifest unchanged; `--check` and `test:demo-images` pass).
- **Pre-flight on Neon (read-only SQL):** all 24 demo products and 10 demo categories exist, so a run should
  report **58 to upload, 34 to relink, 0 to create** and no skipped targets. A different dry-run count means
  the database changed: stop and look.
- **Rehearsal (2026-11-03)** of the tool's own `runRollout` with the 58 real processed photos, on a loopback
  `*_throwaway` PostgreSQL 16 with the 8 committed migrations and the generated-art demo seed (the test
  site's state), local file storage instead of Blob, and a different `PAYLOAD_SECRET` from the seed's:
  all 58 photos pass the tool's validation; dry run 58 / 34 / 0; apply uploaded 58 and relinked 34
  (every product's two images and every category image now the new photos); rerun uploaded nothing
  (34 already correct); no schema change (`payload_migrations` unchanged); nothing deleted.
- **Still missing for the live run** (none of it can be supplied from this cloud session without putting a
  secret in the transcript):
  1. A Blob read-write token for `gocart-test-media` (write-only in Vercel now; copy or rotate it in the
     dashboard).
  2. A `DATABASE_URI` for the Neon test database (`gocart_app` role, the pooled
     host shown in the Neon console for the `gocart-test` project, `sslmode=require`), from the Neon console.
  3. A machine that reaches that host on port 5432 and `https://vercel.com/api/blob` (the Blob SDK's API).
     A cloud session reaches neither unless its environment's network access allows them.
  `PAYLOAD_SECRET` for the local rollout process only can be any newly generated 32+ character value: the
  rollout creates and relinks rows and signs no session or API key (the rehearsal used a different secret
  from the seed's). Never change the deployed `PAYLOAD_SECRET` for this (that logs the admin out) and never
  reuse a production value.

**Preferred way to finish (from 2026-11-03): the `M108 test-site photo rollout` GitHub Actions workflow**
(`.github/workflows/m108-rollout.yml`). The credentials live only in GitHub encrypted secrets, so nobody
pastes them anywhere, GitHub masks them in logs, and GitHub's runners reach Neon and the Blob API. It is
started by hand only, only from `main`, one run at a time, and is a dry run unless `mode` is `apply`. Each
run re-fetches the originals (checksum-verified), rebuilds the processed files, fails if they differ from the
committed manifest, and then runs the guarded tool with a throwaway `PAYLOAD_SECRET`.

- **First run, 2026-11-03 (run 41715649234, `mode=dry-run`, before any secret existed):** on GitHub's runner
  `npm ci`, `fetch:demo-originals` (24/24 verified), `process:demo-images`, `--check` and the manifest diff all
  passed; the tool then refused before opening any connection (`DATABASE_URI`, `DEMO_ROLLOUT_DB_HOST`,
  `BLOB_READ_WRITE_TOKEN` not set). So the route works end to end except for the credentials. That run
  created the `gocart-test` environment **without protection**: protect it before adding a secret.
- **Owner, once, in this order:** GitHub, repository Settings, Environments, `gocart-test` (create it if it
  is not listed).
  1. **Protect it first (mandatory):** "Deployment branches and tags" = selected branches, `main` only; and
     add yourself as a **required reviewer**. Without the branch rule a copy of the workflow on any other
     branch could read the secrets; without the reviewer a merged change to the workflow could. Every run
     then waits for your click in the Actions tab (two or three clicks for the whole rollout).
  2. Then add three environment secrets: `TEST_DATABASE_URI` (the Neon pooled connection string for
     `gocart_app`, from the Neon console), `TEST_DATABASE_HOST` (the host part of that string), and
     `TEST_BLOB_READ_WRITE_TOKEN` (the `gocart-test-media` read-write token, from the Vercel dashboard, Storage).
- **AI team:** run the workflow with `mode=dry-run` (you approve the run); check the counts
  (58 / 34 / 0); run `mode=apply`; verify through the Vercel and Neon connectors; run `dry-run` again
  (expect 0 to upload, 34 already correct); record the manifest from the run's artifact in a PR.
- **Owner, after:** delete the three secrets (and rotate the Blob token if you like). The team has no tool that can
  delete GitHub secrets.

Other ways:
- **On your machine:** `npm ci`, `npm run fetch:demo-originals`, `npm run process:demo-images`, then steps 1-5
  below with `DEMO_ROLLOUT_DB_HOST` set to that same pooled host.
- **In a cloud session:** in the environment's settings add the three values as environment secrets
  (`DATABASE_URI`, `BLOB_READ_WRITE_TOKEN`, `DEMO_ROLLOUT_DB_HOST`) and allow the two hosts under network
  access; a new session then runs the same commands without anyone pasting a secret into chat. Every later
  session of that environment can then write to the test site, so remove the three secrets after the
  rollout, and never put production values there.

How the upload path works (read from the installed adapter source, `@payloadcms/plugin-cloud-storage`
`dist/hooks/afterChange.js` and `@payloadcms/storage-vercel-blob` `dist/uploadFile.js`, version 3.90.2): a server-side `payload.create` file has no `clientUploadContext`, so the Blob
adapter uploads it itself with `put(..., { allowOverwrite: true, addRandomSuffix: false })`. A name
clash is avoided because Payload renames a filename that a media row already uses (`a.webp` becomes
`a-1.webp`). Residual risk: a Blob object with no media row would be overwritten silently; today every
one of the 63 objects had a row (before the 2026-11-05 rollout; it now holds 121 objects and 121 rows).

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
5. Check `/`, `/shop`, a category, a product and `/cart` on the test URL. Images are served through
   `/api/media/file/<name>` (the adapter reads them from Blob); a new photo's URL returns 200 `image/webp`
   with the processed file's byte size, and its name has a `-1`-style suffix if the old art used the name.

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

## Deploying `M110` (admin-editable content) to the test site

`M110` is built but **not deployed** to the test site until the owner asks (and, once merged, the code on `main` is not live until someone deploys it). Order matters because the test site is not Git-connected and its Neon database is migrated by hand:

1. Apply the migration `20261105_121934_storefront_content` to the Neon test database as the owner role (the same way as the 2026-11-01 `M101`/`M102` migrations: run its `up` SQL, then add its `payload_migrations` row), and check the four new tables exist (`hero_slides`, `hero_slides_rels`, `storefront_content`, `storefront_content_announcement_messages`).
2. Deploy `main` through the Vercel API or CLI (the dashboard's "Redeploy" rebuilds the old source).
3. In `/admin` open **Storefront content** (global), **Banner slides** (collection) and **Media** (fill in each picture's alt text). Until something is saved, the site shows the same wording as before and the automatic banner slides.

Before step 1 the public pages already work (they fall back to the old wording); only the new admin screens need the tables. `M109` and production are not part of this.
