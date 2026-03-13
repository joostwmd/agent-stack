# DB Query Testing — PGlite + dbTest Fixture

## The dbTest Fixture

Defined once, used in every DB test. Provides:
- A PGlite `db` instance with real migrations applied
- Automatic transaction rollback after each test — no cleanup needed
- `createUser`, `createOrg` seed helpers

```ts
// tests/_fixtures/db.ts
import { test as baseTest } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@server/db/schema'
import { DbClient } from '@server/lib/db/client'

// One PGlite instance per file — migrations run once
const pglite = new PGlite()
const rawDb = drizzle(pglite, { schema })
await migrate(rawDb, { migrationsFolder: './drizzle' })

type Fixtures = {
  db: DbClient
  createUser: (overrides?: Partial<typeof users.$inferInsert>) => Promise<typeof users.$inferSelect>
}

export const dbTest = baseTest.extend<Fixtures>({
  db: async ({}, use) => {
    // Wrap each test in a transaction, roll back after
    await rawDb.transaction(async (tx) => {
      const db = new DbClient(tx as any)
      await use(db)
      // Throw to force rollback — transaction never commits
      throw new RollbackSignal()
    }).catch((e) => {
      if (!(e instanceof RollbackSignal)) throw e
    })
  },

  createUser: async ({ db }, use) => {
    await use(async (overrides = {}) => {
      const [user] = await db.insert(users).values({
        id: crypto.randomUUID(),
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        ...overrides,
      }).returning()
      return user!
    })
  },
})

class RollbackSignal extends Error {}
```

## Basic Query Test

```ts
// tests/api/db/queries/users.test.ts
import { dbTest } from '@tests/_fixtures/db'
import { getUserWithPostsAndComments } from '@server/db/queries/users'
import { eq } from 'drizzle-orm'

dbTest('getUserWithPostsAndComments — returns nested relations', async ({ db, createUser }) => {
  const user = await createUser({ name: 'Alice' })

  const [post] = await db.insert(posts).values({
    title: 'Hello World',
    authorId: user.id,
  }).returning()

  await db.insert(comments).values({
    body: 'Great post',
    postId: post!.id,
    authorId: user.id,
  })

  const result = await getUserWithPostsAndComments(db, user.id)

  expect(result).not.toBeNull()
  expect(result!.posts).toHaveLength(1)
  expect(result!.posts[0]!.comments).toHaveLength(1)
  expect(result!.posts[0]!.comments[0]!.body).toBe('Great post')
})

dbTest('getUserWithPostsAndComments — returns null for unknown id', async ({ db }) => {
  const result = await getUserWithPostsAndComments(db, 'nonexistent-id')
  expect(result).toBeNull()
})
```

## Transaction Rollback Test

```ts
dbTest('createUserWithPost rolls back if post insert fails', async ({ db }) => {
  vi.spyOn(db, 'insert')
    .mockImplementationOnce(db.insert.bind(db))    // user insert succeeds
    .mockRejectedValueOnce(new Error('DB error'))  // post insert fails

  await expect(
    createUserWithPost(db, { name: 'Bob' }, { title: 'My Post' })
  ).rejects.toThrow('DB error')

  const allUsers = await db.select().from(users)
  expect(allUsers).toHaveLength(0)  // user must not exist
})
```

## Constraint Tests

```ts
dbTest('enforces unique email', async ({ db, createUser }) => {
  await createUser({ email: 'alice@example.com' })

  await expect(
    db.insert(users).values({ email: 'alice@example.com', name: 'Alice 2' })
  ).rejects.toThrow()
})

dbTest('cascades delete to posts', async ({ db, createUser }) => {
  const user = await createUser()
  await db.insert(posts).values({ title: 'Post', authorId: user.id })

  await db.delete(users).where(eq(users.id, user.id))

  const remainingPosts = await db.select().from(posts)
  expect(remainingPosts).toHaveLength(0)
})
```

## Important Notes

- The `dbTest` fixture wraps each test in a transaction and rolls it back.
  Data inserted in one test is **never visible** to the next test.
- Pass `db` explicitly to query functions — do not use module-level singletons.
- PGlite runs real PostgreSQL SQL — constraints, cascades, and indexes are real.
