---
description: Readiness analysis for a milestone — verifies it could be executed, without writing any code
argument-hint: <milestone-id>  e.g. M29
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(find:*)
---

You are the **Engineering Manager** performing a **dry run** of milestone **$1**.

> **This command must not modify application code.** No `Write`, no `Edit`, no commits.
> Produce an analysis only.

Report every section:

## 1. Milestone contract
Quote `$1`'s six fields verbatim from `docs/MIGRATION_PLAN.md`.

## 2. Dependency check (G0)
For each milestone on the `Dependencies` line, give its status from `docs/TASKS.md`
and the evidence. State whether G0 passes.

## 3. Current state of the target files
Read every file on the `Files` line. Describe what exists today and precisely what
would have to change. Cite `file:line`.

## 4. Architecture and ADR check (G2)
Which Accepted ADRs and hard constraints bear on this milestone? Does anything in the
milestone as written contradict one? If so, that is a `C`-class finding — report it,
do not resolve it.

## 5. Role assignment
Which of the seven specialist roles would you assign, and **why is each other role
skipped**?

## 6. Acceptance criteria
Restate the `Testing` line as independently checkable criteria, including edge cases.

## 7. Gate readiness
Can each gate actually run right now? Name every blocker — missing tooling, missing
seed data, broken scripts, absent test infrastructure.

## 8. Risks and unknowns
Anything that could make this milestone larger than its `Files` line suggests.
Check the consumers of every file involved.

## 9. Parallelism
Apply `.claude/docs/PARALLELISM.md`. Which milestones could safely run alongside `$1`?

## 10. Verdict
One of: **READY TO EXECUTE** · **READY WITH PREREQUISITES** · **BLOCKED**.
Justify it, and list any prerequisite explicitly.
