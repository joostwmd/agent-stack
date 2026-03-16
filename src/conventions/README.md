# Conventions

> **MANDATORY:** Read this file before adding or modifying any convention.

## How to Add or Edit Conventions

1. **Read** `_index.md` to see which agents load which conventions.
2. **Edit** the appropriate convention file (`documentation.md`, `structural.md`, `severity.md`, or `code-quality/*.md`).
3. **Update** `_index.md` to assign the new or changed convention to the correct agents.
4. If adding a new convention file: add a row to the relevant agents in `_index.md`.

## File Roles

| File | Purpose |
|------|---------|
| `_index.md` | Agent-to-convention mapping — single source of truth |
| `documentation.md` | CLAUDE.md/README.md patterns, IK rules, plan-level IK |
| `structural.md` | File naming, directory layout, generated code, comment timelessness |
| `severity.md` | BLOCKING / SHOULD / CONSIDER levels |
| `code-quality/naming.md` | Implicit contract integrity |
| `code-quality/structure.md` | Duplication, over/under-abstraction |
| `code-quality/docs-and-tests.md` | Missing docs, stale comments, test gaps |

## Rules

- Agents load conventions via `_index.md` — do not hardcode convention paths in agents.
- Each agent loads only what it needs.
- When adding a severity level or new category, ensure `severity.md` is consistent.
