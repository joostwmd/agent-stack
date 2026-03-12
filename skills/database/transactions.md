# Transactions — tx Proxy & withTransaction

Singleton pattern: services use `tx` without prop-drilling. `tx` reads from AsyncLocalStorage or falls back to `db`.

---

## Implementation

```typescript
// src/lib/db/transaction.ts
import { AsyncLocalStorage } from 'async_hooks'
import { db } from './index'
import { dbSafe } from './safety-net'

type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
const transactionStorage = new AsyncLocalStorage<DrizzleTransaction>()

export const tx = new Proxy({} as DrizzleTransaction, {
  get(_target, prop, receiver) {
    const currentTx = transactionStorage.getStore()
    const instance = currentTx ?? (db as unknown as DrizzleTransaction)
    const value = Reflect.get(instance, prop, receiver)
    if (typeof value === 'function') return value.bind(instance)
    return value
  },
})

export async function withTransaction<T>(
  callback: () => Promise<T>,
  config?: {
    isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable'
    accessMode?: 'read only' | 'read write'
  }
): Promise<T> {
  const existingTx = transactionStorage.getStore()
  if (existingTx) return callback()
  return dbSafe(() =>
    db.transaction(async (transaction) => {
      return transactionStorage.run(transaction, callback)
    }, config)
  )
}
```

---

## dbSafe Rule

| Scenario | dbSafe? |
|---------|---------|
| Inside `withTransaction` | Automatic |
| Standalone `tx.select` / `tx.insert` / etc. | **Wrap with `dbSafe(() => ...)`** |
| Inside `withRetry` | Automatic |

**Rule:** `withTransaction` = safe. Standalone `tx` = wrap in `dbSafe` yourself.

---

## Service Usage

```typescript
// Standalone — wrap in dbSafe
export async function createUser(data: typeof users.$inferInsert) {
  const [user] = await dbSafe(() =>
    tx.insert(users).values(data).returning()
  )
  return user
}

// Transactional — no dbSafe needed
export async function createUserWithPost(userData: any, postTitle: string) {
  return withTransaction(async () => {
    const [user] = await tx.insert(users).values(userData).returning()
    const [post] = await tx.insert(posts).values({
      title: postTitle,
      authorId: user!.id,
    }).returning()
    return { user: user!, post }
  })
}
```

---

## Caveats

- **Side effects:** Do NOT send emails, call APIs inside `withTransaction` — they can't be rolled back.
- **Long transactions:** Fetch external data before opening the transaction.
- **Nested:** Inner `withTransaction` reuses parent tx. For partial rollback, use savepoints — see error-handling.md.
- **Edge runtimes:** AsyncLocalStorage may not be available.
