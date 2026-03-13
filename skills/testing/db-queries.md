# DB Query and Transaction Tests

Tests for complex queries (3+ joins) and transaction rollback. Stack-context: PGlite for in-memory DB. See `skills/database/` for query patterns.

- Use `dbTest` fixture (project-context defines path) — no manual `beforeEach`/`afterEach` rollback.
- Test observable behaviour: query returns correct shape, transaction rolls back on error.
- Do not test Drizzle internals.
