<div align="center">
  <h1><img src="https://gocart-gs.vercel.app/favicon.ico" width="20" height="20" alt="GoCart Favicon">
   GoCart — Pakistan</h1>
  <p>
    A production-ready, Cash-on-Delivery ecommerce platform for the Pakistani market, built on Next.js, Payload CMS v3, and PostgreSQL.
  </p>
</div>

---

> **Status: implemented, launch NOT cleared.** This repository started as the open-source [GoCart](https://github.com/GreatStackDev/goCart) storefront and is now a single-store, admin-managed, Cash-on-Delivery platform for Pakistan on Next.js 16, Payload CMS v3 and PostgreSQL. The storefront, guest COD checkout, order confirmation, guest order lookup (order number + phone), the Payload admin, Cloudflare Turnstile on ordering, migrations as a deploy step, backups and health checks are implemented. **Launch is not cleared:** real-key Turnstile checks, a Cloudflare WAF rule, first-deploy checks and an external uptime monitor remain open (see "Launch blockers" in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)). [docs/TASKS.md](./docs/TASKS.md) is the source of truth for milestone status.

## What this is

- **Payload CMS v3** as the content/commerce backend and admin panel
- **PostgreSQL** as the datastore
- **Cash on Delivery** as the only payment method for launch (architecture leaves room for online payment gateways later)
- **Guest checkout** — customers can order without creating an account
- **Admin-only login** — Payload `/admin` is the only authenticated surface; there is no customer login
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

This codebase started from the GreatStack **GoCart** open-source storefront (Next.js + Tailwind CSS + Redux Toolkit). `LICENSE.md` and `CODE_OF_CONDUCT.md` carry over unchanged. **`CONTRIBUTING.md` has been rewritten** for this project: marketplace features are permanently out of scope ([ADR-006](./docs/DECISIONS.md)), and Payload CMS v3 is the system of record ([ADR-003](./docs/DECISIONS.md)).

## Getting started

Requires Docker with Compose and Node.js 22 (the version the `Dockerfile` and CI use; `package.json` declares no `engines` field).

```bash
docker compose up -d postgres   # PostgreSQL, bound to 127.0.0.1 only
cp .env.example .env            # set DATABASE_URI and a real PAYLOAD_SECRET
npm install
npm run dev
```

The storefront runs at `http://localhost:3000` and the Payload admin panel at
`http://localhost:3000/admin`; on an empty database the first `/admin` visit shows the
create-first-user screen (enabled by `PAYLOAD_ALLOW_FIRST_REGISTER=1` in `.env.example`,
development only). `next dev` creates the schema in an empty development database itself.
Run `npm run seed` for development data.

To run the app in Docker as well, use `docker compose up` (database and app; the app port is
loopback-only). Ordering and order lookup require a verified Cloudflare Turnstile token;
`.env.example` and the dev compose file default to Cloudflare's public always-pass test keys,
which need network access to Cloudflare and are for development and CI only.

Verification: `npm run type-check`, `npm run lint` and `npm run build`, the unit-style checks
(`npm run test:env`, `test:turnstile`, `test:idempotency`, `test:users-guard`) and the Playwright
end-to-end tests (`npm run test:e2e`: golden-path checkout, SEO and mobile layout) against a
seeded database. CI (`.github/workflows/ci.yml`) runs them on every pull request.

### Production

Production is a separate Compose stack, `docker-compose.prod.yml`: PostgreSQL, a one-shot
`migrate` step (environment validation, `payload migrate`, a verifier, restricted database roles
and the first admin created from a secret), the app (the `Dockerfile` `production` target, a
non-root image built without a database) and a Cloudflare Tunnel connector. No service
publishes a host port; the site is reachable only through the tunnel. Production never pushes
the schema and does not need seeding. Orders need real Cloudflare Turnstile keys.

Do not run it from a development checkout without an explicit `--env-file`. The ordered steps
(env file, migrate, deploy, Cloudflare Tunnel, Turnstile, bootstrap admin, backups) and the
launch blockers are in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md); that file is the only
production reference. `docker build --target dev .` builds the development image.

See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## Building GoCart

Day-to-day engineering runs through a development-time AI engineering team defined in
[.claude/](./.claude/) — seven specialists under an Engineering Manager, with human approval
required before anything merges.

**This is build-time tooling only.** The shipped application has no AI, Claude,
Anthropic, MCP, or agent dependency of any kind, and builds and runs with `.claude/`
deleted. See [.claude/docs/NO_PRODUCTION_AI.md](./.claude/docs/NO_PRODUCTION_AI.md).
