# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What this project is

GoCart is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** and **PostgreSQL**. Full context lives in [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before making structural decisions.

## Current phase: planning, not building

As of this writing, only documentation exists (`docs/`, `prompts/`, and this file). **No application code has been changed or migrated yet.** Do not assume Payload, PostgreSQL, or Docker are wired up until [docs/TASKS.md](./docs/TASKS.md) says so.

## Hard constraints (do not silently violate)

- **Cash on Delivery only.** Do not add other payment gateways to the active checkout flow. The architecture must stay extensible for online payments later (see [docs/DECISIONS.md](./docs/DECISIONS.md)), but nothing beyond COD ships now.
- **Guest checkout is required.** Never make account creation mandatory to place an order.
- **Admin-only authentication.** There is no public customer login and no vendor login/dashboard in the target design. If you find code implementing vendor auth or a vendor dashboard, treat it as legacy from the original multi-vendor app, not a requirement — flag it, don't silently extend it.
- **PostgreSQL only**, accessed through Payload CMS v3's data layer. Don't introduce a second ORM or database.
- **SEO-first and mobile-first** are non-negotiable defaults for any storefront UI work — not an afterthought pass at the end.
- **Everything must run in Docker** for both development and production.

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

- The original app (`app/store/*`, `app/admin/approve`, `app/admin/stores`, `Store` model in `prisma/schema.prisma`) is a **multi-vendor marketplace**. The target product is **single-store**. Reconciling this is an open decision — see [docs/DECISIONS.md](./docs/DECISIONS.md) and [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) open questions.
- No authentication provider is currently wired into the app (no Clerk/NextAuth in `package.json`). Admin auth will come from Payload CMS v3's built-in auth once integrated.
- Currency is currently hardcoded to `$` via `NEXT_PUBLIC_CURRENCY_SYMBOL` in `.env.example` — this needs to become PKR-aware for the Pakistan launch.
