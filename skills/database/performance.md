# Performance — Indexes, Preloading, Views

db-agent owns performance. Use indexes, prepared statements for hot queries, and views/materialized views to optimize.

---

## Indexes

Define indexes on columns used in `WHERE`, `JOIN`, `ORDER BY`. Add via the third arg to `pgTable`:

```typescript
import { pgTable, text, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:     text('title').notNull(),
  authorId:  text('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('posts_author_id_idx').on(table.authorId),
  index('posts_created_at_idx').on(table.createdAt),
])
```

**When to add:**
- `WHERE`, `JOIN` columns — e.g. `authorId`, `userId`
- `ORDER BY` columns — e.g. `createdAt`
- Unique lookups — `uniqueIndex` on email, slug

**Composite index** — for `WHERE a AND b`:
```typescript
index('user_status_idx').on(table.userId, table.status)
```

**Expression index** (e.g. case-insensitive email):
```typescript
uniqueIndex('email_lower_idx').on(sql`lower(${table.email})`)
```

---

## Preloading — Prepared Statements for Hot Queries

For frequently-executed read queries, prepare them at module load. Skip the PG query parser on each call:

```typescript
// src/lib/db/queries.ts
export const getUserByEmail = db
  .select().from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('get_user_by_email')

export const getPostsByAuthor = db
  .select().from(posts)
  .where(eq(posts.authorId, sql.placeholder('authorId')))
  .prepare('get_posts_by_author')
```

Usage: `getUserByEmail.execute({ email: 'foo@bar.com' })`.

**When:** Hot read paths — auth lookup by email, user by ID, lists by foreign key.

⚠️ PgBouncer in transaction mode: prepared statements won't work — use `prepare: false`. Use for read-only; inside transactions use `tx.select(...)`.

---

## Views & Materialized Views

**Regular views** — simplify complex queries, no storage cost:
```typescript
export const customersView = pgView("customers_view").as((qb) =>
  qb.select().from(users).where(eq(users.role, "customer"))
)
```

**Materialized views** — persist results for heavy aggregations. Refresh periodically:
```typescript
const dashboardStats = pgMaterializedView('dashboard_stats').as((qb) =>
  qb.select({ ... }).from(orders).groupBy(...)
)
// Refresh: db.refreshMaterializedView(dashboardStats)
// Or: db.refreshMaterializedView(dashboardStats).concurrently()
```

**When:** Heavy aggregations, dashboard queries, join-heavy reads that don't need real-time data.
