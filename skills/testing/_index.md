---
name: testing
description: Vitest unit and integration tests — component, API, DB. Read this first for routing. Load only the specific file needed.
---

# Testing — Root Index

Bird's-eye view for test-writer-agent. **Read this file first.** Then load only the specific file relevant to the test type — do not load all files.

---

## Summary

- **TDD order:** test-writer-agent produces failing tests before implementation. Execution agents then implement to pass.
- **Stack:** Vitest, PGlite (in-memory DB), Better Auth testUtils, React Testing Library. E2E handled by e2e-test-writer-agent.
- **Location:** Tests live under `tests/` (paths from project-context or ticket). Never co-locate with source.
- **Integration first:** Prefer integration tests over unit tests for API/auth boundaries.

---

## Routing Table — Load Only What You Need

| Task | Load file |
|------|-----------|
| React component tests, RTL, render patterns | component.md |
| MSW + msw-trpc handler setup | msw.md |
| Form tests (RHF + Zod + Shadcn) | forms.md |
| Custom hook tests | hooks.md |
| tRPC procedure tests, auth-gated routes | trpc.md |
| DB query tests (PGlite, fixtures) | db-queries.md |
| DB infrastructure (dbSafe, withRetry, tx) | db-infra.md |
| Shadcn / Radix gotchas | shadcn.md |

---

## Shared Rules (Apply Everywhere)

1. **Stack-context** and **project-context** define Vitest config, paths, fixtures, and auth testUtils.
2. **Never mock** TanStack Query at module level — use MSW handlers.
3. **Query priority:** getByRole → getByLabelText → getByText. Avoid getByTestId.
4. **Async:** use findBy* or waitFor — never bare getBy after interaction.
5. **Do not test** library internals (Shadcn, RTL, Drizzle). Test behaviour.

---

## Out of Scope

- E2E / Playwright tests → e2e-test-writer-agent
- Implementation code → flag missing implementations, do not write them
