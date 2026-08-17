# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`M6` gate cleared (2026-08-16)** — the six decisions blocking Payload collection design are made and recorded:
  - **ADR-016**: Reviews are out of scope for v1 (`M46` executes removal).
  - **ADR-017**: Coupons are out of scope for v1 (`M47` executes removal).
  - **ADR-018**: Shipping model — flat rate + free-shipping threshold, admin-configurable, snapshotted onto each order at creation. Introduces new milestone **`M13a`** (Settings global), closing readiness risk `R6`.
  - **ADR-019**: Order status set gains `CONFIRMED` (pre-dispatch phone confirmation, standard for Pakistani COD), `CANCELLED`, and `RETURNED`.
  - **ADR-020**: Media storage backend is a local Docker volume for v1; Cloudflare R2 named as the designated successor.
  - **ADR-021**: Guest `Orders` use embedded address fields, not a `Customers` collection — formally records what `M11` already assumed.
  - `M8`, `M11`, `M12`, `M34`, `M38`, `M54` updated to reflect these decisions; `M46`/`M47` reframed from "decide" to "execute the decided removal." Milestone count moves from 62 to **63**.
- **`M14`** — deleted the vendor dashboard (`app/store/**`, `components/store/**`), clearing the multiple-root-layouts precondition ahead of `M3`.
- **`M3`** — scaffolded and mounted an empty Payload CMS v3 instance (no collections yet): `payload.config.ts` wired to Postgres via `DATABASE_URI`; `/admin` and `/api/*` mounted inside the Next.js App Router per ADR-009. Required restructuring `app/layout.jsx` into `app/(public)/layout.jsx` (Next.js's multiple-root-layouts pattern, since Payload's `RootLayout` renders its own `<html>`/`<body>`) and changing `tsconfig.json`'s `moduleResolution` from `node` to `bundler` to resolve Payload's package `exports` subpaths.
- **`M4`** — retired the unwired `prisma/schema.prisma` and the now-empty `prisma/` directory, per ADR-003.
- **`M5`** — added a development `Dockerfile` (single `dev` stage) and `.dockerignore`. `docker build --target dev .` could not be fully verified in the authoring sandbox (Docker Hub registry pull blocked by environment egress policy) — needs a real-registry build check.
- **ADR-014**: `M14` is a hard prerequisite of `M3`, not an order-independent milestone — a second precondition (Next.js multiple-root-layouts restructuring) found during `M3` analysis, distinct from the existing `app/admin/**` route-collision precondition owned by `M16`/`M17`/`M19` (Accepted 2026-08-16).
- **ADR-015**: Initial production infrastructure baseline — Cloudflare Free + ~$10–12/month VPS + self-hosted PostgreSQL + Resend free-tier email + COD only; SMS deferred to a future phase; backups managed manually at launch; baseline kept replaceable/upgradable without an application rewrite (Accepted 2026-08-16).

### Changed

- **Documentation synchronized with actual repository state (2026-08-16).** Corrected stale claims that implementation had "not begun" and that `M3` was "the next milestone" — `M1`, `M2`, `M2a`, `M16`, `M17`, and `M19` are **Done**; `M14` is the next milestone, and `M3` is blocked on it per ADR-014. Updated across `CLAUDE.md`, `docs/TASKS.md`, `docs/MIGRATION_PLAN.md` (execution-order section, critical-path diagram, `M3`/`M14` entries, group ordering note, summary table), `docs/ARCHITECTURE.md` (`/admin` ownership note, production-readiness section), `docs/PROJECT_SPEC.md` (notifications open question), and `docs/PHASE_1_READINESS_REPORT.md` (new post-audit correction subsection; `D8`/`D12` status updated to Partial). Audit 1's and Audit 2's original text was not edited — only status/table cells and new appended sections.

- **`M27a`, `M27b`** — two new milestones covering customer-facing category browsing: `/category/[slug]` (detail + paginated product listing, parent/child navigation, marquee and breadcrumb links) and `/categories` (landing index). Decimal IDs, no renumbering of `M1`–`M59`; the plan moves from 60 to **62** milestones. Closes readiness finding `C8` — *"category browsing assumed by four milestones and built by none."*
- **`docs/CATEGORY_REQUIREMENTS.md`** — behavior specification the two milestones implement against: routes, purpose, URL structure, parent/child behavior, product relationship, SEO requirements, empty/loading/error states, pagination expectations, out-of-scope filtering, responsive expectations, and the `Categories` field list.
- **ADR-013**: category browsing ships in Phase 1 as dedicated slug routes with a two-level hierarchy (Accepted 2026-08-16) — dedicated routes over `/shop?category=` filtering, two-level parent/child, descendant rollup on parent pages, page-number pagination.
- **`M17`** — `docs/MIGRATION_PLAN.md`'s `M17` interim-state note extended: `/admin/coupons` stays live (200) after this milestone, now with no layout chrome, since its wrapper (`app/admin/layout.jsx`) is deleted here while the page itself is not deleted until `M19`. Recorded as expected migration debt, not a regression — the `isAdmin` gate it loses was never real.
- **`M2a`** — TypeScript toolchain established: `tsconfig.json` (strict mode, `allowJs: true`, `checkJs: false`, `@/*` path alias carried over from `jsconfig.json`), `next-env.d.ts` (committed per Next.js convention), and a `type-check` script (`tsc --noEmit`). `typescript`, `@types/node`, `@types/react`, `@types/react-dom` added as `devDependencies`. No `.jsx` file converted; nothing type-checked yet.
- **ADR-012**: TypeScript pinned to the `5.x` line (`^5.9.3`), not the `latest` npm tag — which resolved to `7.0.2`, a same-day-fresh native compiler rewrite (Accepted 2026-08-14).
- **`M2`** — Payload CMS v3 dependency stack: `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`, and `@payloadcms/richtext-lexical` (all pinned to `3.88.0`), plus `graphql` and `sharp` as direct dependencies. No configuration, no application code — nothing imports Payload yet.
- **ADR-011**: Payload v3 dependency set — exact version pins, the raised Next.js floor, and patched `sharp` (Accepted 2026-08-14).
- **`M1`** — `docker-compose.yml` with a PostgreSQL 17 service for local development: pinned Alpine image, healthcheck, named volume for persistence, and a loopback-bound published port. First implementation milestone; no application code touched.
- **`M1`** — `DATABASE_URI` added to `.env.example` alongside commented overrides for the compose service's credentials.
- **ADR-010**: the PostgreSQL connection string is named `DATABASE_URI` (Accepted 2026-08-14), not the Prisma-era `DATABASE_URL`, and not both. Closes the database-variable half of readiness risk `R10`.
- Initial documentation scaffolding for the GoCart Pakistan transformation: `docs/`, `prompts/` directories; root `README.md` (rewritten) and `CLAUDE.md`; `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.
- `docs/REPOSITORY_ANALYSIS.md`, `docs/FEATURE_MATRIX.md`, `docs/MIGRATION_PLAN.md` — codebase audit, per-feature disposition, and the `M1`–`M59` milestone plan.
- `docs/PHASE_1_READINESS_REPORT.md` — readiness audit gating the start of implementation.
- **ADR-009**: Payload CMS runs embedded inside the Next.js application (Accepted 2026-08-14).
- **`M2a`**: new milestone establishing the TypeScript toolchain before any milestone authors a `.ts` file.

### Changed

- **`M9`** — expanded from a one-line goal with no field list to an explicit `Categories` schema: `title`, `slug` (unique, indexed, generated-then-stable), `parent` (self-relation, `hasMany: false`, two-level limit), `description`, `image`, SEO overrides, `displayOrder`. Gains an `M8` dependency (the `image` upload field targets the Media collection).
- **`M10`** — `Products.category` cardinality fixed at `hasMany: false` (one product, one most-specific category); parent category pages roll up children rather than requiring double-filing.
- **`M22`** — scope expanded to own the category queries and the descendant rollup: `getTopLevelCategories()`, `getCategoryBySlug()`, `getProductsByCategory()`. One implementation, so the routes and the sitemap cannot disagree.
- **`M27`** — **false acceptance test corrected.** It asserted *"clicking one filters/links correctly"* against a component that renders bare `<button>`s with no `onClick` and no `href`. `M27` now re-points the data only, leaving items inert (today's behavior, so no dead-link window); `M27a` makes them links.
- **`M41`, `M42`, `M44`** — gained `M27a`/`M27b` dependencies and the category routes in their file/scope lists. `M42` in particular could not previously have produced the sitemap its own goal describes.
- **Filters ≠ category browsing** boundary drawn across `docs/FEATURE_MATRIX.md` (Categories and Filters rows), `docs/PROJECT_SPEC.md` (browse flow + out-of-scope list), and `docs/MIGRATION_PLAN.md`'s scope note — a Future-Phase Filters row could previously be read as deferring category browsing itself.
- **`docs/ARCHITECTURE.md`** — added a target storefront route map and recorded the `Categories` `parent` self-relation.
- **`docs/PHASE_1_READINESS_REPORT.md`** — contradiction `C8` flipped from ⚠️ Open to ✅ Resolved, with a post-audit correction subsection. Audit 1's verbatim text was not edited.
- **`M2a`** — `jsconfig.json` deleted, superseded by `tsconfig.json`, which takes over the `@/*` path alias. `.gitignore`'s `next-env.d.ts` entry removed so the file can be committed, per Next.js convention; `*.tsbuildinfo` stays ignored.
- **`M2a`** — `MIGRATION_PLAN.md`'s `M2a` records the TypeScript version choice and cites ADR-012.
- **`M2`** — `next` upgraded `15.3.5` → `15.3.9`, the minimum version satisfying `@payloadcms/next`'s peer range (per ADR-011). Patch-level, same minor; the storefront builds to the same 19 routes. This also cleared a pre-existing **critical** Next.js advisory.
- **`M2`** — `MIGRATION_PLAN.md`'s `M2` records the Next.js floor and cites ADR-011.
- **`M1`** — `MIGRATION_PLAN.md`'s `M1` and `M52` now name the database connection variable `DATABASE_URI` instead of `DATABASE_URL`, per ADR-010.
- **ADR-003** promoted from `Proposed` to **Accepted** (2026-08-14), with its supporting evidence recorded.
- **Milestone IDs (`M1`–`M59`, `M2a`) are now the single authoritative execution sequence.** Phase/group names demoted to reporting labels across `CLAUDE.md`, `docs/TASKS.md`, `docs/MIGRATION_PLAN.md`, `docs/DECISIONS.md`, `docs/REPOSITORY_ANALYSIS.md`, and `docs/README.md`.
- **`M16`, `M17`, `M19` resequenced ahead of `M3`** to clear `app/admin/**` before Payload takes ownership of `/admin`, resolving a circular dependency and a Next.js parallel-route build failure.
- `M2` extended to install `sharp` alongside Payload and the Postgres adapter.
- Stale "multi-vendor vs. single-store is unresolved" framing removed from `docs/ARCHITECTURE.md`, `CLAUDE.md`, and `docs/TASKS.md`; ADR-006 has been Accepted since 2026-08-07.
- `docs/TASKS.md` rewritten as a milestone-keyed status roll-up with explicit `M1` and `M6` gates; planning marked **Done**.

- **No application code has been changed by any entry above.** The planning entries are documentation-only; `M1` added local development infrastructure and configuration; `M2` added dependencies to the manifest; `M2a` added the TypeScript toolchain without converting any existing `.jsx` file. The storefront still renders exactly as inherited.
