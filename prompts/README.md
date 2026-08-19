# prompts/

> **Superseded.** Reusable agent workflows now live in **[`.claude/commands/`](../.claude/commands/)**
> as slash commands, and role definitions in **[`.claude/agents/`](../.claude/agents/)**.

This directory was created as a home for AI prompt templates and was never populated.
It is kept only as a pointer so nobody adds a second, competing location.

Where things went:

| Original intent | Now lives at |
|---|---|
| "Scaffold a Payload collection" | `.claude/agents/fullstack-engineer.md` |
| "Write an ADR" | `.claude/commands/write-adr.md` |
| "Review a PR against DECISIONS.md" | `.claude/agents/software-architect.md` |

**Do not add prompt files here.** Add a slash command to `.claude/commands/` or extend
the relevant role in `.claude/agents/`.
