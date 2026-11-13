# Coding conventions

These were never written down — they were enforced consistently in code. This file
makes them explicit so every role applies the same ones.

## Language and files

- **New files are `.ts` / `.tsx`.** Existing `.jsx` is **never opportunistically
  converted** — edit it in place as `.jsx`.
- Current mix: 27 `.jsx`, 12 `.ts`, 7 `.tsx`, 5 `.js`. That is expected, not debt to
  clean up on the side.
- `tsconfig.json`: `strict: true`, `allowJs: true`, `checkJs: false`,
  `moduleResolution: "bundler"`. Path aliases: `@/*` → repo root,
  `@payload-config` → `payload.config.ts`.

## Style

- TypeScript: **no semicolons**, single quotes, 2-space indent, named exports,
  `import type` for type-only imports.
- Existing `.jsx` files keep their inherited formatting. Do not reformat a file you
  are not otherwise changing.
- ESLint (`next/core-web-vitals`) is configured; no Prettier config exists. Match the surrounding file.

## Comment headers

Every non-inherited file opens with a milestone-ID header saying what it is and why,
citing the relevant Architecture Decision Record:

```ts
// M22: server-side data-fetching utility for Products. Uses Payload's Local API
// (in-process, no HTTP hop) — for Server Components, Route Handlers, and Server
// Actions only. Never import this from a 'use client' component.
```

Match the surrounding comment density. Do not over-comment.

## Data access

- `lib/payload/*.ts` → Payload **Local API**, server-only.
- `'use client'` components → Payload's public **REST API**
  (`components/CategoriesMarquee.jsx`, `app/(public)/cart/page.jsx` are the patterns).
- Pass `overrideAccess: false` on Local API reads so access control is exercised.
- Types in `lib/payload/*.ts` are **hand-written mirrors** of the collections —
  `payload generate:types` fails in the authoring sandbox, so `payload-types.ts` has
  never been generated. Change a collection field, change the mirror in the same commit.

## Referencing work

- Cite work by **milestone ID** (Milestone 29), never by phase or group name. Group headings
  are labels for navigation only and carry **no execution order**.
- Execution order comes from each milestone's `Dependencies` line, not from ascending
  ID. Milestones 14, 16, 17 and 19 run before Milestone 3 (Architecture Decision Record 014).

## Commits

- One milestone, one reviewable commit.
- Write a brief, clear, professional one-line message in plain English (see `.claude/rules/documentation-style.md`). The milestone's stored `Commit message` line in `docs/MIGRATION_PLAN.md` is only a suggestion; use it only when it meets this standard. A milestone identifier belongs in a commit message only when it is needed to find the work, and then it is written in full ("Milestone 118").
- Never include a model or AI-tool identifier, co-author line or session link in a commit message, pull request title, pull request body,
  or code comment.

---

# Do-not-touch list

Deliberate decisions that look like bugs. **Do not "fix" these.** Each was tested,
decided, and recorded.

### `app/(public)/category/[slug]/` has no `loading.tsx` — intentional

A `loading.tsx` on that route wraps the segment in a `<Suspense>` boundary that
flushes an HTTP 200 **before** the awaited page component can call `notFound()`.
Unknown slugs and out-of-range pages then return 200 instead of 404, destroying the
route's core search engine optimization purpose.

Confirmed by isolation testing; `error.tsx`, `generateMetadata`, and the SSG/dynamic
choice were all ruled out. `app/(public)/categories/` **does** have `loading.tsx` —
it has no `notFound()` path, so no conflict. Full account: Milestone 27a in
`docs/MIGRATION_PLAN.md`.

### `/` , `/shop`, and `/product/[productId]` are `force-dynamic` — intentional

Admin curation (`isFeatured`) must show without a redeploy, and the production build
cannot assume a reachable database (Milestone 23).

### `/orders` is a guest lookup by order number + phone — intentional

Milestone 36 replaced the old dummy page (Architecture Decision Record 024). There is no account system and no order list.
Exactly one `button[type=submit]` must exist on the page (the end-to-end suite relies on it). Do not
turn it into an order list or relax `Orders` read access.

### `components/Loading.jsx` has no importer — verified 2026-10-24

Left in place at Milestones 15 and 18 as a generic reusable component and restyled in Milestone 66. Still not
imported anywhere; keep it unless a milestone removes it.

### `"Best Selling"` is an `isFeatured` flag, not a ranking — intentional

There is no sales or review data to rank by. Architecture Decision Record 022 chose admin curation over a
fabricated proxy metric. Do not invent a ranking.

### `npm run lint` works (repaired 2026-10-09)

`eslint.config.mjs` extends `next/core-web-vitals`. Run it and report its real output; it is a
style/correctness check, not a substitute for quality assurance's live verification.

---

# Known live gaps (owned elsewhere — report, do not fix opportunistically)

| Gap | Owner |
|---|---|
| `images.unoptimized: true` (the optimizer is switched off on purpose) | Architecture Decision Record 034, suspended by Architecture Decision Record 036 |
| `tsx` is invoked by `npm run seed` and `deploy:migrate` but is not in `devDependencies` (it resolves from `node_modules/.bin` today) | **unowned** |
| Order notifications (WhatsApp/email) | **no milestone exists** (`D8`) |
