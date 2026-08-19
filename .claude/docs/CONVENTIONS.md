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
- No ESLint or Prettier config exists. Match the surrounding file.

## Comment headers

Every non-inherited file opens with a milestone-ID header saying what it is and why,
citing the relevant ADR:

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

- Cite work by **milestone ID** (`M29`), never by phase or group name. Group headings
  are labels for navigation only and carry **no execution order**.
- Execution order comes from each milestone's `Dependencies` line, not from ascending
  ID. `M14`/`M16`/`M17`/`M19` run before `M3` (ADR-014).

## Commits

- One milestone, one reviewable commit.
- Use the milestone's own `Commit message` line from `docs/MIGRATION_PLAN.md` verbatim.
- Never include a model or AI-tool identifier in a commit message, PR title, PR body,
  or code comment.

---

# Do-not-touch list

Deliberate decisions that look like bugs. **Do not "fix" these.** Each was tested,
decided, and recorded.

### `app/(public)/category/[slug]/` has no `loading.tsx` — intentional

A `loading.tsx` on that route wraps the segment in a `<Suspense>` boundary that
flushes an HTTP 200 **before** the awaited page component can call `notFound()`.
Unknown slugs and out-of-range pages then return 200 instead of 404, destroying the
route's core SEO purpose.

Confirmed by isolation testing; `error.tsx`, `generateMetadata`, and the SSG/dynamic
choice were all ruled out. `app/(public)/categories/` **does** have `loading.tsx` —
it has no `notFound()` path, so no conflict. Full account: `M27a` in
`docs/MIGRATION_PLAN.md`.

### `/` , `/shop`, and `/product/[productId]` are `force-dynamic` — intentional

Admin curation (`isFeatured`) must show without a redeploy, and the production build
cannot assume a reachable database (`M23`).

### `app/(public)/orders/page.jsx` uses dummy data — intentional

There is no account system to key a real order list off. It stays dummy until `M36`
implements guest order lookup. Do not rip it out while "removing dummy data".

### `components/Loading.jsx` is unreferenced — intentional

Left in place at `M15`/`M18` as a generic reusable component. Not dead code.

### `"Best Selling"` is an `isFeatured` flag, not a ranking — intentional

There is no sales or review data to rank by. ADR-022 chose admin curation over a
fabricated proxy metric. Do not invent a ranking.

### `npm run lint` is broken — known, not yet repaired

`next lint` with no ESLint dependency and no config. **Never report it as passing.**
Repair is a tracked blocker, not a side fix.

---

# Known live gaps (owned elsewhere — report, do not fix opportunistically)

| Gap | Owner |
|---|---|
| `ProductDetails.jsx` claims "Free shipping worldwide" | `M55a` |
| `Footer.jsx` hardcodes a US phone and address | `M55a` |
| `Newsletter.jsx` form silently discards input | `M48a` |
| `OrderSummary.jsx` coupon input is non-functional | `M47` |
| `images.unoptimized: true` is wrong for self-hosted | **no milestone owns this** |
| `tsx` invoked by `npm run seed` but not in `devDependencies` | **unowned** |
| Order notifications (WhatsApp/email) | **no milestone exists** (`D8`) |
