# docs/

Detailed, living documentation for Mirza (formerly the GoCart Pakistan transformation, [Architecture Decision Record 047](./DECISIONS.md)). Root-level `README.md` and `CLAUDE.md` are the entry points; everything else lives here.

| File | Purpose |
|---|---|
| [PROJECT_SPEC.md](./PROJECT_SPEC.md) | What we're building: requirements, scope, roles, flows |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How we're building it: current state, target design, data model |
| [DECISIONS.md](./DECISIONS.md) | Architecture Decision Record log — why we chose what we chose |
| [REPOSITORY_ANALYSIS.md](./REPOSITORY_ANALYSIS.md) | Read-only audit of the inherited codebase as it actually is |
| [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) | Per-feature disposition: keep / remove / replace / future phase |
| [CATEGORY_REQUIREMENTS.md](./CATEGORY_REQUIREMENTS.md) | Category browsing behavior spec — routes, hierarchy, search engine optimization, states, pagination (Milestones 27a and 27b) |
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | **The authoritative implementation sequence** — Milestones 1 to 59 plus Milestones 2a, 27a and 27b |
| [TASKS.md](./TASKS.md) | Status roll-up and gates (status only — order lives in the migration plan) |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Long-form status narrative moved out of `CLAUDE.md` (a log, not instructions) |
| [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md) | Readiness audits gating the start of implementation |
| [AI_TEAM_READINESS_REPORT.md](./AI_TEAM_READINESS_REPORT.md) | Development-time AI engineering team: architecture, roles, gates, permissions, Milestone 29 dry run |
| [CHANGELOG.md](./CHANGELOG.md) | Notable changes over time |
| [GLOSSARY.md](./GLOSSARY.md) | Plain-language meaning of project terms, identifier styles, review labels and technical abbreviations |
| [redesign/PHASE5_FINAL_REPORT.md](./redesign/PHASE5_FINAL_REPORT.md) | The premium storefront redesign (Milestones 115 to 121): what changed, how it was checked, what is still open. Earlier phase notes and screenshots sit beside it in `redesign/` |

**Referencing convention**: cite work by milestone name and number (Milestone 12), never by phase or group number.
Group names are labels for reporting only and carry no execution order. Documentation is written to the
standards in [`.claude/rules/documentation-style.md`](../.claude/rules/documentation-style.md): plain English,
no unexplained abbreviations, and no private conversation or session references.

Keep these updated as the project moves — stale docs are worse than no docs.

The **development-time AI engineering team** that executes this plan lives in
[`.claude/`](../.claude/), not here. It is build-time tooling only and is never a
runtime dependency of the shipped application.
