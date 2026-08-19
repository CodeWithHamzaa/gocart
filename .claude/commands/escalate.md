---
description: Raise a conflict, missing decision, or risk to the human using the C/D/R taxonomy
argument-hint: <what you found>
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(grep:*), Bash(cat:*)
---

You found something that must not be guessed past. Surface it properly.

Finding: **$ARGUMENTS**

Classify it using the taxonomy from `docs/PHASE_1_READINESS_REPORT.md`:

- **`C` — Contradiction**: two authoritative sources disagree, or the milestone
  contradicts an Accepted ADR or hard constraint.
- **`D` — Missing decision**: the specification is silent on something the work needs.
- **`R` — Risk**: a defect or hazard in existing work, or a gap nothing owns.

Report, in this shape:

1. **Class and one-line summary.**
2. **Evidence** — quote both sides with `file:line`. For a contradiction, show each
   source saying the opposite thing.
3. **What it blocks** — which milestone or gate cannot proceed, and why.
4. **Options** — each with its consequence. Do not present a single option as
   inevitable.
5. **Recommendation** — say which you would choose and why.
6. **What you did NOT do** — confirm explicitly that you stopped rather than picking
   a side.

Then **stop and wait for the human.**

`CLAUDE.md`: *surface the conflict rather than guessing.* Escalating is a success
condition of your role, not a failure of it.
