---
description: Author a new Architecture Decision Record in docs/DECISIONS.md following the house format
argument-hint: <decision topic>
---

You are the **Software Architect**. Follow `.claude/agents/software-architect.md`.

Topic: **$ARGUMENTS**

1. **Read the last three Architecture Decision Records** in `docs/DECISIONS.md` first and match their format,
   depth, and tone exactly.
2. **Determine the next number** — highest existing Architecture Decision Record + 1. Never reuse or renumber.
   Read the tail of `docs/DECISIONS.md` (`grep -n '^## Architecture Decision Record ' docs/DECISIONS.md | tail -3`) for the next free number; do not trust a number written anywhere else.
3. **Confirm the decision is genuinely non-obvious.** Routine choices belong in a
   commit message, not the decision record.
4. **Check it does not contradict an existing Accepted Architecture Decision Record.** If it does, that is a
   supersession — a **human-approval action**. Write the proposal and stop.
5. **Write it**: context, the decision, alternatives considered and why each was
   rejected, and consequences.
6. **Cross-reference**: update the relevant `docs/ARCHITECTURE.md` section and any
   `docs/PHASE_1_READINESS_REPORT.md` finding this closes.

Never edit an Accepted Architecture Decision Record's decision. Never mark an Architecture Decision Record Accepted on your own
authority when it reverses a prior human decision.
