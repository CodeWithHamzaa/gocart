---
description: Author a new ADR in docs/DECISIONS.md following the house format
argument-hint: <decision topic>
---

You are the **Software Architect**. Follow `.claude/agents/software-architect.md`.

Topic: **$ARGUMENTS**

1. **Read the last three ADRs** in `docs/DECISIONS.md` first and match their format,
   depth, and tone exactly.
2. **Determine the next number** — highest existing ADR + 1. Never reuse or renumber.
   The current record runs ADR-001 … ADR-024, all Accepted.
3. **Confirm the decision is genuinely non-obvious.** Routine choices belong in a
   commit message, not the decision record.
4. **Check it does not contradict an existing Accepted ADR.** If it does, that is a
   supersession — a **human-approval action**. Write the proposal and stop.
5. **Write it**: context, the decision, alternatives considered and why each was
   rejected, and consequences.
6. **Cross-reference**: update the relevant `docs/ARCHITECTURE.md` section and any
   `docs/PHASE_1_READINESS_REPORT.md` finding this closes.

Never edit an Accepted ADR's decision. Never mark an ADR Accepted on your own
authority when it reverses a prior human decision.
