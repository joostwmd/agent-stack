---
name: execute
description: Execute workflow — TDD loop per task: test-writer, red verify, impl, green verify, mutation, review, commit+advance.
---

# Execute

Execute workflow: load task → test-writer (TDD red) → verify RED → impl → verify GREEN → mutation → review → commit + advance.

## Preconditions

- `03-plan.md` exists at `.cursor/tickets/<feature>/`
- `tickets/` directory exists with per-task tickets
- On a feature branch (not `main`)

## First action

Run:

```
npx tsx src/scripts/workflows/execute.ts --step 1 --feature <feature-slug>
```

From project root. Replace `<feature-slug>` with the feature name.

The script outputs the step content. Follow the NEXT STEP directive. Step 1 without `--task` starts the first task. Steps 4–5 support `--retry` when GREEN verification fails (max 3 retries).
