# The AI team is development-time only

**Absolute rule.** The GoCart application that ships to the client must run with no
knowledge that this team ever existed.

## Production GoCart must never depend on

- Claude, Claude Code, or any Anthropic API
- Any AI or LLM provider, SDK, or API key
- AI agents or agent orchestration
- MCP (Model Context Protocol) servers or clients
- AI prompts embedded in application code or data
- The `.claude/` directory
- Any AI runtime, inference service, vector store, or embedding pipeline

After handover, the client receives a normal Next.js + Payload CMS + PostgreSQL
application that operates completely independently.

## The boundary

| Development-time (this team) | Production (ships to client) |
|---|---|
| `.claude/agents/` | `app/`, `components/`, `lib/` |
| `.claude/commands/` | `collections/`, `globals/`, `payload.config.ts` |
| `.claude/docs/` | `scripts/`, `Dockerfile`, `docker-compose.yml` |
| `.claude/settings.json` | `package.json` dependencies |
| `CLAUDE.md` | `docs/` (plain project documentation) |

Everything in the left column is tooling for the people and agents building the
product. Nothing in it is imported, read, bundled, deployed, or required at runtime.

`CLAUDE.md` and `docs/` are ordinary Markdown. They document the project for whoever
maintains it next — human or otherwise — and carry no runtime dependency.

## Rules for every role

1. **Never** add an AI/LLM package to `package.json` — not to `dependencies`, not to
   `devDependencies`.
2. **Never** import from `.claude/` in application code. Nothing under `app/`,
   `components/`, `lib/`, `collections/`, `globals/`, or `scripts/` may reference it.
3. **Never** add an AI provider key to `.env.example`, `docker-compose.yml`, the
   `Dockerfile`, or any deployment configuration.
4. **Never** add an application feature whose behavior requires a model call —
   no AI search, no AI descriptions, no AI recommendations, no AI support chat.
   Any such feature is a **product decision requiring an ADR and human approval**,
   and it is out of scope for v1 regardless.
5. **Never** ship a prompt as application data or content.
6. `.claude/` may be committed for the development team's benefit, but deleting the
   entire directory must leave a fully working application.

## Verification

Run these from the repository root. All should report clean:

```bash
# 1. No AI/LLM dependency in the manifest
grep -nEi 'anthropic|openai|claude|langchain|llamaindex|"ai"|mcp|vercel/ai' package.json

# 2. No application code references .claude/
grep -rn '\.claude' app components lib collections globals scripts payload.config.ts

# 3. No AI provider keys in configuration
grep -nEi 'anthropic|openai|claude|llm|ai_api|ai-key' .env.example docker-compose.yml Dockerfile

# 4. The app builds with .claude/ absent
mv .claude /tmp/claude-check && npm run build && mv /tmp/claude-check .claude
```

Check 4 is the real proof: **the application must build and run with `.claude/`
deleted.** If it does not, the boundary has been violated and the build is broken
until it is restored.

The Security / Performance Engineer verifies checks 1–3 on any milestone that touches
`package.json`, `.env.example`, or deployment configuration. The DevOps / Release
Engineer verifies check 4 before any release-facing milestone.
