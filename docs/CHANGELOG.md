# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial documentation scaffolding for the GoCart Pakistan transformation: `docs/`, `prompts/` directories; root `README.md` (rewritten) and `CLAUDE.md`; `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.
- `docs/REPOSITORY_ANALYSIS.md`, `docs/FEATURE_MATRIX.md`, `docs/MIGRATION_PLAN.md` — codebase audit, per-feature disposition, and the `M1`–`M59` milestone plan.
- `docs/PHASE_1_READINESS_REPORT.md` — readiness audit gating the start of implementation.
- **ADR-009**: Payload CMS runs embedded inside the Next.js application (Accepted 2026-08-14).
- **`M2a`**: new milestone establishing the TypeScript toolchain before any milestone authors a `.ts` file.

### Changed

- **ADR-003** promoted from `Proposed` to **Accepted** (2026-08-14), with its supporting evidence recorded.
- **Milestone IDs (`M1`–`M59`, `M2a`) are now the single authoritative execution sequence.** Phase/group names demoted to reporting labels across `CLAUDE.md`, `docs/TASKS.md`, `docs/MIGRATION_PLAN.md`, `docs/DECISIONS.md`, `docs/REPOSITORY_ANALYSIS.md`, and `docs/README.md`.
- **`M16`, `M17`, `M19` resequenced ahead of `M3`** to clear `app/admin/**` before Payload takes ownership of `/admin`, resolving a circular dependency and a Next.js parallel-route build failure.
- `M2` extended to install `sharp` alongside Payload and the Postgres adapter.
- Stale "multi-vendor vs. single-store is unresolved" framing removed from `docs/ARCHITECTURE.md`, `CLAUDE.md`, and `docs/TASKS.md`; ADR-006 has been Accepted since 2026-08-07.
- `docs/TASKS.md` rewritten as a milestone-keyed status roll-up with explicit `M1` and `M6` gates; planning marked **Done**.

- No application code was changed and no packages were installed as part of any entry above — planning/documentation only.
