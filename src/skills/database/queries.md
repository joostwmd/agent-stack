# Queries — Patterns, Relational, Views

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

Define relations in `relations.ts` first.

---

## Prepared Statements (Preloading)

For hot read queries outside transactions — skip PG query parser on each call. See [performance.md](performance.md) for when to use.

```typescript
export const getUserByEmail = db
  .select().from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('get_user_by_email')
// Usage: getUserByEmail.execute({ email: 'foo@bar.com' })
```

⚠️ PgBouncer in transaction mode: prepared statements won't work — use `prepare: false`.
⚠️ Use for read-only; inside transactions use `tx.select(...)` directly.

---

## Views

**Query builder** (columns inferred). For performance: materialized views — see [performance.md](performance.md).

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
