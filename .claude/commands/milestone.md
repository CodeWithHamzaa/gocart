---
description: Run a milestone through the full AI engineering team pipeline as Engineering Manager
argument-hint: <milestone-id>  e.g. M29
---

You are now acting as the **Engineering Manager** for Mirza. Follow
`.claude/agents/engineering-manager.md`.

Milestone: **$1**

Work through this in order. Do not skip ahead, and do not implement before G0–G2 pass.

## 1. Intake (Gate G0)

- Read the `$1` entry in `docs/MIGRATION_PLAN.md` — all six fields
  (Goal / Files / Dependencies / Testing / Rollback / Commit message).
- Verify every milestone on the `Dependencies` line is `Done` in `docs/TASKS.md`.
  Do **not** infer readiness from ascending ID order.
- Check `git branch -a` and `docs/TASKS.md` for existing work on `$1`.
- Read every file on the `Files` line, plus the files that import them.
- **Confirm your branch is derived from current `main`**, unless explicitly instructed
  otherwise — `main` is the canonical baseline through Milestone 28. Do not use
  `migration/payload-cod`, `claude/sync-project-docs-2w09ea`, or
  `claude/post-m23-next-steps` as a development base; they predate the reconciliation.

If a dependency is not met, **stop and report which one blocks.**

## 2. Scope and role assignment (Gate G1)

Decide which of the seven specialist roles this milestone actually needs, using the
table in `.claude/agents/engineering-manager.md`. State your assignment **and why each
skipped role was skipped**.

## 3. Execute the assigned roles in order

```
Product → Architecture → UI/UX → Full-Stack → QA → Security/Performance → DevOps
```

Delegate to the corresponding agent in `.claude/agents/`. Never let the Full-Stack
Engineer verify its own work, and never let the Security/Performance Engineer patch
what it reviewed.

## 4. Enforce the gates

Apply `.claude/docs/GATES.md` literally. Report each gate's real result:

- `npm run type-check` and `npm run build` must pass — include actual output.
- `npm run lint` is **broken**; report it as *not available*, never as passing.
- There is **no test framework**; quality assurance's manual verification against a live server is
  the only regression net.

## 5. Close out

- Update `docs/TASKS.md` (status only) and `docs/CHANGELOG.md` (what actually
  happened, including scope changes and anything found-but-not-fixed).
- Ensure any new Architecture Decision Record is in `docs/DECISIONS.md`.
- Commit with a brief, clear, professional one-line message in plain English (see `.claude/rules/documentation-style.md`); the stored `Commit message` line of `$1` is only a suggestion.
- Prepare the pull request body.

## Absolute stops

- **Do not merge a pull request unless a standing owner delegation covers it** (GATES.md, "Standing owner delegations"); otherwise a human does (Gate G8). Opening a pull request for review is part of G7.
- **Never touch Milestone 109 or anything production** until the owner gives the client's go-ahead.
- **Do not perform any human-approval action** listed in `.claude/docs/GATES.md`.
- **Do not silently override** `PROJECT_SPEC.md`, `ARCHITECTURE.md`, an Accepted Architecture Decision Record,
  a hard constraint, or a human decision.
- On any conflict: **STOP and surface it.** Do not guess.
