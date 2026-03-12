---
name: drizzle
description: Drizzle + Better Auth stack — schema (auth + app), tx/withTransaction, dbSafe, error handling, migrations. Use when implementing the DB layer with Better Auth.
---

# Database Layer Skill (Drizzle + Better Auth)

Single skill for the DB layer in a Better Auth stack. Covers schema, transactions, error handling, and Drizzle API. db-agent owns the architecture; this skill provides implementation details.

---

## Better Auth Integration

**One db instance, shared with Better Auth.** The Drizzle adapter uses the same pool — no extra connections.

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import * as relations from './relations'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30_000,
})
pool.on('error', (err) => console.error('Unexpected pool error', err))

export const db = drizzle(pool, { schema: { ...schema, ...relations }, logger: process.env.NODE_ENV === 'development' })
export { pool }
```

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  // ...
})
```

Graceful shutdown: `pool.end()` on SIGTERM/SIGINT.

---

## Schema — Better Auth + App Tables

**Auth schema** (generated):

```bash
npx @better-auth/cli generate --output src/lib/db/auth-schema.ts
```

**App schema** — extend auth tables, reference `users`:

```typescript
// src/lib/db/app-schema.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './auth-schema'

export const posts = pgTable('posts', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:     text('title').notNull(),
  authorId:  text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

Barrel: `schema.ts` exports auth + app. `relations.ts` defines relations for `tx.query.*`.

---

## tx + dbSafe — When to Wrap

| Scenario | dbSafe? |
|---------|---------|
| Inside `withTransaction` | Automatic |
| Standalone `tx.select` / `tx.insert` / etc. | **Wrap with `dbSafe(() => ...)`** |
| Inside `withRetry` | Automatic |

**Rule:** `withTransaction` = safe. Standalone `tx` = wrap in `dbSafe` yourself.

---

## Error Handling — Safety Net

### PG codes → domain errors

| Code | Class |
|------|-------|
| 23505 | UniqueViolationError |
| 23503 | ForeignKeyViolationError |
| 23502 | NotNullViolationError |
| 23514 | CheckViolationError |
| 40001 | SerializationError |
| 40P01 | DeadlockError |
| 57014 | QueryTimeoutError |
| 08xxx | ConnectionError |

### parseConstraintDetail (for dbSafe)

```typescript
function parseConstraintDetail(detail?: string): { column?: string; value?: string } {
  if (!detail) return {}
  const match = detail.match(/Key \((.+?)\)=\((.+?)\)/)
  return { column: match?.[1], value: match?.[2] }
}
```

### Error classes (errors.ts)

Define `DatabaseError`, `UniqueViolationError`, `ForeignKeyViolationError`, `NotNullViolationError`, `CheckViolationError`, `SerializationError`, `DeadlockError`, `QueryTimeoutError`, `ConnectionError` — each extends `DatabaseError` with `code` and `cause`.

### tRPC error mapper

`errorMapperMiddleware` maps: UniqueViolation → CONFLICT, ForeignKey/NotNull/Check → BAD_REQUEST, Serialization/Deadlock → CONFLICT, QueryTimeout → TIMEOUT, Connection/Database → INTERNAL_SERVER_ERROR.

---

## Query Patterns

- **Insert:** `tx.insert(table).values(data).returning()` — wrap in dbSafe if standalone
- **Update:** `tx.update(table).set({...}).where(eq(...)).returning()`
- **Select:** `tx.select().from(table).where(...)` or `tx.query.table.findMany(...)`
- **Delete:** `tx.delete(table).where(eq(...)).returning()`
- **Row lock:** `tx.select().from(table).where(...).for('update')` for serializable tx

---

## Relational Queries

```typescript
tx.query.users.findFirst({
  where: eq(users.id, id),
  with: { posts: true, comments: true },
})
```

Define relations in `relations.ts` with `relations(table, ({ one, many }) => ({ ... }))`.

---

## Views

**Query builder** (columns inferred):

```typescript
export const customersView = pgView("customers_view").as((qb) =>
  qb.select().from(users).where(eq(users.role, "customer"))
)
```

**Raw SQL** — explicit column schema:

```typescript
const v = pgView('name', { id: serial('id').primaryKey(), name: text('name').notNull() })
  .as(sql`select * from ${users} where ...`)
```

**Existing views:** `.existing()` — no CREATE in migrations.

**Materialized:** `pgMaterializedView('name').as(...)`, refresh: `db.refreshMaterializedView(v)`.

---

## Migrations

```bash
npx drizzle-kit generate   # From schema
npx drizzle-kit migrate    # Apply
npx drizzle-kit push       # Dev only
npx drizzle-kit studio     # Browser
```

When Better Auth schema changes: `npx @better-auth/cli generate` then `drizzle-kit generate`.

---

## drizzle-zod

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
export const insertUserSchema = createInsertSchema(users, { email: z.string().email() })
export const selectUserSchema = createSelectSchema(users)
```

Use for tRPC `.input()` and `.output()`.

---

## Savepoint (partial rollback)

When nested `withTransaction` must fail independently, use `useSavepoint: true` — inner uses `existingTx.transaction(async (savepointTx) => ...)`.

---

## Request Flow

```
HONO (session) → createContext → tRPC → procedure calls services
Services: dbSafe(() => tx.insert(...)) | withTransaction(() => { ... })
tx proxy → AsyncLocalStorage or db fallback → Drizzle → Pool → Postgres
```
