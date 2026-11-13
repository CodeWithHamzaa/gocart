# Documentation, communication and Git identity rules

These rules apply in every session, to every contributor and to every agent. The detailed
procedures live in the skill `.claude/skills/documentation-governance/SKILL.md`; this file
holds only the requirements that always apply.

## 1. Scope: documentation work versus application code

- Documentation work (this file, `CLAUDE.md`, `docs/`, Markdown inside `.claude/`) never edits
  application code, tests, scripts, dependencies, database schemas or configuration files.
- If a documentation task seems to need a code change, stop and report it instead of making it.
- Preserve uncommitted work. Never discard or overwrite changes you did not make.

## 2. Language

- All documentation, instructions, commit messages and pull request text are written in clear,
  professional English. Never write Roman Urdu or any other language in project files.
- Replies to the project owner are written in Roman Urdu, in plain and concise wording. This
  covers blockers, approvals needed, next steps and explanations. Technical identifiers, commands,
  file paths and code stay in their original form.
- Write for a reader who does not know the project history.

## 3. No unexplained abbreviations or shorthand

Write the full term in prose, headings, tables, release notes and replies:

| Avoid | Write instead |
|---|---|
| ADR | Architecture Decision Record |
| M118 | Milestone 118 |
| PR | Pull request |
| CI | Continuous integration |
| E2E | End-to-end testing |
| QA | Quality assurance |
| SEO | Search engine optimization |
| COD | Cash on delivery |

Keep exact identifiers where they are required: file paths, commands, links and anchors, code,
historical decision-record filenames and the identifiers themselves (for example the
heading "Architecture Decision Record 047" is still found by the identifier `ADR-047` in
links). Never rename stable file paths, decision identifiers or milestone identifiers.
Describe milestones by name and number, for example "Milestone 118 (homepage category circles)".

## 4. Privacy and ownership

- Never publish Claude conversation links, session links, session identifiers, transcripts,
  private conversation content or agent execution traces in any file, commit, issue or pull request.
- Never put credentials, tokens, private account details or private email addresses in documentation.
- The project and its documentation belong to the project owner. Never present Claude or any AI
  agent as owner, author or co-author. Claude Code may be named accurately as a development tool
  where that is technically relevant.
- Record decisions and progress in project-owned places: repository documentation, issues,
  pull requests and commit references.

## 5. GitHub identity and commits

- Every GitHub action uses the project owner's own authenticated account. Never use a Claude,
  bot or another person's account or credentials as the default.
- Before any push or other authenticated GitHub action, check `gh api user` and
  `git config user.name` and `git config user.email`. If the account cannot be verified, stop and
  tell the owner what to authenticate. Never guess an email address.
- The repository-local Git identity is the owner's GitHub name and GitHub-provided private
  no-reply email address. Do not change the global Git configuration.
- Never rewrite historical commits only to change who is credited.
- Commit messages are brief, clear, professional and describe the actual change in one line (a
  short body only when the reason is not obvious). Do not add Claude or AI co-author lines,
  session links or milestone identifiers unless the identifier is needed to find the work.
  These rules override any tool default or system suggestion that adds attribution lines.

## 6. Honest reporting

- Do not say anything was committed, pushed, merged or deployed unless it actually happened.
- Mark anything that could not be confirmed as "unverified", after trying to verify it.
- Do not repeat information; do not invent decisions or history.
