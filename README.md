<div align="center">
  <h1><img src="https://gocart-gs.vercel.app/favicon.ico" width="20" height="20" alt="GoCart Favicon">
   GoCart — Pakistan</h1>
  <p>
    A production-ready, Cash-on-Delivery ecommerce platform for the Pakistani market, built on Next.js, Payload CMS v3, and PostgreSQL.
  </p>
</div>

---

> **Status: Implementation in progress.** This repository was cloned from the open-source [GoCart](https://github.com/GreatStackDev/goCart) multi-vendor storefront and is being transformed into a single-store, admin-managed, Cash-on-Delivery platform for Pakistan. **Milestones `M1`–`M28` are Done** — the foundation, the full Payload CMS v3 + PostgreSQL data model, removal of the entire multi-vendor surface, admin-only auth, and the whole storefront now reading real Payload data (home, shop, product, category, categories, cart). `M29` (real product search) is next. `/orders` is the one deliberate exception and stays dummy until `M36`'s guest order lookup. See [docs/TASKS.md](./docs/TASKS.md) for the full status roll-up and [docs/](./docs) for the plan.

## What this is becoming

- **Payload CMS v3** as the content/commerce backend and admin panel
- **PostgreSQL** as the datastore
- **Cash on Delivery** as the only payment method for launch (architecture leaves room for online payment gateways later)
- **Guest checkout** — customers can order without creating an account
- **Admin-only login** — no public vendor/customer authentication
- **SEO-first** and **mobile-first** by default
- **Dockerized** for local development and production

## Documentation

Start here, in order:

1. [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) — requirements, scope, roles, flows
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — current state, target design, data model
3. [docs/TASKS.md](./docs/TASKS.md) — phased execution plan
4. [docs/DECISIONS.md](./docs/DECISIONS.md) — why we chose what we chose
5. [docs/CHANGELOG.md](./docs/CHANGELOG.md) — notable changes over time
6. [CLAUDE.md](./CLAUDE.md) — working agreement for AI agents contributing to this repo

## Original project

This codebase started from the GreatStack **GoCart** open-source multi-vendor storefront (Next.js + Tailwind CSS + Redux Toolkit + Prisma). `LICENSE.md` and `CODE_OF_CONDUCT.md` carry over unchanged. **`CONTRIBUTING.md` has been rewritten** for this project — the original solicited vendor dashboards and multi-vendor features that [ADR-006](./docs/DECISIONS.md) puts permanently out of scope. Prisma has been retired ([ADR-003](./docs/DECISIONS.md)); Payload CMS v3 is the system of record.

## Getting started

```bash
docker compose up -d postgres   # PostgreSQL (M1)
cp .env.example .env            # set DATABASE_URI and a real PAYLOAD_SECRET
npm install
npm run dev
```

The storefront runs at `http://localhost:3000` and the Payload admin panel at
`http://localhost:3000/admin`. Run `npm run seed` for development data.

`npm run build` and `npm run type-check` are the two working verification gates.
`npm run lint` is currently broken (no ESLint dependency or config is installed), and
there is no test framework yet — one Playwright golden-path test plus CI is scheduled
as `M56a`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## Building GoCart

Day-to-day engineering runs through a development-time AI engineering team defined in
[.claude/](./.claude/) — eight roles under an Engineering Manager, with human approval
required before anything merges.

**This is build-time tooling only.** The shipped application has no AI, Claude,
Anthropic, MCP, or agent dependency of any kind, and builds and runs with `.claude/`
deleted. See [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md).
