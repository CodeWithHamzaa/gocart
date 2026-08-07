<div align="center">
  <h1><img src="https://gocart-gs.vercel.app/favicon.ico" width="20" height="20" alt="GoCart Favicon">
   GoCart — Pakistan</h1>
  <p>
    A production-ready, Cash-on-Delivery ecommerce platform for the Pakistani market, built on Next.js, Payload CMS v3, and PostgreSQL.
  </p>
</div>

---

> **Status: Planning.** This repository was cloned from the open-source [GoCart](https://github.com/GreatStackDev/goCart) multi-vendor storefront and is being transformed into a single-store, admin-managed, Cash-on-Delivery platform for Pakistan. No application code has changed yet — see [docs/](./docs) for the plan.

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

This codebase started from the GreatStack **GoCart** open-source multi-vendor storefront (Next.js + Tailwind CSS + Redux Toolkit + Prisma). Its `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `LICENSE.md` still apply to this repository.

## Getting started

Local setup instructions will be added once the Payload CMS v3 + PostgreSQL integration lands (see [docs/TASKS.md](./docs/TASKS.md)). In the meantime, the original Next.js app still runs with:

```bash
npm install
npm run dev
```
