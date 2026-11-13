---
name: documentation-governance
description: Documentation governance for the Mirza repository. Use whenever the task is to write, update, rewrite, audit or clean up project documentation (README files, docs/, architecture notes, decision records, milestone plans, deployment guides, change histories, release notes, Claude instructions in .claude/), to prepare a Git commit message or pull request description, to check or set the GitHub identity before a push, or to report project progress to the owner. Also use it when someone asks to remove shorthand, abbreviations, session links or Claude attribution from documentation, even if they do not mention "governance". Enforces plain English, full terminology, privacy, owner attribution and documentation-only scope.
---

# Documentation governance

This skill holds the detailed procedures. The always-applicable requirements are in
`CLAUDE.md` and `.claude/rules/documentation-style.md`; read the rules file first if this
is the first documentation task of the session.

The goal is documentation that a developer or the project owner can understand without
knowing the project's internal history, that belongs to the owner, and that never exposes
private conversations.

## 1. Know the boundary before you start

Documentation work may change only: Markdown files (`docs/`, root guides, `CLAUDE.md`,
Markdown inside `.claude/`) and the repository-local Git identity. It must not change source
code, tests, scripts, dependencies, schemas or configuration files (`*.ts`, `*.tsx`, `*.js`,
`*.jsx`, `*.css`, `*.json`, `*.yml`, `Dockerfile`, `.env*`, `.claude/settings.json`).

Why: documentation changes are reviewed quickly and merged with little risk. Mixing them with
code changes removes that safety. If a document is wrong because the code is wrong, report the
code problem separately and do not fix it here.

Before editing, run `git status --short` and note files that already have uncommitted changes
that are not yours. Do not overwrite them. After editing, run
`git diff --stat` and confirm every changed path is documentation.

## 2. Writing standards

- Plain, professional English. Short sentences. Active voice. One idea per paragraph.
- Write for a reader who is new to the project. Say what something is the first time it appears,
  and link to the document that explains it.
- Descriptive headings that say what the section contains ("How an order is created"), not
  labels that only insiders understand ("Gate G7", "Phase 2 notes").
- Explain a technical decision in everyday words: what the choice was, why it was made, and what
  it means for the reader. Put the jargon-heavy detail after the plain summary, not before.
- Say each thing once. Link instead of copying. Delete instructions that are no longer true instead
  of marking them "old".
- Use complete, meaningful names for files, sections, milestones and roles.

## 3. Terminology: no unexplained shorthand

Shorthand forces the reader to ask someone or search the history. Write the full term, even
when the abbreviation is common.

### Always expand in prose, headings and tables

| Avoid | Write instead |
|---|---|
| ADR, ADR-047 | Architecture Decision Record, Architecture Decision Record 047 |
| M118, M27a | Milestone 118, Milestone 27a |
| PR | Pull request |
| CI | Continuous integration |
| E2E, e2e | End-to-end testing (or "end-to-end tests") |
| QA | Quality assurance |
| SEO | Search engine optimization |
| COD | Cash on delivery |
| PII | Personally identifiable information |
| UX / UI | User experience / user interface |
| DB | Database |
| VPS | Virtual private server |

Grammar follows the expansion: "an ADR" becomes "an Architecture Decision Record" but "an M118"
becomes "a Milestone 118". Plurals: "ADRs" becomes "Architecture Decision Records".

### Standard technology names

Proper names of technologies (HTTP, HTML, CSS, JSON, SQL, URL, API, Next.js, PostgreSQL, Payload CMS)
may stay, because spelling them out would not help. Explain a term in one clause the first time
it appears in a document if the owner is unlikely to know it, or define it in `docs/GLOSSARY.md`.
Internal codes with no public meaning (review codes, gate numbers, finding labels such as "H4",
"G7", "D8") must be replaced by a description, or defined where they first appear. If you cannot
establish what a code means from the repository, mark it "meaning unverified" and tell the owner;
never guess.

### Exact identifiers stay exact

Keep the original text where precision or traceability matters, and wrap it in code formatting
so it is clearly an identifier and not prose:

- File paths, commands, branch names, environment variable names, code symbols.
- Link targets and anchors. When a heading is reworded, update every link anchor to it.
- Historical Architecture Decision Record filenames and identifiers (`ADR-047`), milestone identifiers
  (`M118`) and commit-message lines quoted as history.
- Names of external products, repositories and storage keys that are intentionally unchanged
  (see "Brand" in `CLAUDE.md`).

Never rename a stable file path, decision identifier or milestone identifier to make prose nicer.
In prose, combine the readable name and the identifier when the exact one matters:
"Architecture Decision Record 047 (`ADR-047`)" is acceptable once, then use the full term.

## 4. Document types

### New project documentation

1. Check `docs/README.md` and `git ls-files '*.md'` first. Extend an existing document when one
   already covers the subject; a new file is justified only for a new subject.
2. Name the file in `UPPER_SNAKE_CASE.md` with a meaningful name, matching existing files in `docs/`.
3. Open with a two to four sentence summary: what this document is, who it is for, and its status.
4. Use descriptive headings, then: purpose, current state, how it works, what to do next.
5. Add the file to the table in `docs/README.md` with a one-line purpose.
6. Add a short entry to `docs/CHANGELOG.md` only when the change matters to readers.

### Architecture and implementation explanations

Start with the plain-language picture (what the system does and why it is built this way), then
the components, then the details. Link to the decision records that explain each major choice.

### Decision records (updating an existing one)

- An Accepted decision is never edited. Do not change its Decision text, rationale or status
  meaning. Fix only typos, broken links and unexplained shorthand, and keep the meaning identical.
- To change a decision, write a new record that supersedes it and add a "Superseded by" line to the
  old one. Superseding an Accepted record needs the owner's approval; write the proposal and stop.
- New records use the next free number (find it with
  `grep -n -E '^## (ADR-|Architecture Decision Record )' docs/DECISIONS.md | tail -3`; older headings
  may still use the short form) and the existing fields: Status, Context, Decision, Alternatives
  considered, Consequences. Match the last three records in tone and depth. Routine choices belong
  in a commit message, not a decision record.
- Write the record text itself to this standard, because it will be pasted into the log: the heading
  is `## Architecture Decision Record 053: <plain-language title>`, prose says "Architecture
  Decision Record 022", and the short identifier (`ADR-022`) appears only in code formatting or link
  targets. Say once, near the top, which identifier older documents use for it.
- Do not invent facts. If the owner gave no date for a decision, write "Decision date: to be confirmed
  by the owner" instead of using today's date, and do not describe where the decision was made
  ("in the session", "in chat"). Mark the record Proposed until the owner approves it.
- Cross-reference the architecture document and any milestone that carries the decision out.

### Milestone documentation

Keep the existing fields (Status, Goal, Files, Dependencies, Testing, Rollback, Commit message)
and the milestone's identifier. Improve the heading into a meaningful name ("Milestone 118:
Homepage with editorial hero and category circles"). Rewrite the Goal so someone who has not seen
the history understands what changes for a customer or administrator. Do not change dates,
statuses, dependencies or evidence. Do not invent results.

### Deployment and operational instructions

Write numbered, copyable steps in the order they run. For each step state what it does, what
success looks like and what to do when it fails. Separate test, development and production
environments clearly. Never include real credentials: name the variable and where it is stored.

### Change histories

One entry per notable change, newest first: the date, a plain description of what changed for the
reader, and a link to the pull request or commit. No narrative of how the work was done.

## 5. Privacy and ownership

These are checked on every documentation change, existing text included.

Never publish: Claude conversation or session links, session identifiers, chat transcripts,
"in the chat" or "in the session of ..." phrasing, agent execution traces, credentials, tokens,
private email addresses or other account details.

Never present Claude or any other AI agent as owner, author or co-author of the project or of a
commit. Claude Code may be named accurately as a development tool where that is technically
relevant ("the development team configuration in `.claude/`").

Where a past decision came from a conversation, record the decision and its date as the project's
own ("Decided by the project owner on 2026-11-03"), and cite project-owned evidence: a pull request,
an issue, a commit or a repository document.

Scan before finishing (adjust paths to the files you touched):

```bash
git grep -n -i -E 'claude\.ai|session_[0-9a-z]{8,}|co-authored-by|generated with|noreply@anthropic' -- '*.md'
git grep -n -i -E 'in (the|this) (chat|session|conversation)|transcript' -- '*.md'
```

Review each hit: a hit inside a rule that forbids the practice is fine; anything else is rewritten.

## 6. Git identity and commits

Before any commit, push or authenticated GitHub action:

1. `gh auth status` and `gh api user --jq .login`: confirm the account is the owner's.
2. `git config user.name` and `git config user.email`: confirm they are the owner's
   repository-local values (the GitHub-provided private no-reply address).
3. If the account cannot be verified, stop and tell the owner what to authenticate. Never guess an
   address and never use another account.

Do not change global Git configuration and do not rewrite earlier commits to change who is credited.

### Commit message format

- One imperative line of about 50 to 72 characters that says what changed and, if needed, where:
  "Explain checkout rules in plain language".
- A body only when the reason is not obvious, wrapped at about 72 characters, a few lines at most.
- No Claude or AI names, no co-author trailers, no session links, no hash-tag shorthand.
- No milestone identifier unless it is needed to find the work; then write it in full
  ("Milestone 118").
- Do not copy a milestone's stored "Commit message" line if it breaks these rules; the stored line is
  history, not a template.

Good: `Rewrite deployment guide steps in plain English`
Avoid: `docs: M118 ADR-047 CI/QA wording pass (Claude session)`

Do not claim a commit, push, merge or deployment happened unless you ran it and saw it succeed.

## 7. Reporting progress to the owner

- Reply in Roman Urdu, in short plain sentences. Documentation and project files stay in English.
- Keep it short: about 120 words, never more than 200, unless the owner asks for detail. The owner
  wants the answer and the next step, not a tour of the repository. Offer more detail in one closing
  line instead of including it.
- Use milestone names ("Milestone 118, Homepage categories") rather than bare identifiers, and full
  terms instead of abbreviations.
- Lead with the status: finished, in progress or blocked. Then what the owner must do next, if anything.
  Name at most the three most important blockers or open items.
- Explain a blocker in everyday words: what cannot proceed, why, and what would unblock it.
- Mark anything you could not confirm as "unverified" after you have tried to confirm it.
- Never include session links or private conversation details.

## 8. Cleaning up existing documentation

1. List the targets: `git ls-files '*.md'`.
2. Find shorthand: search prose for the terms in section 3; find unexplained codes by searching for
   capital letters followed by digits and for repeated all-capital words.
3. Replace in prose only. Skip fenced code blocks, inline code, link targets and URLs.
4. When a heading changes, update every anchor link that points to it, then check that links still
   resolve.
5. Remove private references (section 5) and outdated attribution. Replace the former project name
   only in current-state text; Accepted decision records keep their original wording and the
   intentionally kept `gocart` identifiers stay.
6. Do not change dates, statuses, numbers, evidence or the meaning of a decision.
7. Review the diff: `git diff --stat`, then skim changed lines for awkward wording introduced by
   mechanical replacement ("Milestone 14/Milestone 16" should read "Milestones 14 and 16").

## 9. Final checklist

- [ ] Only documentation files changed (`git diff --name-only`).
- [ ] No unexplained shorthand in the text I wrote or touched.
- [ ] Headings are descriptive and every anchor link still resolves.
- [ ] No private references, credentials or AI attribution.
- [ ] Git identity verified; commit message is brief and has no attribution trailers.
- [ ] Statements about what was committed, pushed or deployed are true.
