# Safe parallelism

Two milestones may run at the same time **only when every test below passes.**
If any test is uncertain, run sequentially.

> Correctness is more important than agent throughput.

## The tests

1. **Dependency independence** — neither milestone appears on the other's
   `Dependencies` line, directly or transitively.
2. **Disjoint file ownership** — the two `Files` lines share no file. Also check the
   *actual* files each will touch, not just the planned list; excursions happen.
3. **No architectural overlap** — neither needs an ADR that would constrain the other.
4. **No schema overlap** — no two concurrent changes to `collections/`, `globals/`, or
   `payload.config.ts`. Schema changes are effectively serialized: they share one
   database and one migration history.
5. **No shared-documentation collision** — both will want `docs/CHANGELOG.md` and
   `docs/TASKS.md`. The Engineering Manager writes those, serially, after both
   milestones land. Never let two agents write them concurrently.
6. **No shared runtime state** — both need the same dev server and the same Postgres
   instance. Two concurrent seeds or migrations will corrupt each other.

## Worked examples

| Pair | Verdict | Why |
|---|---|---|
| `M29` + `M30` | ✅ Safe | `M29`: `shop/page.jsx`, `lib/payload/products.ts`. `M30`: `lib/features/cart/cartSlice.js`. Disjoint; neither depends on the other |
| `M33` + `M33a` | ❌ Sequential | `M33a` depends on `M33` |
| Two collection changes | ❌ Sequential | Shared schema and migration history |
| `M40`–`M43` (SEO group) | ⚠️ Case by case | Same route files repeatedly; check the actual file lists |
| Anything + a milestone that reseeds the database | ❌ Sequential | Shared runtime state |

## Default

**Sequential.** This project has 68 milestone entries and a single reviewer. Parallel
execution is an optimization to be justified per pair, not a normal operating mode.

`M28` is the standing argument for caution: a bug went live at `M25` and stayed
invisible until `M28`, because each milestone verified only its own surface. There is
still no automated regression net (no tests, no CI). Parallel work without one
compounds that failure mode rather than exposing it.

## Before starting a parallel pair

The Engineering Manager records, in writing:

- both milestone IDs and both `Files` lists
- the result of each of the six tests above
- which branch each runs on
- who writes the shared documentation, and when

If that record cannot be written unambiguously, the pair is not safe to parallelize.
