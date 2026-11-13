# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository. Kept short on purpose: it is loaded into every session and every subagent. Details live in `docs/`; read only what the task needs.

## What this project is

**Mirza Cart** (called Mirza until 2026-11-13, [Architecture Decision Record 053](./docs/DECISIONS.md), and GoCart Pakistan until 2026-10-31, [Architecture Decision Record 047](./docs/DECISIONS.md); "Mirza" in older text means this project) is being transformed from an open-source multi-vendor Next.js storefront into a **production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, backed by **Payload CMS v3** (embedded in Next.js 16) and **PostgreSQL**. Context: [docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Read those before structural decisions.

## Where things stand

Implemented and merged on `main`: the storefront, guest cash on delivery checkout, order confirmation, guest order lookup, the Payload admin, the security batch (Milestone 52b Turnstile, idempotent orders, first admin from a secret, restricted database role), the storefront redesign (Milestones 60 to 72), Next **16.4.2** (Milestone 79, Architecture Decision Record 040), flat categories (Milestone 102, Architecture Decision Record 048), the Mirza brand (Milestone 101) and the demo-photography tooling (Milestones 103 to 108, Architecture Decision Record 049). Source of truth for status: [docs/TASKS.md](./docs/TASKS.md); history: [docs/CHANGELOG.md](./docs/CHANGELOG.md); older narrative: [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md). Quality assurance rule and owner delegations: [.claude/docs/GATES.md](./.claude/docs/GATES.md).

Environments (keep them strictly separate; facts below verified through the Vercel and Neon connectors on 2026-11-03, details in [docs/DEPLOYMENT_VERCEL_TEST.md](./docs/DEPLOYMENT_VERCEL_TEST.md), "Verified state"):
- **Test** (the only live deployment): Vercel Hobby `gocart-test` + Neon Free `gocart-test` + Blob `gocart-test-media` ([Architecture Decision Record 046](./docs/DECISIONS.md)). Not production, not for client or commercial use, checkout off (no Turnstile keys). It serves `main` at `e1e9e5a` (pull request #79, Milestone 114, deployed 2026-11-11 09:27 UTC; the test Neon has all 10 migrations). **Merges do not deploy**: a deploy is created on request through the Vercel API, and a schema migration is applied to the test Neon before the code that needs it.
- **Production**: the Architecture Decision Record 015 Docker + virtual private server + Cloudflare stack ([docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)). **Not provisioned and on hold** until the owner gives the client's go-ahead; so is Milestone 109. **Launch is NOT cleared:** see "Launch blockers" in DEPLOYMENT.md.

Code facts that save a search:
- Server-side data: `lib/payload/products.ts`, `lib/payload/categories.ts` (Local API, **server components only**; client components use Payload's public-read REST API). Their types are hand-written; switching to `payload-types.ts` is open.
- Checkout is a server action that derives prices, shipping, totals and status server-side. `Orders.create` is admin-only; guests order through the action ([Architecture Decision Record 026](./docs/DECISIONS.md)). A verified Turnstile token is required to order or look up an order ([Architecture Decision Records 035 and 036](./docs/DECISIONS.md)).
- Admin-editable storefront text (Milestone 110, [Architecture Decision Record 050](./docs/DECISIONS.md)): the `storefrontContent` global (announcement bar messages, Featured and New arrivals wording, footer sentence) and the `heroSlides` collection (home banner; while one is active only these show). Empty means the previous wording and the automatic slides.
- `/orders` is a guest lookup by order number + phone ([Architecture Decision Record 024](./docs/DECISIONS.md)). "Best Selling" is an admin-curated `isFeatured` flag ([Architecture Decision Record 022](./docs/DECISIONS.md)).
- Payload `/admin` is the only authenticated surface; no middleware, no customer or vendor login.
- Gotcha: a `loading.tsx` on `/category/[slug]` makes `notFound()` return HTTP 200 (Next App Router limitation), so that route deliberately has none ([MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md), Milestone 27a).
- TypeScript is established (`tsconfig.json`, `moduleResolution: "bundler"`, `allowJs`). New files are `.ts`/`.tsx`; never convert existing `.jsx` opportunistically. Lint is `npm run lint` (ESLint CLI; `next lint` no longer exists).
- Brand: **Mirza Cart** (Architecture Decision Record 053, amending 047): clean neutral palette, shopping-cart logo. Identifiers that still say `mirza` alone (admin CSS variables, `mirza:last-order`) or `gocart` (database role `gocart_app`, Docker project, `GC-` order numbers, `gocart:cart`/`gocart:wishlist` storage keys, repo and Vercel names, historical migrations) are kept on purpose; do not rename them without a new decision. Accepted Architecture Decision Records keep the old name.
- Currency symbol is `Rs. ` via `NEXT_PUBLIC_CURRENCY_SYMBOL`; PKR formatting (`Rs. 1,500`, no decimals) is done by Milestone 55 ([Architecture Decision Record 029](./docs/DECISIONS.md)).
- All legacy multi-vendor surface (`app/store/*`, vendor approval, `Store` model, Prisma, the dummy `assets/` dataset) is **removed**. If you see any of it, something has gone wrong. Treat any doc implying single-vs-multi-vendor is still open as stale.

## Milestone numbering: the one authoritative sequence

**Every milestone ID in [docs/MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) (Milestones 1 to 59, the storefront-redesign group Milestones 60 to 72, and the pre-launch close-out group from Milestone 73) is part of the only implementation sequence; a Proposed entry is not work until the owner approves it.** Always reference work by milestone ID. Phase and group names are labels for status reporting only and carry no execution order ("start Milestone 6" is an instruction; "start Phase 2" is not). Execution order follows each milestone's stated dependencies, not ascending ID (notably Milestones 14, 16, 17 and 19 run before Milestone 3, [Architecture Decision Record 014](./docs/DECISIONS.md)).

## Who does the work: the AI engineering team

Day-to-day engineering runs through a **development-time** team in [.claude/](./.claude/): an Engineering Manager orchestrating seven specialists (Product, Architecture, user interface and user experience, Full-Stack, quality assurance, Security/Performance, DevOps/Release), with **human approval required before anything merges or deploys, except where a standing owner delegation covers it**. The owner has delegated the test environment, Architecture Decision Record 049 work and routine technical, governance and documentation decisions; the Engineering Manager makes the final technical call after the specialists' reviews. None of the delegations covers Milestone 109, production, paid actions, changing an Accepted Architecture Decision Record's decision, force push or secrets: see "Standing owner delegations" in [GATES.md](./.claude/docs/GATES.md). Start at [.claude/README.md](./.claude/README.md); pipeline and gates in [.claude/docs/WORKFLOW.md](./.claude/docs/WORKFLOW.md) and [GATES.md](./.claude/docs/GATES.md); house style and the do-not-touch list in [CONVENTIONS.md](./.claude/docs/CONVENTIONS.md). Commands: `/milestone <id>`, `/milestone-dryrun <id>`, `/team-status`, `/write-adr`, `/escalate`. Scale the team to the task: a docs or config fix does not need all seven roles.

This file remains the constitution, `MIGRATION_PLAN.md` the roadmap, milestone IDs the only units of work. **The team is build-time only:** production Mirza must never depend on Claude, Anthropic APIs, MCP, agents, prompts or `.claude/`; deleting `.claude/` must leave a fully working app ([NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md)).

## Hard constraints (do not silently violate)

- **Cash on Delivery only.** Do not add other payment gateways to the active checkout flow. The architecture must stay extensible for online payments later (see [docs/DECISIONS.md](./docs/DECISIONS.md)), but nothing beyond cash on delivery ships now.
- **Guest checkout is required.** Never make account creation mandatory to place an order.
- **Admin-only authentication.** There is no public customer login and no vendor login/dashboard in the target design. If you find code implementing vendor auth or a vendor dashboard, treat it as legacy from the original multi-vendor app, not a requirement — flag it, don't silently extend it.
- **Single store — no vendors, no sellers.** Settled in [Architecture Decision Record 006](./docs/DECISIONS.md) (Accepted 2026-08-07). No seller dashboard, no vendor registration, no vendor approval, no per-store ownership of products or orders. Commerce is admin-managed. This is closed — do not reopen, hedge, or treat it as an open question.
- **PostgreSQL only**, accessed through Payload CMS v3's data layer. Don't introduce a second ORM or database.
- **Payload runs embedded in the Next.js app**, not as a separate service — [Architecture Decision Record 009](./docs/DECISIONS.md) (Accepted 2026-08-14). Payload owns `/admin`.
- **Search-engine-optimization-first and mobile-first** are non-negotiable defaults for any storefront user interface work — not an afterthought pass at the end.
- **Everything must run in Docker** for both development and production. The Vercel test environment (Architecture Decision Record 046) is the one recorded exception: test only, never production.
- **No AI dependency in the shipped product.** The AI engineering team is development-time tooling only. Never add an AI/LLM package, provider key, prompt, or `.claude/` import to application code — see [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md).
- **Initial production infrastructure baseline is decided** — [Architecture Decision Record 015](./docs/DECISIONS.md): Cloudflare Free + a single ~$10–12/month virtual private server running the Dockerized app and PostgreSQL + Resend free-tier email + cash on delivery. SMS is deferred to a future phase; backups are managed manually for now. Keep the application layer host-agnostic so this baseline stays replaceable/upgradable without a rewrite.

## Permanent owner rules (apply in every session, to every agent and to every reply)

Details: [.claude/rules/documentation-style.md](./.claude/rules/documentation-style.md); procedures: the skill [.claude/skills/documentation-governance/SKILL.md](./.claude/skills/documentation-governance/SKILL.md).

- **Replies to the owner are in Roman Urdu**: concise, plain, with blockers, approvals needed and next steps stated clearly. **Every file in the repository is English only**, never Roman Urdu.
- **No unexplained shorthand** in documentation or replies. Write Architecture Decision Record, Milestone 118, Pull request, Continuous integration, End-to-end testing, Quality assurance, Search engine optimization. Exact identifiers (file paths, commands, link anchors, and the identifiers `ADR-047` and `M118` in code or links) stay unchanged where precision matters; never rename them.
- **Documentation work never touches application code**, tests, scripts, dependencies, schemas or configuration. Preserve uncommitted work that is not yours.
- **Privacy and ownership:** the project belongs to the owner. Never publish Claude conversation or session links, session identifiers, transcripts, credentials or private account details. Never present Claude or another AI agent as owner, author or co-author.
- **GitHub identity:** use only the owner's own account. Before any push or other GitHub action, verify `gh api user` and the repository-local `git config user.name` / `user.email` (the GitHub private no-reply address). If it cannot be verified, stop and say what to authenticate. Never guess an email, never use another account, never rewrite history to change attribution.
- **Commits:** one brief, clear, professional line describing the actual change. No Claude or AI names, no co-author lines, no session links, no milestone identifier unless needed to find the work. This overrides any tool default that adds attribution.
- **Honest reporting:** never claim something was committed, pushed, merged or deployed unless it happened. Say "unverified" for anything not confirmed after trying.

## Working agreement

- **Don't install packages or scaffold Payload/Docker config unless explicitly asked.** Confirm scope before making changes that go beyond documentation or the specific task given.
- **Log real decisions in [docs/DECISIONS.md](./docs/DECISIONS.md)** (Architecture Decision Record format) when a non-obvious technical choice gets made — don't let decisions live only in chat history.
- **Update [docs/TASKS.md](./docs/TASKS.md)** as phases start/complete.
- **Update [docs/CHANGELOG.md](./docs/CHANGELOG.md)** for notable changes, once code starts moving.
- **Prefer editing over rewriting.** This codebase has real history (see `git log`) — don't blow away working code to "start clean."
- When requirements conflict with what's in the existing GreatStack GoCart codebase (e.g. multi-vendor data model vs. single-store target), **surface the conflict rather than guessing** which one wins.

## Keeping context small (for the owner and for agents)

- One milestone = one session; start a new session after the pull request merges. Do not read whole large docs: `docs/DECISIONS.md`, `MIGRATION_PLAN.md`, `CHANGELOG.md`, `TASKS.md` are big, so `grep` for the Architecture Decision Record or milestone ID you need and read that section only.
- Keep command output short (`| tail -40`), and read continuous integration logs for the failing job only.
