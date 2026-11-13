# Glossary

This glossary explains the project terms, identifier styles and technical abbreviations that appear in the
Mirza documentation. It is written for a developer or project owner who has not followed the project's
history. New documentation writes terms in full; this page covers the identifiers and technology names
that stay in their short form because they are exact names.

## Project terms

| Term | Meaning |
|---|---|
| Architecture Decision Record | A short entry in [DECISIONS.md](./DECISIONS.md) that records one non-obvious technical choice: the context, the decision, the alternatives and the consequences. Entries are never rewritten once accepted; a changed decision is recorded as a new entry that supersedes the old one. Older documents, links and code comments refer to an entry by its identifier, for example `ADR-047`, which is Architecture Decision Record 047. |
| Milestone | One unit of planned work in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md), with a goal, files, dependencies, testing steps and a rollback. Older documents and code comments refer to a milestone by its identifier, for example `M118`, which is Milestone 118. |
| Gate | A checkpoint that every milestone passes before it merges. Gates `G0` to `G8` (dependencies, scope, architecture, design, implementation, verification, security and performance, release, human approval) are defined in [.claude/docs/WORKFLOW.md](../.claude/docs/WORKFLOW.md) and [.claude/docs/GATES.md](../.claude/docs/GATES.md). |
| Standing owner delegation | A recorded instruction in which the project owner allows the development team to take a defined kind of action without asking each time. The list and its limits are in [.claude/docs/GATES.md](../.claude/docs/GATES.md). |
| Test environment | The only live deployment: a free Vercel, Neon and Blob setup used for testing, never for customers. See [DEPLOYMENT_VERCEL_TEST.md](./DEPLOYMENT_VERCEL_TEST.md). |
| Production | The planned customer-facing deployment on a virtual private server behind Cloudflare. It is not provisioned yet. See [DEPLOYMENT.md](./DEPLOYMENT.md). |

## Review labels

Some documents label individual findings with a letter and a number. The letter groups the kind of item; the
number is only its position in that list.

| Label | Where it is defined | Meaning |
|---|---|---|
| `C1`, `C2`, ... | [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), "Contradictions" | A contradiction between two documents or plans. |
| `D1`, `D2`, ... | [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), "Missing decisions" | A decision that was missing and had to be made. |
| `R1`, `R2`, ... | [PHASE_1_READINESS_REPORT.md](./PHASE_1_READINESS_REPORT.md), "Remaining risks" | A risk to the plan. |
| `B1`, `H1`, `M1`, `L1`, ... | Architecture Decision Record 036 and the Milestone 52b entry | Findings of the security assessment carried out for Milestone 52b (`B1` to `B2`, `H1` to `H4`, `M1` to `M6`, `L1` to `L3`). The documents do not spell out what each letter stands for, so treat the letter meaning as unverified. These `M` labels are not milestone numbers. |

## Technical abbreviations

These are proper names of technologies or standard industry terms.

| Abbreviation | Meaning |
|---|---|
| API | Application programming interface: the way one program asks another for data or actions. |
| CGNAT | Carrier-grade network address translation: many mobile customers share one public internet address, so a limit per address can wrongly affect other people. |
| CLI | Command-line interface. |
| CMS | Content management system. "Payload CMS" is the product used for the admin area and data storage. |
| CSS | Cascading Style Sheets: the language that styles web pages. |
| ESM | ECMAScript modules: the standard JavaScript module format. |
| HTML | HyperText Markup Language: the language web pages are written in. |
| HTTP | HyperText Transfer Protocol: how browsers and servers exchange pages. |
| ID | Identifier. |
| IP | Internet Protocol address: the network address of a visitor or server. |
| JSON | JavaScript Object Notation: a text format for structured data. |
| JSON-LD | JSON for Linked Data: structured data in a page that search engines read, for example product details. |
| KB, MB | Kilobytes and megabytes. |
| MRP | Maximum retail price: the list price shown crossed out next to the sale price. |
| PKR | Pakistani rupee. |
| R2 | Cloudflare R2: object storage for files such as product images. |
| RCE | Remote code execution: a security flaw that lets an attacker run commands on a server. |
| REST | Representational state transfer: a common style of web interface that uses ordinary web addresses. |
| SMS | Short message service: text messages. |
| SQL | Structured Query Language: the language used to query the database. |
| SSR | Server-side rendering: building the page on the server before sending it to the browser. |
| URL | Uniform resource locator: a web address. |
| WAF | Web application firewall: a filter that blocks malicious web requests. |
| WCAG | Web Content Accessibility Guidelines: the standard for accessible web pages. |
