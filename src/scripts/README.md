# Scripts

> **MANDATORY:** Read this file before adding or modifying any script.

## File Structure

```
src/scripts/
├── lib/           — Shared utilities (types, format-step, dispatch)
├── checks/        — Preflight and other checks
├── workflows/     — plan.ts, execute.ts (step orchestration)
├── event-logger.js — Hook event logger (SessionStart/End, etc.)
└── README.md      — This file
```

## Rules

### File Structure

- **lib/** — Pure functions, no side effects. Import from workflows and checks.
- **checks/** — Deterministic checks (branch, artifacts). Return structured PASS/FAIL.
- **workflows/** — Step-based orchestration. Use `formatStep()` for output; human checkpoints via AskUserQuestion.

### Prompt Template Conventions

- Use `formatStep(body, nextCmd, options)` for every workflow step output.
- Working directory in NEXT STEP must be `src/scripts` (or equivalent abs path).
- Commands: `npx tsx workflows/<name>.ts --step N --feature <f> [--task TNN]`

### Anti-Patterns

- **Do not** hardcode paths — use `path.resolve` from script location.
- **Do not** run subagents from scripts — scripts output prompts; the LLM dispatches via Task tool.
- **Do not** bypass preflight — Step 1 of every workflow runs preflight.
- **Do not** add workflow logic to commands — commands are markdown that invoke scripts.

## Running Scripts

```bash
# From project root (or src/scripts)
npx tsx src/scripts/workflows/plan.ts --step 1 --feature avatar-upload
npx tsx src/scripts/workflows/execute.ts --step 1 --feature avatar-upload --task T03
```

Ensure `tsx` is available (`npx tsx` or `pnpm add -D tsx`).
