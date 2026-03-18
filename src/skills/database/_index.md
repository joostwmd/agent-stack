---
name: database
description: Drizzle + Better Auth stack — DB layer. Read this first for overview and routing. Load only the specific file needed for the task.
---

# Database Layer — Root Index

Bird's-eye view of the DB layer for the Better Auth stack. **Read this file first.** Then load only the specific file relevant to your task — do not load all files.

---

## Summary

- **One db instance**, shared with Better Auth via `drizzleAdapter(db)`.
- **tx singleton** — AsyncLocalStorage + Proxy. Services use `tx`; inside `withTransaction` it uses the active tx, otherwise falls back to `db`.
- **dbSafe rule:** Standalone `tx` calls → wrap in `dbSafe()`. Inside `withTransaction` → automatic.
- **tRPC procedures** never import db/tx. They call service functions. Services import `tx` and `withTransaction`.
- **Model-factory** — Use `defineStaticEntity` / `defineVersionedEntity` for new app tables. Runtime classes (`StaticTable`, `VersionedTable`) receive Transact + Session via DI.
- **Performance** — db-agent owns indexes, prepared statements (preloading hot queries), and views/materialized views.

---

## Routing Table — Load Only What You Need

| Task | Load file |
|------|-----------|
| Pool setup, graceful shutdown, Better Auth db wiring | [connection.md](connection.md) |
| Auth schema generation, app schema, relations, drizzle-zod | [schema.md](schema.md) |
| **Factory-based entities, scoping, versioning** | [model-factory.md](model-factory.md) |
| **Testing factory entities, dependency injection** | [model-factory-testing.md](model-factory-testing.md) |
| tx proxy, withTransaction, AsyncLocalStorage, dbSafe rule | [transactions.md](transactions.md) |
| dbSafe impl, PG error codes, error classes, tRPC mapper, retry | [error-handling.md](error-handling.md) |
| Prepared statements, relational queries, views | [queries.md](queries.md) |
| **Indexes, preloading hot queries, views for performance** | [performance.md](performance.md) |
| drizzle-kit, migrations, Better Auth CLI sync | [migrations.md](migrations.md) |

---

## Shared Rules (Apply Everywhere)

1. **No db/tx in tRPC context** — services import them directly.
2. **dbSafe:** Inside `withTransaction` = safe. Standalone `tx` = wrap in `dbSafe(() => ...)`.
3. **One pool** — same `db` passed to both Drizzle and `drizzleAdapter(db)`.
4. **Auth schema first** — `npx @better-auth/cli generate` → then app schema references `users`.
5. **Model-factory for new entities** — Prefer `defineStaticEntity` / `defineVersionedEntity` over manual table definitions. Runtime classes need Transact + Session via DI.

---

## File Structure (db-agent owns)

```
src/lib/db/
├── index.ts          # db, pool
├── schema.ts         # barrel (auth + app)
├── auth-schema.ts    # Better Auth generated
├── app-schema.ts     # App tables (use model-factory for new entities)
├── relations.ts
├── zod.ts
├── transaction.ts    # tx proxy, withTransaction, Transact type
├── safety-net.ts
├── errors.ts
├── queries.ts
└── retry.ts

model-factory/
├── schema/           # defineStaticEntity, defineVersionedEntity
├── runtime/          # BaseTable, StaticTable, VersionedTable
└── types.ts          # Session, SYSTEM_KEYS
```
