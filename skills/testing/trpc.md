# tRPC Procedure Tests

tRPC procedure and service tests. Stack-context: Better Auth testUtils for auth-gated procedures. See `skills/api/trpc-routers.md` for procedure patterns.

- Use `createTestCaller(db)` — never mock tRPC internals.
- Auth-gated procedures: use Better Auth `testUtils` to create session and pass headers.
- Integration tests are primary; cover full request path.
