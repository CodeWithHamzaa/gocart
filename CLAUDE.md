# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository. Kept short on purpose: it is loaded into every session and every subagent. Details live in `docs/`; read only what the task needs.

## What this project is

GoCart is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** (embedded in Next.js 16) and **PostgreSQL**. Context: [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before structural decisions.

## Where things stand

The storefront, guest COD checkout, order confirmation, guest order lookup, the Payload admin and the security batch (`M52b` Turnstile, idempotent orders, first admin from a secret, restricted DB role; `M52c` Next 16.3.8) are implemented, the storefront redesign (`M60`–`M72`, including the optional product label and admin promo cards, [ADR-039](./docs/DECISIONS.md)) is merged, and `M53` health checks and `M54` backups are Done in CI (`M74`). **Launch is NOT cleared:** real-key Turnstile checks, a Cloudflare WAF rule, first-deploy checks, a real-VPS backup and restore drill, an external uptime monitor and the Next.js advisories published after `M52c` remain ([docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md), "Launch blockers"). Source of truth for status: [docs/TASKS.md](./docs/TASKS.md); history: [docs/CHANGELOG.md](./docs/CHANGELOG.md); the long status narrative that used to be here is in [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) (nothing was deleted). QA rule: [.claude/docs/GATES.md](./.claude/docs/GATES.md).

Code facts that save a search:
- Server-side data: `lib/payload/products.ts`, `lib/payload/categories.ts` (Local API, **server components only**; client components use Payload's public-read REST API). Their types are hand-written; switching to `payload-types.ts` is open.
- Checkout is a server action that derives prices, shipping, totals and status server-side. `Orders.create` is admin-only; guests order through the action ([ADR-026](./docs/DECISIONS.md)). A verified Turnstile token is required to order or look up an order ([ADR-035/036](./docs/DECISIONS.md)).
- `/orders` is a guest lookup by order number + phone ([ADR-024](./docs/DECISIONS.md)). "Best Selling" is an admin-curated `isFeatured` flag ([ADR-022](./docs/DECISIONS.md)).
- Payload `/admin` is the only authenticated surface; no middleware, no customer or vendor login.
- Gotcha: a `loading.tsx` on `/category/[slug]` makes `notFound()` return HTTP 200 (Next App Router limitation), so that route deliberately has none ([MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md), `M27a`).
- TypeScript is established (`tsconfig.json`, `moduleResolution: "bundler"`, `allowJs`). New files are `.ts`/`.tsx`; never convert existing `.jsx` opportunistically. Lint is `npm run lint` (ESLint CLI; `next lint` no longer exists).
- Currency symbol is `Rs. ` via `NEXT_PUBLIC_CURRENCY_SYMBOL`; PKR formatting (`Rs. 1,500`, no decimals) is done by `M55` ([ADR-029](./docs/DECISIONS.md)).
- All legacy multi-vendor surface (`app/store/*`, vendor approval, `Store` model, Prisma, the dummy `assets/` dataset) is **removed**. If you see any of it, something has gone wrong. Treat any doc implying single-vs-multi-vendor is still open as stale.

## Milestone numbering: the one authoritative sequence

**Every milestone ID in [docs/MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) (`M1`–`M59`, the storefront-redesign group `M60`–`M72`, and the pre-launch close-out group from `M73`) is part of the only implementation sequence; a Proposed entry is not work until the owner approves it.** Always reference work by milestone ID. Phase and group names are labels for status reporting only and carry no execution order ("start `M6`" is an instruction; "start Phase 2" is not). Execution order follows each milestone's stated dependencies, not ascending ID (notably `M14`/`M16`/`M17`/`M19` run before `M3`, [ADR-014](./docs/DECISIONS.md)).

## Who does the work: the AI engineering team

Day-to-day engineering runs through a **development-time** team in [.claude/](./.claude/): an Engineering Manager orchestrating seven specialists (Product, Architecture, UI/UX, Full-Stack, QA, Security/Performance, DevOps/Release), with **human approval required before anything merges or deploys**. Start at [.claude/README.md](./.claude/README.md); pipeline and gates in [.claude/docs/WORKFLOW.md](./.claude/docs/WORKFLOW.md) and [GATES.md](./.claude/docs/GATES.md); house style and the do-not-touch list in [CONVENTIONS.md](./.claude/docs/CONVENTIONS.md). Commands: `/milestone <id>`, `/milestone-dryrun <id>`, `/team-status`, `/write-adr`, `/escalate`. Scale the team to the task: a docs or config fix does not need all seven roles.

This file remains the constitution, `MIGRATION_PLAN.md` the roadmap, milestone IDs the only units of work. **The team is build-time only:** production GoCart must never depend on Claude, Anthropic APIs, MCP, agents, prompts or `.claude/`; deleting `.claude/` must leave a fully working app ([NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md)).

## Hard constraints (do not silently violate)

- **Cash on Delivery only.** Do not add other payment gateways to the active checkout flow. The architecture must stay extensible for online payments later (see [docs/DECISIONS.md](./docs/DECISIONS.md)), but nothing beyond COD ships now.
- **Guest checkout is required.** Never make account creation mandatory to place an order.
- **Admin-only authentication.** There is no public customer login and no vendor login/dashboard in the target design. If you find code implementing vendor auth or a vendor dashboard, treat it as legacy from the original multi-vendor app, not a requirement — flag it, don't silently extend it.
- **Single store — no vendors, no sellers.** Settled in [ADR-006](./docs/DECISIONS.md) (Accepted 2026-08-07). No seller dashboard, no vendor registration, no vendor approval, no per-store ownership of products or orders. Commerce is admin-managed. This is closed — do not reopen, hedge, or treat it as an open question.
- **PostgreSQL only**, accessed through Payload CMS v3's data layer. Don't introduce a second ORM or database.
- **Payload runs embedded in the Next.js app**, not as a separate service — [ADR-009](./docs/DECISIONS.md) (Accepted 2026-08-14). Payload owns `/admin`.
- **SEO-first and mobile-first** are non-negotiable defaults for any storefront UI work — not an afterthought pass at the end.
- **Everything must run in Docker** for both development and production.
- **No AI dependency in the shipped product.** The AI engineering team is development-time tooling only. Never add an AI/LLM package, provider key, prompt, or `.claude/` import to application code — see [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md).
- **Initial production infrastructure baseline is decided** — [ADR-015](./docs/DECISIONS.md): Cloudflare Free + a single ~$10–12/month VPS running the Dockerized app and PostgreSQL + Resend free-tier email + COD. SMS is deferred to a future phase; backups are managed manually for now. Keep the application layer host-agnostic so this baseline stays replaceable/upgradable without a rewrite.

## Working agreement

- **Don't install packages or scaffold Payload/Docker config unless explicitly asked.** Confirm scope before making changes that go beyond documentation or the specific task given.
- **Log real decisions in [docs/DECISIONS.md](./docs/DECISIONS.md)** (ADR format) when a non-obvious technical choice gets made — don't let decisions live only in chat history.
- **Update [docs/TASKS.md](./docs/TASKS.md)** as phases start/complete.
- **Update [docs/CHANGELOG.md](./docs/CHANGELOG.md)** for notable changes, once code starts moving.
- **Prefer editing over rewriting.** This codebase has real history (see `git log`) — don't blow away working code to "start clean."
- When requirements conflict with what's in the existing GreatStack GoCart codebase (e.g. multi-vendor data model vs. single-store target), **surface the conflict rather than guessing** which one wins.

## Keeping context small (for the owner and for agents)

- One milestone = one session; start a new session after the PR merges. Do not read whole large docs: `docs/DECISIONS.md`, `MIGRATION_PLAN.md`, `CHANGELOG.md`, `TASKS.md` are big, so `grep` for the ADR or milestone ID you need and read that section only.
- Keep command output short (`| tail -40`), and read CI logs for the failing job only.
