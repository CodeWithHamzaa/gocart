# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What this project is

GoCart is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** and **PostgreSQL**. Full context lives in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before making structural decisions.

## Current status: Payload mounted, `M6` gate cleared — `M6`–`M13`/`M13a` are next

Planning and documentation are **Done** (see [docs/TASKS.md](./docs/TASKS.md)). Implementation has progressed through the foundation group: `M1`, `M2`, `M2a`, `M16`, `M17`, `M19`, `M14`, `M3`, `M4`, and `M5` are **Done**. **Payload is mounted** — `payload.config.ts` (no collections yet) is wired to Postgres, and `/admin` serves Payload's own (collection-less) admin shell, not the legacy hand-built one. Prisma is retired. A dev Dockerfile exists (its `docker build` step is implemented but not fully verified — see [docs/TASKS.md](./docs/TASKS.md)). Do not assume any Payload **collections** exist until [docs/TASKS.md](./docs/TASKS.md) records the relevant `M6`–`M13`/`M13a` milestone as complete — `payload.config.ts` currently registers none.

**The `M6` gate is cleared** (2026-08-16): Reviews and Coupons are decided out of scope for v1, the shipping model, order status set, media storage backend, and guest `Orders` shape are all decided and recorded as [ADR-016 through ADR-021](./docs/DECISIONS.md). **The next milestones to execute are `M6`–`M13` and the new `M13a`** (Settings global) — Payload collection design may now proceed.

## Milestone numbering — the one authoritative sequence

**`M1`–`M59` in [docs/MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) is the only implementation sequence.** Always reference work by milestone ID.

Phase and group names are **labels for grouping and status reporting only**. They carry no execution order and must never be used as implementation references — "start Phase 2" is not an instruction anyone can act on correctly; "start `M6`" is. Execution order is defined by each milestone's stated dependencies, summarized in MIGRATION_PLAN's execution-order section, and is **not** the same as ascending milestone ID (notably, `M14`/`M16`/`M17`/`M19` run before `M3` — see [ADR-014](./docs/DECISIONS.md)).

## Hard constraints (do not silently violate)

- **Cash on Delivery only.** Do not add other payment gateways to the active checkout flow. The architecture must stay extensible for online payments later (see [docs/DECISIONS.md](./docs/DECISIONS.md)), but nothing beyond COD ships now.
- **Guest checkout is required.** Never make account creation mandatory to place an order.
- **Admin-only authentication.** There is no public customer login and no vendor login/dashboard in the target design. If you find code implementing vendor auth or a vendor dashboard, treat it as legacy from the original multi-vendor app, not a requirement — flag it, don't silently extend it.
- **Single store — no vendors, no sellers.** Settled in [ADR-006](./docs/DECISIONS.md) (Accepted 2026-08-07). No seller dashboard, no vendor registration, no vendor approval, no per-store ownership of products or orders. Commerce is admin-managed. This is closed — do not reopen, hedge, or treat it as an open question.
- **PostgreSQL only**, accessed through Payload CMS v3's data layer. Don't introduce a second ORM or database.
- **Payload runs embedded in the Next.js app**, not as a separate service — [ADR-009](./docs/DECISIONS.md) (Accepted 2026-08-14). Payload owns `/admin`.
- **SEO-first and mobile-first** are non-negotiable defaults for any storefront UI work — not an afterthought pass at the end.
- **Everything must run in Docker** for both development and production.
- **Initial production infrastructure baseline is decided** — [ADR-015](./docs/DECISIONS.md): Cloudflare Free + a single ~$10–12/month VPS running the Dockerized app and PostgreSQL + Resend free-tier email + COD. SMS is deferred to a future phase; backups are managed manually for now. Keep the application layer host-agnostic so this baseline stays replaceable/upgradable without a rewrite.

## Working agreement

- **Don't install packages or scaffold Payload/Docker config unless explicitly asked.** Confirm scope before making changes that go beyond documentation or the specific task given.
- **Log real decisions in [docs/DECISIONS.md](./docs/DECISIONS.md)** (ADR format) when a non-obvious technical choice gets made — don't let decisions live only in chat history.
- **Update [docs/TASKS.md](./docs/TASKS.md)** as phases start/complete.
- **Update [docs/CHANGELOG.md](./docs/CHANGELOG.md)** for notable changes, once code starts moving.
- **Prefer editing over rewriting.** This codebase has real history (see `git log`) — don't blow away working code to "start clean."
- When requirements conflict with what's in the existing GreatStack GoCart codebase (e.g. multi-vendor data model vs. single-store target), **surface the conflict rather than guessing** which one wins.

## Repo map

```
app/            Next.js App Router pages (public storefront, /admin, /store vendor dashboard — legacy)
components/     React components (storefront UI, admin/, store/ subfolders)
lib/            Redux Toolkit store and slices (cart, address, product, rating)
prisma/         Prisma schema targeting PostgreSQL (pre-Payload; migration target, not yet wired to a client)
docs/           Project spec, architecture, tasks, decisions, changelog
prompts/        Reusable prompt templates for AI-assisted work on this repo
```

## Useful context for AI agents

- The original app (`app/store/*`, `app/admin/approve`, `app/admin/stores`, `Store` model in `prisma/schema.prisma`) is a **multi-vendor marketplace**. The target product is **single-store**, and this is already decided — [ADR-006](./docs/DECISIONS.md) is Accepted. The multi-vendor surface is legacy to be **removed** (`M14`–`M17`, `M19`), not reconciled. Treat any doc or comment implying the question is still open as stale.
- **The repository has no TypeScript toolchain yet** — `jsconfig.json` only, no `tsconfig.json`, no `typescript` dependency. Milestones from `M3` onward create `.ts` files; TypeScript is established first at `M2a`. Don't author `.ts` files before that milestone lands.
- No authentication provider is currently wired into the app (no Clerk/NextAuth in `package.json`). Admin auth will come from Payload CMS v3's built-in auth once integrated.
- Currency is currently hardcoded to `$` via `NEXT_PUBLIC_CURRENCY_SYMBOL` in `.env.example` — this needs to become PKR-aware for the Pakistan launch.
