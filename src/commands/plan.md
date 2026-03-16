---
name: plan
description: Plan workflow — preflight + orchestrator + tickets. Requires 00-requirements.md and 02-test-spec.md.
---

# Plan

Plan workflow: preflight → orchestrator (writes 03-plan.md with Invisible Knowledge) → self-check → human checkpoint → ticket-writer → self-check → human checkpoint → TODOS → done.

## Preconditions

- `00-requirements.md` exists at `.cursor/tickets/<feature>/`
- `02-test-spec.md` exists at `.cursor/tickets/<feature>/`
- On a feature branch (not `main`)

## First action

Run:

```
npx tsx src/scripts/workflows/plan.ts --step 1 --feature <feature-slug>
```

From project root. Replace `<feature-slug>` with the feature name (e.g. `avatar-upload`).

The script outputs the step content. Follow the NEXT STEP directive to continue. Human checkpoints at Steps 4 and 7 require user approval before proceeding.
