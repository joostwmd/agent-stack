# Testing Skills — Index

## Stack

| Layer | Tools |
|-------|-------|
| Component / integration | Vitest + React Testing Library + msw-trpc |
| tRPC procedures | Vitest + `createCallerFactory` + Better Auth testUtils |
| DB queries / transactions | Vitest + PGlite + `dbTest` fixture |
| DB infrastructure | Vitest unit (no DB needed for dbSafe / withRetry) |
| Mutation quality audit | StrykerJS + vitest-runner (qa-agent scope) |

## Monorepo Layout

```
packages/
├── client/   — React + Vite + TanStack Router + TanStack Query
└── server/   — Hono + tRPC + Drizzle + Better Auth

tests/
├── _fixtures/        — shared Vitest fixtures (dbTest, authDbTest)
├── _utils/           — renderWithProviders, createTestCaller
├── _mocks/
│   └── handlers/     — msw-trpc handlers per domain
├── _db/              — PGlite setup, migrate helper
├── web/              — client package tests, by feature
│   └── <feature>/
└── api/              — server package tests, by feature
    ├── <feature>/
    └── db/
        ├── queries/
        └── infra/
```

## Shared Rules (apply to all skill files)

1. Import from `tests/_utils/` and `tests/_fixtures/` using path aliases — never relative `../../`
2. Never `vi.mock` TanStack Query, tRPC internals, or Drizzle
3. Never use `getByTestId` — query by role, label, or text only
4. Every async assertion uses `findBy*` or `waitFor`
5. One PGlite instance per test file (`beforeAll`), never per test
6. `server.resetHandlers()` runs in `afterEach` — already wired in global setup
7. Tests assert on what the user sees or what the system returns — never on internal state

## Routing Table

| Task | Load |
|------|------|
| React component / integration tests | `component.md` |
| tRPC client setup (prod + test, MSW, RouterAppContext) | `trpc-client.md` |
| MSW + msw-trpc handler patterns | `msw.md` |
| Form tests (RHF + Zod + Shadcn) | `forms.md` |
| Custom hook tests | `hooks.md` |
| tRPC procedure tests (server-side caller) | `trpc.md` |
| DB query tests (complex joins, transactions) | `db-queries.md` |
| DB infra tests (dbSafe, withRetry) | `db-infra.md` |
| Shadcn / Radix gotchas | `shadcn.md` |

Load one file. Do the work. Move on.
