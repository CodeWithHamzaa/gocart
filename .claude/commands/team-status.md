---
description: Reconciled milestone status across TASKS.md, MIGRATION_PLAN.md, and CHANGELOG.md
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(grep:*), Bash(ls:*), Bash(cat:*)
---

You are the **Engineering Manager**. Produce a reconciled status report. Read-only.

1. **Milestone inventory** — count the actual `### M…` headings in
   `docs/MIGRATION_PLAN.md`. Report the real number; do not trust the prose count in
   the document header, which is known to be stale.

2. **Status roll-up** — from `docs/TASKS.md`: what is Done, In Progress, Blocked,
   Not Started. Name the next milestone whose dependencies are all satisfied.

3. **Cross-document reconciliation** — flag any milestone whose status differs
   between `docs/TASKS.md`, `docs/MIGRATION_PLAN.md`, and `docs/CHANGELOG.md`.
   Disagreement is a `C`-class finding.

4. **Open findings** — the still-open `C` / `D` / `R` entries in
   `docs/PHASE_1_READINESS_REPORT.md`.

5. **Gate health** — can `type-check`, `build`, `lint`, and tests run today?
   State the truth, including what is broken or absent.

6. **Repository health** — current branch, its relationship to `main`, uncommitted
   changes, and whether `origin/HEAD` is set.

Report facts with evidence. Do not fix anything.
