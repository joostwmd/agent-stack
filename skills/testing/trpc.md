# tRPC Procedure Testing — createCallerFactory + Better Auth

## Pattern Overview

tRPC v11 uses `createCallerFactory` for server-side calls. Tests inject a
PGlite `DbClient` into the context — no module mocking needed.

```
createCallerFactory(appRouter)
    ↓
createTestCaller(db, options?)  ← injects PGlite db + optional auth session
    ↓
caller.feature.procedure(input) ← calls procedure directly, no HTTP
```

## createTestCaller Helper

```ts
// tests/_utils/trpc.ts
import { createCallerFactory } from '@trpc/server'
import { appRouter } from '@server/router'
import { DbClient } from '@server/lib/db/client'

const createCaller = createCallerFactory(appRouter)

interface TestCallerOptions {
  db: DbClient
  userId?: string   // if provided, creates a real auth session
}

export async function createTestCaller({ db, userId }: TestCallerOptions) {
  let session = null

  if (userId) {
    const ctx = await auth.$context
    const headers = await ctx.test.getAuthHeaders({ userId })
    session = await auth.api.getSession({ headers })
  }

  return createCaller({
    db,
    session,
    headers: new Headers(),
  })
}
```

## Basic Procedure Test

```ts
// tests/api/features/users/user.test.ts
import { dbTest } from '@tests/_fixtures/db'
import { createTestCaller } from '@tests/_utils/trpc'

dbTest('user.list returns all users', async ({ db }) => {
  // Seed
  await db.insert(users).values({ name: 'Alice', email: 'alice@example.com' })

  const caller = await createTestCaller({ db })
  const result = await caller.user.list()

  expect(result).toHaveLength(1)
  expect(result[0].name).toBe('Alice')
})
```

## Auth-Gated Procedure Test

```ts
dbTest('user.getProfile requires authentication', async ({ db }) => {
  const caller = await createTestCaller({ db })  // no userId → no session

  await expect(caller.user.getProfile()).rejects.toThrow('UNAUTHORIZED')
})

dbTest('user.getProfile returns own profile', async ({ db, createUser }) => {
  const { user } = await createUser()

  const caller = await createTestCaller({ db, userId: user.id })
  const profile = await caller.user.getProfile()

  expect(profile.id).toBe(user.id)
  expect(profile.email).toBe(user.email)
})
```

## Mutation Procedure — Three Paths

### Happy Path

```ts
dbTest('user.create inserts and returns user', async ({ db }) => {
  const caller = await createTestCaller({ db, userId: adminUser.id })
  const result = await caller.user.create({
    name: 'Bob',
    email: 'bob@example.com',
  })
  expect(result.name).toBe('Bob')

  // Assert DB state
  const rows = await db.select().from(users).where(eq(users.email, 'bob@example.com'))
  expect(rows).toHaveLength(1)
})
```

### Error Path

```ts
dbTest('user.create rejects duplicate email', async ({ db, createUser }) => {
  await createUser({ email: 'alice@example.com' })
  const caller = await createTestCaller({ db })

  await expect(
    caller.user.create({ name: 'Alice 2', email: 'alice@example.com' })
  ).rejects.toMatchObject({ code: 'CONFLICT' })
})
```

### Transaction Rollback (procedure wraps multiple operations)

```ts
dbTest('user.createWithProfile rolls back on profile failure', async ({ db }) => {
  // Force second insert to fail via a spy
  vi.spyOn(db, 'insert')
    .mockImplementationOnce(db.insert.bind(db))  // first call succeeds
    .mockRejectedValueOnce(new Error('forced'))  // second call fails

  await expect(
    caller.user.createWithProfile({ name: 'Bob', bio: '...' })
  ).rejects.toThrow()

  // Neither record should exist
  const rows = await db.select().from(users)
  expect(rows).toHaveLength(0)
})
```

## Role / Permission Tests

```ts
dbTest('user.delete requires admin role', async ({ db, createUser }) => {
  const { user: regularUser } = await createUser({ role: 'user' })
  const { user: targetUser } = await createUser()

  const caller = await createTestCaller({ db, userId: regularUser.id })

  await expect(
    caller.user.delete({ id: targetUser.id })
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})
```
