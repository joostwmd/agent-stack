---
name: ship
description: Linear markdown workflow — merge main, test, version, changelog, PR. No script.
---

# Ship

gstack-style linear markdown workflow. No script — follow the steps. Conditional gates: if tests fail, stop.

## Preconditions

- Tests pass locally
- On feature branch (not `main`)
- All changes committed or staged

## Workflow

### 1. Branch check

If on `main`, **abort**: "You're on main. Ship from a feature branch."

### 2. Merge main

```
git fetch origin main && git merge origin/main --no-edit
```

If conflicts: resolve or stop and show them.

### 3. Run tests

Run the project test command (`pnpm test`, `npm test`, `vitest`, etc.). If any test fails, **STOP** and show failures.

### 4. Version bump

If this is a release: bump VERSION or package.json version. Use semver: MICRO for fixes, MINOR for features, MAJOR for breaking. Ask if unclear.

### 5. Changelog

Update CHANGELOG with entries from `git log main..HEAD`. One line per meaningful change.

### 6. Commit

Commit version and changelog: `git add VERSION CHANGELOG && git commit -m "chore: release vX.Y.Z"` (or equivalent).

### 7. Push and PR

```
git push origin <branch>
```

Create PR via `gh pr create` or GitHub CLI. Output the PR URL.

---

**If tests fail at Step 3:** Stop. Fix. Rerun tests. Then continue from Step 3.
