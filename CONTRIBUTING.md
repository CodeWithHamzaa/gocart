# Contributing to GoCart — Pakistan

Thank you for contributing to **GoCart**.

> **Read this first.** This repository started from the open-source
> [GreatStack GoCart](https://github.com/GreatStackDev/goCart) **multi-vendor
> marketplace**, but it is no longer one. It is being built into a **single-store,
> admin-managed, Cash-on-Delivery platform for Pakistan**.
>
> An earlier version of this file solicited vendor dashboards, vendor onboarding, and
> multi-vendor cart work. **All of that is out of scope and will be rejected** — see
> [ADR-006](./docs/DECISIONS.md) (Accepted). If you are working from a fork or a cached
> copy of the old guide, discard it.

---

## Table of Contents
- [Start here](#start-here)
- [Hard constraints](#hard-constraints)
- [Development setup](#development-setup)
- [How to contribute](#how-to-contribute)
- [Contribution guidelines](#contribution-guidelines)
- [Ideas for contribution](#ideas-for-contribution)
- [Out of scope](#out-of-scope)

---

## Start here

Read these before opening a PR:

1. [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) — what we're building
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — how it's designed
3. [docs/DECISIONS.md](./docs/DECISIONS.md) — the ADR log; **Accepted ADRs are binding**
4. [docs/MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) — the authoritative implementation sequence
5. [CLAUDE.md](./CLAUDE.md) — the engineering constitution

**All work is tracked by milestone ID** (`M29`), never by phase or group name. Group
headings are navigation labels and carry no execution order — a milestone's
`Dependencies` line defines what must land first.

## Hard constraints

Do not violate these, and do not quietly work around them:

- **Cash on Delivery only.** No other payment gateway ships now. The architecture stays
  extensible for later ([ADR-004](./docs/DECISIONS.md)).
- **Guest checkout is required.** Never make an account mandatory to order ([ADR-005](./docs/DECISIONS.md)).
- **Admin-only authentication.** Payload's `/admin` is the only authenticated surface.
  No customer login, no vendor login ([ADR-005](./docs/DECISIONS.md), [ADR-006](./docs/DECISIONS.md)).
- **Single store — no vendors, no sellers.** Closed by [ADR-006](./docs/DECISIONS.md).
- **PostgreSQL only, through Payload CMS v3.** No second ORM, no second database
  ([ADR-002](./docs/DECISIONS.md), [ADR-003](./docs/DECISIONS.md)).
- **Payload runs embedded** in the Next.js app, owning `/admin` ([ADR-009](./docs/DECISIONS.md)).
- **SEO-first and mobile-first** are defaults, not a later pass ([ADR-007](./docs/DECISIONS.md)).
- **Everything runs in Docker** ([ADR-008](./docs/DECISIONS.md)).
- **No AI/LLM dependency in the application.** Tooling used to build GoCart must never
  become a runtime dependency of it — see [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md).

If a requirement seems to conflict with one of these, **raise the conflict** rather than
guessing which wins.

## Development setup

```bash
docker compose up -d postgres   # PostgreSQL (M1)
cp .env.example .env            # set DATABASE_URI and a real PAYLOAD_SECRET
npm install
npm run dev                     # storefront + Payload admin at /admin
```

Available scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build — **must pass before any PR** |
| `npm run type-check` | `tsc --noEmit`, strict — **must pass before any PR** |
| `npm run seed` | Dev seed data |
| `npm run lint` | ⚠️ **Currently broken** — no ESLint dependency or config is installed |

There is **no test framework yet**. One Playwright golden-path test plus CI is scheduled
as `M56a`. Until then, verify manually against a real `npm run build && npm run start`
server and say what you checked.

## How to contribute

1. **Fork** the repo
2. **Create a branch** — never branch from a stale trunk; confirm your base contains the
   current migration history with `git log --oneline -5`
3. **Make your change**, scoped to one milestone
4. **Verify** — `npm run type-check` and `npm run build` must pass
5. **Update the docs** you affected: [docs/CHANGELOG.md](./docs/CHANGELOG.md),
   [docs/TASKS.md](./docs/TASKS.md), and an ADR in [docs/DECISIONS.md](./docs/DECISIONS.md)
   if you made a non-obvious technical decision
6. **Open a PR** referencing the milestone ID

## Contribution guidelines

- **Small, focused PRs.** One milestone, one reviewable commit. Don't bundle unrelated
  changes.
- **Commit messages** — use the milestone's own `Commit message` line from
  `MIGRATION_PLAN.md` when one exists.
- **Code style** — new files are `.ts`/`.tsx`; existing `.jsx` is **never opportunistically
  converted**. No semicolons, single quotes, 2-space indent in TypeScript. Match the
  surrounding file.
- **Comment headers** — new files open with a milestone-ID header explaining what and why,
  citing the relevant ADR.
- **Prefer editing over rewriting.** This codebase has real history.
- **Accessibility and mobile-first** are requirements, not nice-to-haves.
- **Discuss large changes first**, and record real decisions as ADRs rather than leaving
  them in a PR thread.
- **Respect others** — follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ideas for contribution

Work that fits the target product:

**Storefront**
- Category browsing and product discovery within the slug-based URL space
- Cart persistence and the guest COD checkout flow
- Empty, loading, error, and not-found states

**SEO**
- `generateMetadata`, canonical URLs, correct HTTP status codes
- `sitemap.xml` / `robots.txt`, JSON-LD structured data

**Mobile and performance**
- Mobile-first audits of `components/*`
- Query shape, render strategy, bundle size

**Admin and operations**
- Payload collection and admin-panel ergonomics for a single store admin
- Order fulfillment workflow
- Docker production hardening, health checks, backups

**Localization**
- PKR currency formatting, Pakistani address and phone validation

## Out of scope

These will be **closed without merge**. They are settled decisions, not open questions:

| Not accepted | Why |
|---|---|
| Vendor/seller dashboards, registration, approval, or profiles | [ADR-006](./docs/DECISIONS.md) — single store |
| Multi-vendor cart or per-vendor order splitting | [ADR-006](./docs/DECISIONS.md) |
| Customer accounts, login, or registration | [ADR-005](./docs/DECISIONS.md) — guest checkout only |
| Additional payment gateways in the active flow | [ADR-004](./docs/DECISIONS.md) — COD only for launch |
| Product reviews or ratings | [ADR-016](./docs/DECISIONS.md) — out of scope for v1 |
| Coupons or discount codes | [ADR-017](./docs/DECISIONS.md) — out of scope for v1 |
| A second ORM, database, or headless CMS | [ADR-002](./docs/DECISIONS.md), [ADR-003](./docs/DECISIONS.md) |
| Running Payload as a separate service | [ADR-009](./docs/DECISIONS.md) — embedded |
| Any AI/LLM runtime dependency in the app | [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md) |

Post-launch (Future Phase, not now): faceted filters, wishlist, brands, advanced
inventory, advanced settings.

---

Thanks for helping build GoCart. 🚀
