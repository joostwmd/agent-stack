---
name: commit
description: Stages and commits the current change as an atomic conventional commit
---

# Commit

Conventional commit workflow. Use when staging and committing changes.

## Preconditions

- Unstaged or unstaged changes to commit

## Workflow

1. **Review diff** — `git status` and `git diff` to see what will be committed.

2. **Choose type** — Conventional commits: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`. Scope optional.

3. **Stage** — `git add <files>` for the atomic change set. Prefer one logical change per commit.

4. **Commit** — `git commit -m "type(scope): short description"`. Examples:
   - `feat(upload): add file size validation`
   - `fix(auth): handle expired session redirect`
   - `test(upload): add unit and integration tests`

5. **Verify** — `git log -1` to confirm the commit message.

## First action

Ask: "What changes are you committing?" Then suggest a conventional commit message and stage/commit.
