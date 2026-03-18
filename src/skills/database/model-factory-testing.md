# Model Factory Testing — Dependency Injection & dbTest Integration

Factory runtime classes (`StaticTable`, `VersionedTable`) use **dependency injection** for the database executor and session. Tests inject these from the `dbTest` fixture and Better Auth testUtils.

---

## Dependency Injection Requirements

| Dependency | Purpose | Test Source |
|------------|---------|--------------|
| **Transact** | Runs callbacks with a Drizzle executor | Built from test `db` / `tx` |
| **Session** | Scoping (organisationId, userId) | Built from `createUser`, `createOrg` or Better Auth testUtils |

---

## Session Object for Tests

The factory expects `Session`:

```typescript
interface Session {
  user: { id: string; name: string; email: string };
  organisationId: string;
}
```

**Build from seed helpers:**

```typescript
// tests/api/db/repositories/category.test.ts
import { dbTest } from '@tests/_fixtures/db'
import { CategoryRepository } from '@server/repositories/category'
import type { Session } from '@repo/model-factory'

dbTest('create injects organisationId from session', async ({ db, createUser, createOrg }) => {
  const user = await createUser({ name: 'Alice', email: 'alice@example.com' })
  const org = await createOrg({ name: 'Test Org' })

  const session: Session = {
    user: { id: user.id, name: user.name, email: user.email },
    organisationId: org.id,
  }

  // ... use session with repository
})
```

**From Better Auth testUtils** (if your auth returns session with org):

```typescript
const ctx = await auth.$context
const headers = await ctx.test.getAuthHeaders({ userId: user.id })
const session = await auth.api.getSession({ headers })
// session must have user + organisationId — adapt if your session shape differs
```

---

## Transact for Test Context

The factory's `Transact` type: `(callback: (tx: DrizzleExecutor) => Promise<T>) => Promise<T>`.

In `dbTest`, each test runs **inside** a transaction that rolls back. The `db` fixture is the transaction-scoped executor. Use it to build Transact:

```typescript
// Option A: db is the Drizzle executor (DbClient wraps tx)
const transact: Transact = (cb) => cb(db as DrizzleExecutor)

// Option B: Extend dbTest to expose raw tx for factory use
// tests/_fixtures/db.ts
type Fixtures = {
  db: DbClient
  tx: DrizzleExecutor   // raw executor for factory DI
  createUser: ...
  createOrg: ...
}

export const dbTest = baseTest.extend<Fixtures>({
  db: async ({}, use) => {
    await rawDb.transaction(async (tx) => {
      const db = new DbClient(tx as any)
      await use({ db, tx })  // provide both
      throw new RollbackSignal()
    }).catch(...)
  },
  // ... derive tx from same transaction
})
```

Simplest: if `DbClient` implements the Drizzle executor interface (select, insert, update, delete, etc.), pass `(cb) => cb(db)`.

---

## Full Example: Repository Test

```typescript
// tests/api/db/repositories/category.test.ts
import { dbTest } from '@tests/_fixtures/db'
import { CategoryRepository } from '@server/repositories/category'
import type { Session } from '@repo/model-factory'
import type { Transact } from '@server/lib/db/transaction'

dbTest('CategoryRepository.create injects scope from session', async ({
  db,
  createUser,
  createOrg,
}) => {
  const user = await createUser({ name: 'Alice', email: 'alice@test.com' })
  const org = await createOrg({ name: 'Acme' })

  const session: Session = {
    user: { id: user.id, name: user.name, email: user.email },
    organisationId: org.id,
  }

  const transact: Transact = (cb) => cb(db as any) // db is tx-scoped
  const repo = new CategoryRepository(transact, session)

  const category = await repo.create({ name: 'Design', color: '#333' })

  expect(category.organisationId).toBe(org.id)
  expect(category.name).toBe('Design')
})
```

---

## Extending dbTest with Factory Helpers

Add optional fixtures for factory-based tests:

```typescript
// tests/_fixtures/db.ts
type Fixtures = {
  db: DbClient
  createUser: ...
  createOrg: ...
  createSession: () => Promise<Session>
  createTransact: () => Transact
}

export const dbTest = baseTest.extend<Fixtures>({
  // ... existing db, createUser, createOrg ...

  createSession: async ({ createUser, createOrg }, use) => {
    await use(async () => {
      const user = await createUser()
      const org = await createOrg()
      return {
        user: { id: user.id, name: user.name, email: user.email },
        organisationId: org.id,
      }
    })
  },

  createTransact: async ({ db }, use) => {
    await use(() => (cb) => cb(db as DrizzleExecutor))
  },
})
```

Usage:

```typescript
dbTest('repository respects org scope', async ({ db, createSession, createTransact }) => {
  const session = await createSession()
  const transact = createTransact()
  const repo = new CategoryRepository(transact, session)

  const cat = await repo.create({ name: 'X' })
  expect(cat.organisationId).toBe(session.organisationId)
})
```

---

## Testing Versioned Entities

VersionedTable has additional methods: `history`, `changes`, `restore`.

```typescript
dbTest('TaskRepository creates version and audit entry', async ({
  db,
  createUser,
  createOrg,
}) => {
  const session = await buildSession(createUser, createOrg)
  const transact = (cb) => cb(db as any)
  const repo = new TaskRepository(transact, session)

  const task = await repo.create({ title: 'Ship it', description: 'v1' })
  await repo.update(task.id, { description: 'v2' })

  const history = await repo.history(task.id)
  expect(history).toHaveLength(2)
  expect(history[0].description).toBe('v2')
  expect(history[1].description).toBe('v1')

  const changes = await repo.changes(task.id)
  expect(changes).toHaveLength(2) // create + update
  expect(changes[0].action).toBe('create')
  expect(changes[1].action).toBe('update')
})
```

---

## Testing Scoping Isolation

Verify org and user scoping:

```typescript
dbTest('getAll returns only current org rows', async ({ db, createUser, createOrg }) => {
  const org1 = await createOrg({ name: 'Org 1' })
  const org2 = await createOrg({ name: 'Org 2' })
  const user1 = await createUser()
  const user2 = await createUser()

  const repo1 = new CategoryRepository(
    (cb) => cb(db as any),
    { user: { id: user1.id, name: user1.name, email: user1.email }, organisationId: org1.id }
  )
  const repo2 = new CategoryRepository(
    (cb) => cb(db as any),
    { user: { id: user2.id, name: user2.name, email: user2.email }, organisationId: org2.id }
  )

  await repo1.create({ name: 'Org1 Cat' })
  await repo2.create({ name: 'Org2 Cat' })

  const org1Cats = await repo1.getAll()
  const org2Cats = await repo2.getAll()

  expect(org1Cats).toHaveLength(1)
  expect(org2Cats).toHaveLength(1)
  expect(org1Cats[0].name).toBe('Org1 Cat')
  expect(org2Cats[0].name).toBe('Org2 Cat')
})
```

---

## Rules

1. **Never mock** the factory runtime classes — use real instances with injected db and session.
2. **Session from real seed data** — createUser + createOrg (or Better Auth testUtils) so constraints and relations work.
3. **Transact uses test db** — the db from dbTest is transaction-scoped; reuse it for factory DI.
4. **Transaction rollback** — dbTest rolls back after each test; no manual cleanup for factory-created data.
