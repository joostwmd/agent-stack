# DB Infrastructure Tests (dbSafe, withRetry, tx)

Tests for dbSafe, withRetry, and transaction proxy behaviour. See `skills/database/error-handling.md` and `transactions.md`.

- Test error mapping (PG codes → domain errors), retry behaviour.
- Use project-context DB test fixture.
- Minimal coverage — infra is stable; focus on integration tests.
