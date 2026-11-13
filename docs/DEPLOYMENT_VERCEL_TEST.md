# Free test deployment: Vercel Hobby + Neon Free + Vercel Blob

**This is a personal, non-commercial TEST environment. It is not production.** Vercel's Hobby plan
is for non-commercial use only. Before any commercial or client launch, move to paid hosting or to
the production stack in [DEPLOYMENT.md](./DEPLOYMENT.md) ([Architecture Decision Record 015](./DECISIONS.md)). Decision and
trade-offs: [Architecture Decision Record 046](./DECISIONS.md), Milestone 100. It supersedes none of Architecture Decision Records 015 and 020,
Architecture Decision Record 032 or Architecture Decision Record 036, and it closes no launch blocker.

> **Checkout is non-functional on this deployment: Turnstile keys are not configured (owner
> decision, 2026-10-30).** Placing an order and looking one up both need a verified Turnstile token
> ([Architecture Decision Record 035](./DECISIONS.md)). Browsing, product pages and the admin work.

> **Names:** the store is **Mirza** ([Architecture Decision Record 047](./DECISIONS.md)). The Vercel project, Neon project, Blob store
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
| `DATABASE_URI` | Neon **pooled** connection string for the restricted **`gocart_app`** role (Architecture Decision Record 036). Never the owner role. Never commit or print it |
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
| `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_PASSWORD` | first admin, used by `scripts/bootstrap-admin.ts` | supplied only to the one-off bootstrap run, never stored on Vercel |

## Database

The schema comes from the committed migrations in `/migrations` ([Architecture Decision Record 032](./DECISIONS.md)); nothing is
pushed automatically and **`prodMigrations` is not enabled**. Migrations run as an explicit step with the
Neon **owner** role, the same order as `deploy:migrate` minus the Docker-only `check-env`:

```bash
# DATABASE_URI = Neon OWNER connection string for these four steps only
npx payload migrate
npx tsx scripts/verify-migrations.ts
APP_DB_PASSWORD=... npx tsx scripts/db-roles.ts     # creates/updates the restricted gocart_app role
ADMIN_BOOTSTRAP_USERNAME=... ADMIN_BOOTSTRAP_PASSWORD=... npx tsx scripts/bootstrap-admin.ts
```

If Neon is not reachable from the deploying machine on port 5432, a throwaway script outside the repo may run
the committed migrations over Neon's serverless driver on port 443. If that is not feasible either, stop and
report; do not invent another path.

`db-roles.ts` grants `gocart_app` `SELECT, INSERT, UPDATE, DELETE` on all public tables, `USAGE, SELECT` on
sequences and `USAGE` on the schema (`scripts/db-roles.ts:50-55`), revokes writes to `payload_migrations`
(`:57`) and sets default privileges for later tables (`:59-60`). Those are table-level grants, so the Milestone 100
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
  ([Architecture Decision Record 026](./DECISIONS.md)), so on serverless it counts per instance, and the client IP is read only
  from `cf-connecting-ip` ([Architecture Decision Record 033](./DECISIONS.md)); with no Cloudflare in front, all visitors share
  one `unknown` bucket. Do not treat the limits as protection.
- **Checkout and order lookup:** non-functional until Turnstile keys exist (see the notice at the top).
- **Images:** `images.unoptimized` stays `true`; only the Blob host is added to `remotePatterns`.

## What is verified, and how

Live checks on the deployment: storefront pages and a product page return 200, `/admin` login works, and
one test image uploads to Blob, is served and is deleted. Server-side order totals and rate limiting are
**not** tested live (checkout is off); they are covered by continuous integration: the `e2e` job (golden-path order against a
seeded database), `npm run test:idempotency`, `npm run test:turnstile` and `npm run test:users-guard`.

## Verified state (2026-11-03, updated after the redeploy; the Data and Blob store rows updated 2026-11-05 after the Milestone 108 rollout)

Read through the authorised Vercel and Neon connectors; no value of any secret was requested or
printed. Re-check before relying on it; anything not in this list is not verified.

| Item | Observed |
|---|---|
| Vercel project | `gocart-test`, Hobby scope, Node 22.x. **Merges to `main` do not deploy** (2026-11-11: Pull requests #73 to #79 were merged and no deployment followed). Deployments are created on request through the Vercel API from the GitHub source (they carry the repo, branch and commit SHA, and the project has a `git-main` alias). Domains: `gocart-test-inky.vercel.app` (the `NEXT_PUBLIC_SITE_URL`) and two `*.vercel.app` aliases. Deployment protection reported as `ssoProtection: all_except_custom_domains` (which URLs that leaves public was not checked) |
| Deployed code | **`main` at `d5ed333`** (pull request #85, Milestone 122, the Mirza Cart brand and the storefront redesign of Milestones 115 to 121), deployment `dpl_6hNJU8oC…`, created 2026-11-13 through the Vercel connector from GitHub source, READY, production, aliased to `gocart-test-inky.vercel.app`. The migration `20261113_204148_mirza_cart_store_name` was applied to the test Neon first, as the owner role in one transaction (column default, the stored name "Mirza" renamed to "Mirza Cart", and its `payload_migrations` row, batch 5): 11 migrations afterwards, 24 products and 0 orders unchanged. Checked live on 2026-11-13: `/`, `/shop`, `/categories`, `/category/watches`, `/product/1`, `/cart`, `/wishlist`, `/orders`, `/admin/login`, `/api/health`, `/favicon.ico` and `/apple-icon.png` return 200 and `/category/does-not-exist` 404; six pages at 1440 and 390px show the new logo and name, the moving announcement strip and no category row, with no horizontal overflow and no console errors. Rollback candidate: `dpl_4JCozo4v…` (`e1e9e5a`) together with the migration's `down`. Before that, **`main` at `e1e9e5a`** (pull request #79, Milestone 114 admin sign-in by username), deployment `dpl_4JCozo4v…`, created 2026-11-11 09:27 UTC through the Vercel API from GitHub source, READY, production, aliased to `gocart-test-inky.vercel.app`; the Milestone 114 migration had been applied first. Rollback candidate: `dpl_4Ctt5vjL…` (`27384ef`). Before that, `main` at `27384ef` (pull request #72, "Load more on Shop, Featured fills 2–3 rows, static trust strip"), deployment `dpl_4Ctt5vjL…`, created 2026-11-10 23:36 UTC, READY, production, aliased to `gocart-test-inky.vercel.app` (read through the Vercel connector on 2026-11-11). It includes the storefront redesign of 2026-11-10 (white product card `0257271`, tokens, hero, footer, Load more). No migration was added between `12d9454` and `27384ef`. Up to 2026-11-11 `main` differs from it only in docs and the demo-photo scripts (`scripts/`), so the storefront code on the test site matches `main`. Before that, `main` at `12d9454` (pull request #66, Milestone 110), deployed 2026-11-05 at the owner's request as `dpl_67jEB5hJ…` (READY, aliased to `gocart-test-inky.vercel.app`; the migration was applied first, see "Deploying Milestone 110"). Before that, `main` at `9183777` (pull request #61), deployed 2026-11-03 at the owner's request: `dpl_9vxaFkYF…` then, after the Blob token change below, `dpl_AwfA3Y1u…` (current, READY, aliased to `gocart-test-inky.vercel.app`). Earlier: 2026-11-01 `a6aedc1` (Milestone 102, `dpl_254K…`, kept as the rollback candidate) and 2026-10-30 (Milestone 100). No migration was pending (the 8 on Neon equal the 8 in `/migrations`), so no migrate step ran |
| Live checks (2026-11-03, through the connector's fetch) | 200: `/api/health` (`{"status":"ok"}`), `/`, `/shop`, `/categories`, `/category/headphones`, `/category/watches`, `/product/24`, `/cart`, `/wishlist`, `/admin/login`; 404: `/category/does-not-exist`. **Milestone 107 is live**: `og:image` on home, shop, categories, category and product pages (the category page had none before the redeploy; the others were not fetched before) and the category photo in the category banner; the product main image uses its own alt ("Citrus Mist Body Spray, view 1"). Pull request #60 (`disableCreateDatabase`) is in the deployed commit; the database connects (health and pages). A Blob-backed file (`/api/media/file/category-headphones.webp`) returns 200 `image/webp`, 12,164 bytes, equal to its media row |
| Environment variables (Production) | `DATABASE_URI` and `PAYLOAD_SECRET` (type *sensitive*), `NEXT_PUBLIC_SITE_URL` (plain), `BLOB_READ_WRITE_TOKEN` (all three targets; was type *encrypted*, which Vercel flags `readable-secret`; **changed to *sensitive* in place on 2026-11-03**, see below; no variable now has a security issue). **No** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: real-key Turnstile is not configured, so checkout and lookup stay off |
| Neon | Project `gocart-test`, AWS us-east-1, Postgres 17, 0.25 CU, scale-to-zero; branches `main` (default) and `backup-before-m101-m102-2026-11-01` |
| Schema | `payload_migrations` holds all 8 committed migrations (6 in batch 1, `mirza_store_name` and `flat_categories` in batch 2), the same 8 as `/migrations` on `main`. Roles `neondb_owner` and `gocart_app` exist; `gocart_app` has `SELECT, INSERT, UPDATE, DELETE` on `media` |
| Data | 2026-11-05, after Milestone 108: 24 products, 10 categories, **121 media rows** (the 63 generated-art rows of 2026-10-30 are kept, unreferenced; 58 new photo rows, ids 66-123), 48 product image links all on the new media, every category image on new media, 8 migrations, 1 admin user, 0 orders (admin user and orders not re-checked on 2026-11-05) |
| Blob store | `gocart-test-media`, iad1, public access, connected to `gocart-test` only. 2026-11-05, after Milestone 108: **121 objects, 3,429,002 bytes** (matches the 121 media rows; was 63 objects, 726,320 bytes), quota not exceeded, token not expired |
| Code (repo, not a connector) | `collections/Orders.ts:44`: `delete` is allowed for any logged-in user, and only admins can log in (Architecture Decision Record 006), so admins can delete orders, which Architecture Decision Record 049 had listed as unverified for Milestone 109 |
| Continuous integration on `main` | The `CI` workflow succeeded on every push to `main` checked, including pull request #59 (`8a6ccdf`), pull request #60 (`4ae9dfe`) and pull request #61 (`9183777`, the deployed commit) |
| Runtime log | One recurring warning, pre-existing since 2026-10-30: `pg` says `sslmode=require` is treated as `verify-full` and will change meaning in pg v9. Not an error; found, not fixed (switching the string to `sslmode=verify-full` is an owner edit of the sensitive `DATABASE_URI`) |
| Admin page | `/admin/login` advertises `og:image` `http://localhost:3000/api/og…`: Payload's `serverURL` is not set. Cosmetic (admin only, `noindex`); found, not fixed |

Not verified: the Hobby/Blob plan limits (not exposed by the connector); real Neon/Blob behaviour of
the Milestone 108 tool. Live pages were fetched through the Vercel connector (it creates a temporary share
link, which expires after 23 hours); the cloud session itself cannot reach `*.vercel.app` (2026-11-11: it could; Milestone 113 captured the test site directly).

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
- Consequence for Milestone 108: because the variable is now write-only, the token cannot be read back from
  Vercel by anyone, the team included. Whoever runs the rollout copies a token from the Blob store's
  page in the dashboard (or rotates one) into their own env file.

## Demo photo rollout (Milestone 108, Architecture Decision Record 049 item 6)

**Status (2026-11-05): DONE on the test site.** The rollout ran through the GitHub Actions workflow, every run approved by the owner: dry run [42019925812](https://github.com/CodeWithHamzaa/gocart/actions/runs/42019925812), apply [42020705613](https://github.com/CodeWithHamzaa/gocart/actions/runs/42020705613), rerun dry run [42021938362](https://github.com/CodeWithHamzaa/gocart/actions/runs/42021938362).

- **Dry run:** target host masked and labelled `(test)`; `media: 0 already on the test site, 58 to upload; rows: 34 to relink, 0 already correct, 0 to create`; the Security and quality assurance roles reviewed the log (no secret-like text; counts as expected; no skipped-targets line, so no missing product or category).
- **Apply:** `media: 0 already on the test site, 58 uploaded; rows: 34 relinked, 0 already correct, 0 created`; the manifest recorded 58 rows with `media_env=test`.
- **Rerun dry run:** `media: 58 already on the test site, 0 to upload; rows: 0 to relink, 34 already correct, 0 to create`; media count (121) and max id (123) unchanged afterwards.
- **Neon after apply (read-only SQL):** 58 new media rows with ids 66-123; 63 rows with ids up to 65 still present; all 24 products have two image links on new media (48 of 48); all 10 categories have `image_id` on new media; `payload_migrations` unchanged at 8; counts of products (24) and categories (10) unchanged.
- **Blob after apply:** 121 objects, 3,429,002 bytes (was 63 and 726,320).
- **Storefront after apply** (`gocart-test-inky.vercel.app`, through the Vercel connector): `/`, `/shop`, `/categories`, `/category/headphones`, `/product/3` and `/cart` return 200; the `/api/media/file/` image sources on those pages are the new files only; `category-headphones-1.webp` (11,316 bytes), `category-skincare-1.webp` (4,856) and `cylinder-mini-speaker-3.webp` (68,396) return 200 `image/webp` with the byte size of their media row. The new files carry Payload's collision suffix (`-3` and `-4` for products, `-1` for categories) because the old art held the plain names.
- **Manifest:** `docs/assets/MANIFEST.csv` (from the apply run's artifact) records `media_id` 66-123 and `media_env=test` on the 58 media rows; no other column changed, and its 58 id/size pairs equal the Neon rows. The OG image and the two promo rows are not media-collection items and stay blank. The rollback log was not committed (it is git-ignored and expires with the artifact after 30 days); the new media ids are 66-123.
- **Still to do (owner):** delete the three `gocart-test` environment secrets (`TEST_DATABASE_URI`, `TEST_DATABASE_HOST`, `TEST_BLOB_READ_WRITE_TOKEN`); the team cannot. Rotate the Blob token if you like. Milestone 109 and production were not touched.

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
  (expect 0 to upload, 34 already correct); record the manifest from the run's artifact in a pull request.
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

Nothing is deleted: media that no longer has a reference is left for Milestone 109's reference-checked cleanup.
Rollback of a rollout: relink in `/admin` or re-seed, then remove the logged media ids after a reference check.
Blob Hobby operation limits are unverified; one full rollout is 58 uploads.

## Demo photo rollout, visual upgrade (Milestone 112, Architecture Decision Record 049)

**Status (2026-11-11): DONE on the test site, including the two home promo cards (below).** Same hand-started workflow as Milestone 108, run from `main` at `7a4d32b` (pull requests 73 and 74), each run approved by the owner at the `gocart-test` gate: dry run [42932936456](https://github.com/CodeWithHamzaa/gocart/actions/runs/42932936456), apply [42933845361](https://github.com/CodeWithHamzaa/gocart/actions/runs/42933845361). No application code, schema, migration or Vercel deployment was involved: the photos are rows in Neon and files in Blob, and the running site already served them.

- **Dry run:** `media: 45 already on the test site, 13 to upload; rows: 9 to relink, 25 already correct, 0 to create`. The 13 are exactly the files whose bytes changed (speaker 2, Pulse image 2, Orbit watch 2, chrono image 2, backpack 2, tote image 1, Dome lamp 2, Foaming Face Wash image 2, Lamps category); the 9 rows are 8 products and the Lamps category.
- **Apply:** `media: 45 already on the test site, 13 uploaded; rows: 9 relinked, 25 already correct, 0 created`; 58 manifest rows recorded `media_env=test`. Nothing was deleted: the 121 older media rows and files are still there, so the change can be undone by relinking.
- **Checked live afterwards** (`gocart-test-inky.vercel.app`, plain HTTP, public pages and the public `/api/media/<id>` read): all 24 product pages plus `/`, `/shop`, `/categories` and five category pages return 200; every image they serve returns 200, and 97 of the 99 images on the second pass are byte-identical (SHA-256) to the new processed files (e.g. `cylinder-mini-speaker-5.webp` is the new speaker, `metro-canvas-backpack-5.webp` the leather backpack). The 13 new media ids are 124-136; their `filename` and `filesize` from the API equal the manifest (13 of 13). The stored filenames carry a numeric suffix (`-5`, `-6`) because older rows already use the plain names.
- **Manifest:** `docs/assets/MANIFEST.csv` is the apply run's artifact; compared with `main` before this change, only `media_id` and `media_env` differ, on the same 13 rows that had been cleared. Reprocessing the originals leaves it byte-identical, as the workflow requires.
- **Home promo cards (done by hand, not by the workflow).** The two circular promo cards showed the original cartoon watch and sunglasses (1200x1200 vector images, media 27 and 49): the rollout relinks products and categories only, and the promo files (`A-R01`, `A-R02`) are not media-collection rows it handles. On 2026-11-11, at the owner's request, `promo_cards.image_id` was changed with one read-write SQL statement on the test Neon (project `gocart-test`, through the Neon connector): card 1 "Summer Sale on Electronics" 49 -> 78 (cream and grey headphones, `studio-lite-over-ear-headphones-3.webp`), card 2 "New Arrivals Winter Sale" 27 -> 134 (cream desk lamp, `dome-desk-lamp-5.webp`). Both are existing product photos (1000x1000, shown in a 160 px circle), so nothing was uploaded; `demo-promo-1/2.webp` stay unused. Checked on the live desktop home page with a screenshot: both circles show the photos (the promo picture is hidden below 640 px by design). **Undo:** set card 1 back to 49 and card 2 back to 27; the old media rows still exist.
- **Promo card 1 link fixed (same day, owner said yes):** it pointed at `/category/electronics`, a 404 on the test site (categories were flattened by Milestone 102; pre-existing data from 2026-10-30). `promo_cards.link` on card 1 was changed to `/category/headphones` with a guarded `UPDATE ... WHERE id = 1 AND link = '/category/electronics'` (one row). Checked live: the home page's card 1 link is `/category/headphones` (200) and no link to `/category/electronics` remains. **Undo:** set the link back to `/category/electronics` (still a 404).
- **Not verified:** the Blob object count after the run, and the logged-in admin screens. The live promo cards were screenshotted; the product and category pages were compared by bytes only (the same files were screenshotted on a local copy).
- **Still to do (owner):** the three `gocart-test` environment secrets (`TEST_DATABASE_URI`, `TEST_DATABASE_HOST`, `TEST_BLOB_READ_WRITE_TOKEN`) still exist (the apply run read them); delete them now that the rollout is finished. The rollback log (new ids 124-136) is in the run's artifact for 30 days and is not committed.

## Redeploying

Push to `main`, or run a production deploy of `gocart-test` through the Vercel API or CLI. After changing
any `NEXT_PUBLIC_*` variable, redeploy so the value is rebuilt in. After adding a migration, run
`npx payload migrate` (owner role) against Neon **before** the new code serves traffic.

**Record of the 2026-11-01 rollout (Milestone 101 + Milestone 102), done from a cloud session at the owner's request:**
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

## Deploying Milestone 114 (admin sign-in by username) to the test site

**Step 1 done 2026-11-11, before merge** (owner's request, to avoid an automatic deploy running the new code before the migration): Neon backup branch `backup-before-m114-2026-11-11` created from `main` (no compute), then migration `20261106_093227_username_login` applied to the test Neon as the owner role in one transaction (its `up` statements plus its `payload_migrations` row, batch 4). Checked afterwards: 10 migrations; the one admin was backfilled with a username (`<email before the @>-<id>`) and kept its email; `username` is NOT NULL with `users_username_idx`, the email index is gone; `gocart_app` can read and update `username`; products, categories and media unchanged (24, 10, 134). The live site (still `27384ef`) answered 200 on `/api/health`, `/`, `/shop` and `/admin/login`. Not checked: an admin sign-in between the migration and the deploy (the old code signs in by email, which is still stored).

1. ~~Apply the migration to the test Neon as the owner role, then check `users.username` exists.~~ Done (above).
2. ~~Deploy `main`.~~ **Done 2026-11-11 09:27 UTC**: the merge did not deploy, so `main` at `e1e9e5a` was deployed through the Vercel API as `dpl_4JCozo4v…` (READY, aliased to `gocart-test-inky.vercel.app`).
3. Checked live after the deploy: `/api/health`, `/`, `/shop`, `/product/1`, `/cart` and `/admin/login` return 200; the `/admin/login` form shows **Username** and **Password** (no email field); `POST /api/users/login` with only an email is refused (400, username required), and an unknown username or an email typed as the username gets the generic 401; Vercel runtime errors show only the pre-existing `sslmode` warning. **Not checked by this session: a successful sign-in** (it does not hold the admin password, and wrong passwords on the real account were avoided because they count towards Payload's lockout). The owner signs in with the backfilled username.
4. Rollback: promote the previous deployment (`dpl_4Ctt5vjL…`, `27384ef`). The migration can stay (the old code signs in by email, still stored); to undo it, run its `down` (refuses while an admin has no email) or restore from the backup branch.

## Deploying Milestone 110 (admin-editable content) to the test site

**Done 2026-11-05** (owner's request): migration applied to the test Neon as the owner role in one transaction (the 20 statements of the migration file plus its `payload_migrations` row, batch 3); afterwards 9 migrations, the 4 new tables and the new column exist, `gocart_app` can read and write them, and the product, category, media and image-link counts were unchanged (24, 10, 121, 48). `main` at `12d9454` was then deployed as `dpl_67jEB5hJ…`. Checked live: `/`, `/shop`, `/admin/login` and `/api/health` return 200, the home page carries the new bar and Featured grid, and `/api/heroSlides` answers with an empty list (nothing created yet). Not checked: the logged-in admin screens (no login used). The steps below are the record of what was done and the way to repeat it. Order matters because the test site is not Git-connected and its Neon database is migrated by hand:

1. Apply the migration `20261105_121934_storefront_content` to the Neon test database as the owner role (the same way as the 2026-11-01 Milestones 101 and 102 migrations: run its `up` SQL, then add its `payload_migrations` row), and check the four new tables exist (`hero_slides`, `hero_slides_rels`, `storefront_content`, `storefront_content_announcement_messages`).
2. Deploy `main` through the Vercel API or CLI (the dashboard's "Redeploy" rebuilds the old source).
3. In `/admin` open **Storefront content** (global), **Banner slides** (collection) and **Media** (fill in each picture's alt text). Until something is saved, the site shows the same wording as before and the automatic banner slides.

Before step 1 the public pages already work (they fall back to the old wording); only the new admin screens need the tables. Milestone 109 and production are not part of this.
